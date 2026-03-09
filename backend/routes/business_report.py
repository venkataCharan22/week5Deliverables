import json
from fastapi import APIRouter, Query
from services.groq_service import get_groq_client
from services.firebase_service import get_db

router = APIRouter(tags=["business-report"])


@router.get("/business-report")
async def generate_business_report(user_id: str = Query(...)):
    """AI generates a natural language weekly business report."""
    db = get_db()

    # Fetch products
    products = []
    for d in db.collection("users").document(user_id).collection("products").stream():
        p = d.to_dict()
        products.append(p)

    # Fetch recent transactions
    txs = []
    for d in (
        db.collection("users").document(user_id).collection("transactions")
        .order_by("createdAt", direction="DESCENDING")
        .limit(100)
        .stream()
    ):
        t = d.to_dict()
        txs.append(t)

    # Fetch active rentals
    rentals = []
    for d in (
        db.collection("users").document(user_id).collection("rentals")
        .where("status", "==", "active")
        .stream()
    ):
        r = d.to_dict()
        rentals.append(r)

    # Build stats
    total_products = len(products)
    total_stock = sum(p.get("quantity", 0) for p in products)
    stock_value = sum(p.get("price", 0) * p.get("quantity", 0) for p in products)
    low_stock = [p for p in products if p.get("quantity", 0) <= p.get("threshold", 5)]
    total_sales = len(txs)
    total_revenue = sum(t.get("totalAmount", 0) for t in txs)
    active_rentals = len(rentals)

    # Top selling products
    sales_by_product = {}
    for t in txs:
        name = t.get("productName", "Unknown")
        sales_by_product[name] = sales_by_product.get(name, 0) + t.get("quantity", 0)
    top_sellers = sorted(sales_by_product.items(), key=lambda x: x[1], reverse=True)[:5]

    # Category breakdown
    category_revenue = {}
    for t in txs:
        cat = t.get("category", "Other")
        category_revenue[cat] = category_revenue.get(cat, 0) + t.get("totalAmount", 0)

    prompt = f"""You are a business analyst AI for an Indian shopkeeper. Generate a clear, actionable weekly business report.

Business Data:
- Total Products: {total_products}
- Total Stock Units: {total_stock}
- Stock Value: ₹{stock_value:,.0f}
- Low Stock Items: {len(low_stock)} ({', '.join(p.get('name', '') for p in low_stock[:5])})
- Total Sales Transactions: {total_sales}
- Total Revenue: ₹{total_revenue:,.0f}
- Active Rentals: {active_rentals}
- Top Sellers: {', '.join(f'{name} ({qty} sold)' for name, qty in top_sellers)}
- Revenue by Category: {json.dumps(category_revenue)}

Generate a business report as a JSON object with:
- "summary": 2-3 sentence overview of business health
- "highlights": array of 3 positive highlights (strings)
- "concerns": array of up to 3 concerns/warnings (strings)
- "actions": array of 3-4 specific action items the shopkeeper should take this week (strings)
- "score": business health score from 1-100
- "score_label": "Excellent" / "Good" / "Needs Attention" / "Critical"

Return ONLY JSON, no markdown."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=768,
        )
        reply = completion.choices[0].message.content.strip()
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]
        report = json.loads(reply)
        report["stats"] = {
            "total_products": total_products,
            "stock_value": stock_value,
            "total_revenue": total_revenue,
            "total_sales": total_sales,
            "active_rentals": active_rentals,
            "low_stock_count": len(low_stock),
        }
        return report
    except Exception as e:
        print(f"Business report error: {e}")
        return {
            "summary": "Unable to generate AI report. Check your data and try again.",
            "highlights": [],
            "concerns": ["Report generation failed"],
            "actions": ["Ensure sales data is being recorded", "Check backend connection"],
            "score": 0,
            "score_label": "Unknown",
            "stats": {
                "total_products": total_products,
                "stock_value": stock_value,
                "total_revenue": total_revenue,
                "total_sales": total_sales,
                "active_rentals": active_rentals,
                "low_stock_count": len(low_stock),
            },
        }
