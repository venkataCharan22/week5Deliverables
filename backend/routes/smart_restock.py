import json
from fastapi import APIRouter, Query
from services.groq_service import get_groq_client
from services.firebase_service import get_db

router = APIRouter(tags=["smart-restock"])


@router.get("/smart-restock")
async def smart_restock(user_id: str = Query(...)):
    """AI analyzes sales velocity and current stock to recommend what to restock and how much."""
    db = get_db()

    # Fetch products
    products = []
    for d in db.collection("users").document(user_id).collection("products").stream():
        p = d.to_dict()
        p["id"] = d.id
        products.append(p)

    if not products:
        return {"recommendations": []}

    # Fetch recent sales (last 30 days worth)
    txs = []
    for d in (
        db.collection("users").document(user_id).collection("transactions")
        .order_by("createdAt", direction="DESCENDING")
        .limit(200)
        .stream()
    ):
        t = d.to_dict()
        txs.append({"productName": t.get("productName", ""), "quantity": t.get("quantity", 0)})

    # Build context
    inventory_summary = []
    for p in products:
        inventory_summary.append(
            f"- {p.get('name')}: qty={p.get('quantity', 0)}, price=₹{p.get('price', 0)}, threshold={p.get('threshold', 5)}"
        )

    sales_summary = []
    for t in txs[:50]:
        sales_summary.append(f"- Sold {t['quantity']}x {t['productName']}")

    prompt = f"""You are an inventory management AI for an Indian shopkeeper.

Current Inventory:
{chr(10).join(inventory_summary[:40])}

Recent Sales:
{chr(10).join(sales_summary) if sales_summary else "No recent sales data."}

Based on the sales velocity and current stock levels, recommend the top 5 products to restock.
For each product, suggest HOW MANY units to order.

Return ONLY a JSON array of objects with:
- "name": product name (must match inventory exactly)
- "current_stock": current quantity
- "suggested_restock": number of units to order
- "urgency": "critical" (out of stock or below threshold), "high" (will run out soon), "medium" (running low)
- "reason": one short sentence explaining why (e.g. "Selling 5/day, will run out in 2 days")

Return ONLY the JSON array, no markdown, no explanation."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=512,
        )
        reply = completion.choices[0].message.content.strip()
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]
        recommendations = json.loads(reply)
        return {"recommendations": recommendations}
    except Exception as e:
        print(f"Smart restock error: {e}")
        # Fallback: return low-stock items
        low = [p for p in products if p.get("quantity", 0) <= p.get("threshold", 5)]
        fallback = [
            {
                "name": p["name"],
                "current_stock": p.get("quantity", 0),
                "suggested_restock": max(10, p.get("threshold", 5) * 2),
                "urgency": "critical" if p.get("quantity", 0) == 0 else "high",
                "reason": "Below restock threshold",
            }
            for p in low[:5]
        ]
        return {"recommendations": fallback}
