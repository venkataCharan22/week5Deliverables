import base64
import json
import io
from fastapi import APIRouter
from models.schemas import ImageRecognizeRequest, ImageRecognizeResponse
from services.groq_service import get_groq_client
from PIL import Image
import pytesseract

router = APIRouter(tags=["image"])


@router.post("/image-recognize", response_model=ImageRecognizeResponse)
async def recognize_product_image(request: ImageRecognizeRequest):
    """Extract product info from an image using OCR + AI."""
    image_b64 = request.image_base64
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes))

        # OCR to extract any text from the product image
        ocr_text = pytesseract.image_to_string(image, lang="eng").strip()
    except Exception:
        ocr_text = ""

    business_context = ""
    if request.business_type:
        business_context = f" The user runs a {request.business_type} shop in India."

    prompt = f"""Identify this product from a shop inventory image.{business_context}

Text found on the product/label (via OCR): "{ocr_text if ocr_text else 'no text detected'}"

Based on the OCR text (brand names, product names, weight/size info), determine:
- "name": the product name (include brand and size/weight if visible)
- "category": product category
- "price": estimated retail price in INR (0 if unknown)

Return ONLY a JSON object with these 3 keys. No markdown, no explanation."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=256,
        )
        reply = completion.choices[0].message.content.strip()
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]

        data = json.loads(reply)
        return ImageRecognizeResponse(
            name=data.get("name", "Unknown Product"),
            category=data.get("category"),
            price=float(data.get("price", 0)),
        )
    except Exception as e:
        print(f"Image recognize error: {e}")
        # If OCR found text, use it as the name
        if ocr_text:
            first_line = ocr_text.split("\n")[0].strip()[:50]
            return ImageRecognizeResponse(name=first_line)
        return ImageRecognizeResponse(name="")
