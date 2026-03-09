import json
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from services.groq_service import get_groq_client
from services.firebase_service import get_db

router = APIRouter(tags=["price-optimizer"])


class PriceOptimizeRequest(BaseModel):
    product_id: str
    business_type: Optional[str] = None


@router.post("/optimize-price")
async def optimize_price(req: PriceOptimizeRequest, user_id: str = Query(...)):
    """AI suggests optimal pricing based on product type, market trends, and margins."""
    db = get_db()

    prod_ref = db.collection("users").document(user_id).collection("products").document(req.product_id)
    prod_snap = prod_ref.get()
    if not prod_snap.exists:
        return {"error": "Product not found"}

    product = prod_snap.to_dict()

    # Get sales history for this product
    sales = []
    for d in (
        db.collection("users").document(user_id).collection("transactions")
        .where("productId", "==", req.product_id)
        .limit(50)
        .stream()
    ):
        t = d.to_dict()
        sales.append({"qty": t.get("quantity", 0), "price": t.get("pricePerUnit", 0)})

    total_sold = sum(s["qty"] for s in sales)
    context = f" The user runs a {req.business_type} shop." if req.business_type else ""

    prompt = f"""You are a pricing expert for Indian small businesses.{context}

Product: {product.get('name', 'Unknown')}
Category: {product.get('category', 'General')}
Current Price: ₹{product.get('price', 0)}
Current Stock: {product.get('quantity', 0)} units
Total Sold: {total_sold} units

Analyze and suggest pricing strategy. Return ONLY a JSON object with:
- "suggested_price": optimal price in INR (number)
- "min_price": minimum viable price for clearance/bargaining (number)
- "max_price": premium price if demand is high (number)
- "strategy": one of "keep", "increase", "decrease", "clearance"
- "reason": 1-2 sentence explanation
- "tip": one actionable pricing tip for this product

Return ONLY JSON, no markdown."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=256,
        )
        reply = completion.choices[0].message.content.strip()
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]
        data = json.loads(reply)
        return data
    except Exception as e:
        print(f"Price optimizer error: {e}")
        current = product.get("price", 0)
        return {
            "suggested_price": current,
            "min_price": round(current * 0.85, 2),
            "max_price": round(current * 1.15, 2),
            "strategy": "keep",
            "reason": "Unable to analyze. Keeping current price.",
            "tip": "Monitor competitor prices regularly.",
        }
