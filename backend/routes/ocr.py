import base64
import json
import io
from fastapi import APIRouter, UploadFile, File
from models.schemas import OCRResponse
from services.groq_service import get_groq_client
from PIL import Image
import pytesseract

router = APIRouter(tags=["ocr"])


def extract_text_from_bytes(image_bytes: bytes) -> str:
    """Run Tesseract OCR on raw image bytes."""
    image = Image.open(io.BytesIO(image_bytes))
    text = pytesseract.image_to_string(image, lang="eng")
    return text.strip()


def parse_items_with_llm(raw_text: str) -> list[dict]:
    """Send raw OCR text to Groq/Llama to extract structured product items."""
    if not raw_text:
        return []

    prompt = f"""Extract product items from this bill/invoice text. Return ONLY a JSON array.
Each item should have: "name" (string), "quantity" (integer, default 1), "price" (number).
If you cannot determine a field, use reasonable defaults. Ignore totals, taxes, headers.

Bill text:
{raw_text}

Return ONLY the JSON array, no markdown, no explanation."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=1024,
        )
        reply = completion.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]
        items = json.loads(reply)
        return items if isinstance(items, list) else []
    except Exception:
        return []


@router.post("/ocr", response_model=OCRResponse)
async def extract_from_image(file: UploadFile = File(...)):
    """Accept an uploaded image, OCR it with Tesseract, parse items with Groq."""
    image_bytes = await file.read()

    # Step 1: Tesseract OCR
    raw_text = extract_text_from_bytes(image_bytes)

    # Step 2: LLM parsing
    extracted_items = parse_items_with_llm(raw_text)

    return OCRResponse(extracted_items=extracted_items, raw_text=raw_text)


@router.post("/ocr/base64", response_model=OCRResponse)
async def extract_from_base64(request: dict):
    """Accept a base64-encoded image, OCR it with Tesseract, parse items with Groq."""
    image_b64 = request.get("image_base64", "")
    # Strip data URL prefix if present
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_b64)

    raw_text = extract_text_from_bytes(image_bytes)
    extracted_items = parse_items_with_llm(raw_text)

    return OCRResponse(extracted_items=extracted_items, raw_text=raw_text)
