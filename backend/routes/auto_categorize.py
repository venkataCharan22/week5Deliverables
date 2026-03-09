import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.groq_service import get_groq_client

router = APIRouter(tags=["auto-categorize"])


class AutoCategorizeRequest(BaseModel):
    product_name: str
    business_type: Optional[str] = None


@router.post("/auto-categorize")
async def auto_categorize(req: AutoCategorizeRequest):
    """AI automatically suggests category, price range, and threshold for a product name."""
    context = f" The shop is a {req.business_type} business in India." if req.business_type else " The shop is in India."

    prompt = f"""You are an Indian retail product categorization expert.{context}

Product name: "{req.product_name}"

Based on the product name, return a JSON object with:
- "category": the most appropriate product category (string)
- "suggested_price": estimated retail price in INR (number)
- "suggested_threshold": low stock alert threshold (number, typically 3-20 depending on how fast it sells)
- "tags": array of 2-3 relevant tags for search (strings)

Return ONLY the JSON object, no markdown, no explanation."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=128,
        )
        reply = completion.choices[0].message.content.strip()
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]
        return json.loads(reply)
    except Exception:
        return {
            "category": None,
            "suggested_price": 0,
            "suggested_threshold": 5,
            "tags": [],
        }
