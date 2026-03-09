import json
from fastapi import APIRouter
from models.schemas import DailyInsightRequest, DailyInsightResponse
from services.groq_service import get_groq_client

router = APIRouter(tags=["insights"])


@router.post("/daily-insight", response_model=DailyInsightResponse)
async def daily_insight(request: DailyInsightRequest):
    """Generate a daily AI insight based on inventory state."""
    categories_str = ", ".join(request.top_categories[:5]) if request.top_categories else "various"

    prompt = f"""You are a business advisor for an Indian {request.business_type} shop.
They have {request.product_count} products across categories: {categories_str}.
{request.low_stock_count} items are low in stock.

Give ONE short business insight (1 sentence) and ONE actionable tip (1 sentence).
Return ONLY a JSON object: {{"insight": "...", "tip": "..."}}"""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=128,
        )
        reply = completion.choices[0].message.content.strip()
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]
        data = json.loads(reply)
        return DailyInsightResponse(
            insight=data.get("insight", "Your shop is doing well!"),
            tip=data.get("tip", "Keep your inventory updated."),
        )
    except Exception as e:
        print(f"Daily insight error: {e}")
        return DailyInsightResponse(
            insight="Keep tracking your inventory for best results!",
            tip="Check low-stock items and reorder before they run out.",
        )
