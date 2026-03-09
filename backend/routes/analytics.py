from fastapi import APIRouter, Query
from models.schemas import SalesSummary
from services.firebase_service import get_db
from collections import Counter

router = APIRouter(tags=["analytics"])


@router.get("/analytics", response_model=SalesSummary)
async def get_analytics(user_id: str = Query(...)):
    """Return sales summary computed from user's product data."""
    db = get_db()
    user_ref = db.collection("users").document(user_id)

    products = [doc.to_dict() for doc in user_ref.collection("products").stream()]
    sales = [doc.to_dict() for doc in user_ref.collection("sales").stream()]

    total_revenue = sum(s.get("total_price", 0) for s in sales)
    total_orders = len(sales)

    cat_counts = Counter()
    for p in products:
        cat_counts[p.get("category", "Other")] += 1
    total = sum(cat_counts.values()) or 1
    category_breakdown = [
        {"name": cat, "value": round(count / total * 100)}
        for cat, count in cat_counts.most_common()
    ]

    daily_sales = [
        {"name": day, "sales": 0}
        for day in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    ]

    return SalesSummary(
        daily_sales=daily_sales,
        category_breakdown=category_breakdown,
        total_revenue=total_revenue,
        total_orders=total_orders,
    )
