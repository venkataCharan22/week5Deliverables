"""Reusable tool functions for the BizBuddy AI agent.

Each function takes user_id and returns a JSON-serialisable dict.
These are called by the agent loop when Groq emits tool_calls.
"""

import json
from datetime import datetime
from collections import Counter
from services.firebase_service import get_db
from services.groq_service import get_groq_client


# ── Tool 1: get_inventory ──────────────────────────────────────────

async def get_inventory(user_id: str) -> dict:
    db = get_db()
    docs = (
        db.collection("users").document(user_id)
        .collection("products")
        .order_by("createdAt", direction="DESCENDING")
        .stream()
    )
    products = []
    for doc in docs:
        data = doc.to_dict()
        products.append({
            "id": doc.id,
            "name": data.get("name", ""),
            "category": data.get("category", ""),
            "quantity": data.get("quantity", 0),
            "price": data.get("price", 0),
            "threshold": data.get("threshold", 5),
        })
    return {"products": products, "total_count": len(products)}


# ── Tool 2: get_low_stock_items ────────────────────────────────────

async def get_low_stock_items(user_id: str) -> dict:
    db = get_db()
    docs = db.collection("users").document(user_id).collection("products").stream()
    low_stock = []
    for doc in docs:
        p = doc.to_dict()
        if p.get("quantity", 0) <= p.get("threshold", 5):
            low_stock.append({
                "id": doc.id,
                "name": p.get("name", ""),
                "category": p.get("category", ""),
                "quantity": p.get("quantity", 0),
                "threshold": p.get("threshold", 5),
                "price": p.get("price", 0),
            })
    return {"low_stock_items": low_stock, "count": len(low_stock)}


# ── Tool 3: get_sales_analytics ────────────────────────────────────

async def get_sales_analytics(user_id: str) -> dict:
    db = get_db()
    user_ref = db.collection("users").document(user_id)

    products = [doc.to_dict() for doc in user_ref.collection("products").stream()]

    txs = []
    for d in (
        user_ref.collection("transactions")
        .order_by("createdAt", direction="DESCENDING")
        .limit(200)
        .stream()
    ):
        txs.append(d.to_dict())

    total_revenue = sum(t.get("totalAmount", 0) for t in txs)
    total_orders = len(txs)

    cat_counts = Counter(p.get("category", "Other") for p in products)

    sales_by_product = {}
    for t in txs:
        name = t.get("productName", "Unknown")
        sales_by_product[name] = sales_by_product.get(name, 0) + t.get("quantity", 0)
    top_sellers = sorted(sales_by_product.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_products": len(products),
        "category_breakdown": dict(cat_counts),
        "top_sellers": [{"name": n, "quantity_sold": q} for n, q in top_sellers],
    }


# ── Tool 4: get_recent_transactions ───────────────────────────────

