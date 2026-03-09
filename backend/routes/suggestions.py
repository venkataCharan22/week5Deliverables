import json
from fastapi import APIRouter
from models.schemas import SuggestProductsRequest, SuggestProductsResponse, SuggestedProduct
from services.groq_service import get_groq_client

router = APIRouter(tags=["suggestions"])


@router.post("/suggest-products", response_model=SuggestProductsResponse)
async def suggest_products(request: SuggestProductsRequest):
    """Suggest common products for a business type using AI."""
    prompt = f"""You are a product catalog expert for Indian shops.
For a "{request.business_type}" shop in India, suggest {request.count} common products they would stock.

Return ONLY a JSON array. Each item must have:
- "name": product name (with size/unit if applicable)
- "category": product category
- "typical_price": price in INR (Indian Rupees)
- "emoji": a single relevant emoji

Return ONLY the JSON array, no markdown, no explanation."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
            max_tokens=1024,
        )
        reply = completion.choices[0].message.content.strip()

        # Strip markdown fences
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]

        items = json.loads(reply)
        products = [
            SuggestedProduct(
                name=item.get("name", "Product"),
                category=item.get("category", "General"),
                typical_price=float(item.get("typical_price", 0)),
                emoji=item.get("emoji", "\U0001F4E6"),
            )
            for item in items
            if isinstance(item, dict)
        ]
        return SuggestProductsResponse(products=products[:request.count])
    except Exception as e:
        print(f"Suggestion error: {e}")
        return SuggestProductsResponse(products=[])
