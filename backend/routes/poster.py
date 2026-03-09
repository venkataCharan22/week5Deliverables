from fastapi import APIRouter
from models.schemas import PosterRequest, PosterResponse
from services.groq_service import get_groq_client

router = APIRouter(tags=["poster"])


@router.post("/poster", response_model=PosterResponse)
async def generate_poster(request: PosterRequest):
    """Accept an offer description and return AI-generated poster text."""
    prompt = f"""Create a catchy promotional poster text for a small Indian shop.
Offer/promotion: {request.description}

Requirements:
- Use emojis for visual appeal
- Include a bold headline
- List 2-3 key benefits with checkmarks
- Add a call-to-action
- Include store hours placeholder
- Add 2-3 relevant hashtags
- Keep it short and punchy, suitable for WhatsApp/Instagram sharing"""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=512,
        )
        poster_text = completion.choices[0].message.content.strip()
    except Exception as e:
        poster_text = (
            f"🔥 SPECIAL OFFER! 🔥\n\n"
            f"{request.description}\n\n"
            f"✅ Limited Time Only\n"
            f"✅ Best Prices Guaranteed\n\n"
            f"📍 Visit us today!\n"
            f"#ShopLocal #BestDeals"
        )

    return PosterResponse(poster_text=poster_text)