async def get_recent_transactions(user_id: str, limit: int = 10) -> dict:
    db = get_db()
    docs = (
        db.collection("users").document(user_id)
        .collection("transactions")
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    txs = []
    for d in docs:
        data = d.to_dict()
        created = data.get("createdAt")
        txs.append({
            "id": d.id,
            "productName": data.get("productName", ""),
            "category": data.get("category", ""),
            "quantity": data.get("quantity", 0),
            "pricePerUnit": data.get("pricePerUnit", 0),
            "totalAmount": data.get("totalAmount", 0),
            "createdAt": created.isoformat() if hasattr(created, "isoformat") else str(created) if created else None,
        })
    return {"transactions": txs, "count": len(txs)}


# ── Tool 5: get_demand_forecast ────────────────────────────────────

async def get_demand_forecast(user_id: str, business_type: str = None) -> dict:
    db = get_db()

    products = []
    for d in db.collection("users").document(user_id).collection("products").stream():
        p = d.to_dict()
        products.append(p)

    txs = []
    for d in (
        db.collection("users").document(user_id)
        .collection("transactions")
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

Recent sales data (product -> total qty sold):
{chr(10).join(f'- {name}: {d["qty"]} units, Rs.{d["revenue"]:,.0f} revenue ({d["category"]})' for name, d in top_sales) if top_sales else 'No sales data yet.'}

Predict demand for next 7 days. Return ONLY a JSON object with:
- "trending_up": array of 3-4 objects with "name", "reason" (short), "confidence" (high/medium/low)
- "trending_down": array of 1-2 objects with "name", "reason" (short)
- "opportunity": one sentence about a market opportunity
- "weekly_tip": one actionable tip

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
    except Exception:
        return {
            "trending_up": [],
            "trending_down": [],
            "opportunity": "Keep tracking your sales to get AI-powered demand predictions.",
            "weekly_tip": "Ensure all sales are recorded for better forecasting.",
        }


# ── Tool 6: get_restock_recommendations ───────────────────────────

async def get_restock_recommendations(user_id: str) -> dict:
    db = get_db()

    products = []
    for d in db.collection("users").document(user_id).collection("products").stream():
        p = d.to_dict()
        p["id"] = d.id
        products.append(p)

    if not products:
        return {"recommendations": []}

    txs = []
    for d in (
        db.collection("users").document(user_id)
        .collection("transactions")
        .order_by("createdAt", direction="DESCENDING")
        .limit(200)
        .stream()
    ):
        t = d.to_dict()
        txs.append({"productName": t.get("productName", ""), "quantity": t.get("quantity", 0)})

    inventory_summary = [
        f"- {p.get('name')}: qty={p.get('quantity', 0)}, price=Rs.{p.get('price', 0)}, threshold={p.get('threshold', 5)}"
        for p in products[:40]
    ]
    sales_summary = [f"- Sold {t['quantity']}x {t['productName']}" for t in txs[:50]]

    prompt = f"""You are an inventory management AI for an Indian shopkeeper.

Current Inventory:
{chr(10).join(inventory_summary)}

Recent Sales:
{chr(10).join(sales_summary) if sales_summary else "No recent sales data."}

Recommend the top 5 products to restock with HOW MANY units to order.
Return ONLY a JSON array of objects with:
- "name", "current_stock", "suggested_restock", "urgency" (critical/high/medium), "reason" (one sentence)

Return ONLY the JSON array, no markdown."""

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
        return {"recommendations": json.loads(reply)}
    except Exception as e:
        low = [p for p in products if p.get("quantity", 0) <= p.get("threshold", 5)]
        return {
            "recommendations": [
                {
                    "name": p["name"],
                    "current_stock": p.get("quantity", 0),
                    "suggested_restock": max(10, p.get("threshold", 5) * 2),
                    "urgency": "critical" if p.get("quantity", 0) == 0 else "high",
                    "reason": "Below restock threshold",
                }
                for p in low[:5]
            ]
        }


# ── Tool 7: get_business_report ────────────────────────────────────

async def get_business_report(user_id: str) -> dict:
    db = get_db()

    products = [d.to_dict() for d in db.collection("users").document(user_id).collection("products").stream()]

    txs = []
    for d in (
        db.collection("users").document(user_id)
        .collection("transactions")
        .order_by("createdAt", direction="DESCENDING")
        .limit(100)
        .stream()
    ):
        txs.append(d.to_dict())

    rentals = []
    for d in (
        db.collection("users").document(user_id)
        .collection("rentals")
        .where("status", "==", "active")
        .stream()
    ):
        rentals.append(d.to_dict())

    total_products = len(products)
    stock_value = sum(p.get("price", 0) * p.get("quantity", 0) for p in products)
    low_stock = [p for p in products if p.get("quantity", 0) <= p.get("threshold", 5)]
    total_sales = len(txs)
    total_revenue = sum(t.get("totalAmount", 0) for t in txs)
    active_rentals = len(rentals)

    sales_by_product = {}
    for t in txs:
        name = t.get("productName", "Unknown")
        sales_by_product[name] = sales_by_product.get(name, 0) + t.get("quantity", 0)
    top_sellers = sorted(sales_by_product.items(), key=lambda x: x[1], reverse=True)[:5]

    category_revenue = {}
    for t in txs:
        cat = t.get("category", "Other")
        category_revenue[cat] = category_revenue.get(cat, 0) + t.get("totalAmount", 0)

    prompt = f"""You are a business analyst AI for an Indian shopkeeper. Generate a weekly business report.

Business Data:
- Total Products: {total_products}
- Stock Value: Rs.{stock_value:,.0f}
- Low Stock Items: {len(low_stock)} ({', '.join(p.get('name', '') for p in low_stock[:5])})
- Total Sales: {total_sales}
- Total Revenue: Rs.{total_revenue:,.0f}
- Active Rentals: {active_rentals}
- Top Sellers: {', '.join(f'{name} ({qty} sold)' for name, qty in top_sellers)}
- Revenue by Category: {json.dumps(category_revenue)}

Return a JSON object with:
- "summary": 2-3 sentence overview
- "highlights": array of 3 positive highlights
- "concerns": array of up to 3 concerns
- "actions": array of 3-4 action items
- "score": health score 1-100
- "score_label": "Excellent"/"Good"/"Needs Attention"/"Critical"

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
        return {
            "summary": "Unable to generate AI report right now.",
            "highlights": [],
            "concerns": ["Report generation failed"],
            "actions": ["Ensure sales data is being recorded"],
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


# ── Tool 8: record_sale ───────────────────────────────────────────

async def record_sale(user_id: str, product_name: str, quantity: int) -> dict:
    db = get_db()

    docs = db.collection("users").document(user_id).collection("products").stream()
    product_doc = None
    product_data = None
    for d in docs:
        p = d.to_dict()
        if p.get("name", "").lower() == product_name.lower():
            product_doc = d
            product_data = p
            break

    if not product_doc:
        return {"success": False, "error": f"Product '{product_name}' not found in inventory"}

    if product_data.get("quantity", 0) < quantity:
        return {"success": False, "error": f"Insufficient stock. Only {product_data.get('quantity', 0)} available."}

    new_qty = product_data["quantity"] - quantity
    prod_ref = db.collection("users").document(user_id).collection("products").document(product_doc.id)
    prod_ref.update({"quantity": new_qty, "updatedAt": datetime.now()})

    total = quantity * product_data.get("price", 0)
    tx_data = {
        "type": "sale",
        "productId": product_doc.id,
        "productName": product_data.get("name", ""),
        "category": product_data.get("category", ""),
        "quantity": quantity,
        "pricePerUnit": product_data.get("price", 0),
        "totalAmount": total,
        "customerName": None,
        "createdAt": datetime.now(),
    }
    db.collection("users").document(user_id).collection("transactions").add(tx_data)

    return {
        "success": True,
        "product": product_data.get("name"),
        "quantity_sold": quantity,
        "total_amount": total,
        "remaining_stock": new_qty,
    }
