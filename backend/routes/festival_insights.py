from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from services.groq_service import get_groq_client
import json

router = APIRouter(tags=["festival-insights"])


class FestivalInsightsRequest(BaseModel):
    business_type: str
    top_categories: list[str] = []
    product_count: int = 0


class FestivalNotification(BaseModel):
    title: str
    message: str
    icon: str
    urgency: str  # "high", "medium", "low"
    festival_name: Optional[str] = None
    days_away: Optional[int] = None


class FestivalInsightsResponse(BaseModel):
    notifications: list[FestivalNotification]


@router.post("/festival-insights", response_model=FestivalInsightsResponse)
async def get_festival_insights(req: FestivalInsightsRequest, user_id: str = Query(...)):
    client = get_groq_client()
    today = datetime.now()
    date_str = today.strftime("%B %d, %Y")
    month = today.strftime("%B")

    prompt = f"""You are a smart Indian business advisor AI. Today is {date_str}.

Business type: {req.business_type}
Product categories: {', '.join(req.top_categories) if req.top_categories else 'General'}
Total products: {req.product_count}

Generate 3-5 smart, timely business notifications based on:
1. Upcoming Indian festivals & events in the next 30 days (Diwali, Holi, Eid, Christmas, Pongal, Navratri, Durga Puja, Raksha Bandhan, Ganesh Chaturthi, etc.)
2. Seasonal trends for {month} in India
3. Wedding/marriage season if applicable
4. School/college reopening seasons
5. Weather-based buying patterns

For each notification include:
- title: short catchy headline (max 8 words)
- message: actionable business advice (1-2 sentences)
- icon: single emoji that represents the notification
- urgency: "high" if within 7 days, "medium" if 7-20 days, "low" if 20+ days
- festival_name: name of festival/event if applicable, null otherwise
- days_away: approximate days until the event, null if not event-based

Return ONLY valid JSON: {{"notifications": [...]}}"""

    try:
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000,
        )
        raw = resp.choices[0].message.content.strip()
        # Extract JSON from response
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        data = json.loads(raw)
        return FestivalInsightsResponse(notifications=data.get("notifications", []))
    except Exception as e:
        print(f"Festival insights error: {e}")
        return FestivalInsightsResponse(notifications=[
            FestivalNotification(
                title="Stay prepared!",
                message="Keep your inventory stocked for upcoming seasonal demand.",
                icon="📦",
                urgency="low",
                festival_name=None,
                days_away=None,
            )
        ])
