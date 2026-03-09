import json
from datetime import datetime
from fastapi import APIRouter, Query
from typing import Optional
from services.groq_service import get_groq_client
from services.firebase_service import get_db

router = APIRouter(tags=["demand-forecast"])


@router.get("/demand-forecast")
async def demand_forecast(user_id: str = Query(...), business_type: Optional[str] = None):
    """AI predicts next week's top selling products and demand trends."""
    db = get_db()

    # Fetch products
    products = []
    for d in db.collection("users").document(user_id).collection("products").stream():
        p = d.to_dict()
        p["id"] = d.id
        products.append(p)

    # Fetch sales
    txs = []
    for d in (
        db.collection("users").document(user_id).collection("transactions")
        .order_by("createdAt", direction="DESCENDING")
        .limit(150)
        .stream()
    ):
        t = d.to_dict()
        txs.append({
            "product": t.get("productName", ""),
            "category": t.get("category", ""),
            "qty": t.get("quantity", 0),
            "amount": t.get("totalAmount", 0),
        })

    # Aggregate sales by product
    sales_agg = {}
    for t in txs:
        name = t["product"]
        if name not in sales_agg:
            sales_agg[name] = {"qty": 0, "revenue": 0, "category": t["category"]}
        sales_agg[name]["qty"] += t["qty"]
        sales_agg[name]["revenue"] += t["amount"]

    top_sales = sorted(sales_agg.items(), key=lambda x: x[1]["qty"], reverse=True)[:10]
    categories = list(set(p.get("category", "") for p in products if p.get("category")))
    now = datetime.now()

    btype = f" Business type: {business_type}." if business_type else ""

    prompt = f"""You are a demand forecasting AI for Indian retail.{btype}
Today is {now.strftime('%A, %B %d, %Y')}. Month: {now.strftime('%B')}.

Product categories in shop: {', '.join(categories[:10]) if categories else 'Various'}

Recent sales data (product → total qty sold):
{chr(10).join(f'- {name}: {d["qty"]} units, ₹{d["revenue"]:,.0f} revenue ({d["category"]})' for name, d in top_sales) if top_sales else 'No sales data yet.'}

Based on:
1. Sales trends from the data above
2. Current season/month in India ({now.strftime('%B')})
3. Upcoming festivals or events
4. Day of week patterns
5. Weather and regional trends

Predict demand for next 7 days. Return ONLY a JSON object with:
- "trending_up": array of 3-4 objects (products likely to sell MORE) each with "name", "reason" (short), "confidence" (high/medium/low)
- "trending_down": array of 1-2 objects (products that may sell LESS) each with "name", "reason" (short)
- "opportunity": one sentence about a market opportunity this week
- "weekly_tip": one actionable tip for the coming week

Return ONLY JSON, no markdown."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=512,
        )
        reply = completion.choices[0].message.content.strip()
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]
        return json.loads(reply)
    except Exception as e:
        print(f"Demand forecast error: {e}")
        return {
            "trending_up": [],
            "trending_down": [],
            "opportunity": "Keep tracking your sales to get AI-powered demand predictions.",
            "weekly_tip": "Ensure all sales are recorded for better forecasting.",
        }
