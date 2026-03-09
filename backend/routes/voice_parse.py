import json
from fastapi import APIRouter
from models.schemas import VoiceParseRequest, VoiceParseResponse
from services.groq_service import get_groq_client

router = APIRouter(tags=["voice"])


@router.post("/voice-parse", response_model=VoiceParseResponse)
async def parse_voice_input(request: VoiceParseRequest):
    """Parse a spoken transcript into structured product data."""
    context = ""
    if request.business_type:
        context = f" The user runs a {request.business_type} shop in India."

    prompt = f"""Extract product information from this spoken input by an Indian shopkeeper.{context}

Spoken input: "{request.transcript}"

Return ONLY a JSON object with:
- "name": product name (string)
- "category": product category or null
- "quantity": number of items (integer, default 1)
- "price": price per unit in INR (number, default 0)

If the user mentions a total price and quantity, calculate the per-unit price.
Return ONLY the JSON object, no markdown, no explanation."""

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
        return VoiceParseResponse(
            name=data.get("name", request.transcript),
            category=data.get("category"),
            quantity=int(data.get("quantity", 1)),
            price=float(data.get("price", 0)),
        )
    except Exception:
        return VoiceParseResponse(name=request.transcript)
