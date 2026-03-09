import json
from fastapi import APIRouter
from models.schemas import ShopSetupRequest, ShopSetupResponse, SuggestedProduct, BusinessInsight
from services.firebase_service import get_db
from services.groq_service import get_groq_client
from datetime import datetime

router = APIRouter(tags=["setup"])


@router.post("/setup-shop", response_model=ShopSetupResponse)
async def setup_shop(request: ShopSetupRequest):
    """AI-powered shop setup: generates products, insights, tips, and welcome message."""
    shop_name = request.business_name or "their shop"

    prompt = f"""You are setting up an AI-powered shop management system for an Indian shopkeeper.

Business type: {request.business_type}
Business name: {shop_name}

Generate a complete setup package as a JSON object with these exact keys:

1. "suggested_products": Array of 18 products commonly stocked in this type of shop in India.
   Each product: {{"name": "Product Name (with size/unit)", "category": "Category", "typical_price": <price in INR as number>, "emoji": "single emoji"}}

2. "business_insights": Array of 4 insights about running this type of business in India.
   Each: {{"title": "short title (3-5 words)", "description": "1-2 sentence actionable insight", "icon": "relevant emoji"}}

3. "welcome_message": A warm, personalized welcome message (2-3 sentences) for the shopkeeper mentioning their business name and type. Make it encouraging.

4. "tips": Array of 3 actionable business tips specific to running a {request.business_type} shop in India.

5. "ai_greeting": A one-line friendly greeting for the dashboard like "Good to see you! Here's how your shop is doing today."

Return ONLY the JSON object. No markdown, no explanation, no code fences."""

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2048,
        )
        reply = completion.choices[0].message.content.strip()

        # Strip markdown fences if present
        if reply.startswith("```"):
            reply = reply.split("\n", 1)[1]
            reply = reply.rsplit("```", 1)[0]

        data = json.loads(reply)

        products = [
            SuggestedProduct(
                name=p.get("name", "Product"),
                category=p.get("category", "General"),
                typical_price=float(p.get("typical_price", 0)),
                emoji=p.get("emoji", "\U0001F4E6"),
            )
            for p in data.get("suggested_products", [])
            if isinstance(p, dict)
        ]

        insights = [
            BusinessInsight(
                title=i.get("title", "Tip"),
                description=i.get("description", ""),
                icon=i.get("icon", "\U0001F4A1"),
            )
            for i in data.get("business_insights", [])
            if isinstance(i, dict)
        ]

        welcome = data.get("welcome_message", f"Welcome to BizBuddy AI! Let's grow {shop_name} together.")
        tips = data.get("tips", [])
        greeting = data.get("ai_greeting", "Here's how your shop is doing today!")

        # Write suggested products to user's Firestore collection
        db = get_db()
        user_ref = db.collection("users").document(request.user_id)
        products_col = user_ref.collection("products")

        for p in products:
            products_col.add({
                "name": p.name,
                "category": p.category,
                "price": p.typical_price,
                "quantity": 0,
                "threshold": 5,
                "image": p.emoji,
                "createdAt": datetime.now(),
                "updatedAt": datetime.now(),
            })

        # Save AI setup data for dashboard use
        user_ref.collection("settings").document("ai_setup").set({
            "business_insights": [i.model_dump() for i in insights],
            "welcome_message": welcome,
            "tips": tips,
            "ai_greeting": greeting,
            "createdAt": datetime.now(),
        })

        return ShopSetupResponse(
            suggested_products=products,
            business_insights=insights,
            welcome_message=welcome,
            tips=tips,
            ai_greeting=greeting,
        )

    except Exception as e:
        print(f"Setup shop error: {e}")
        # Return a fallback response
        return ShopSetupResponse(
            suggested_products=[],
            business_insights=[],
            welcome_message=f"Welcome to BizBuddy AI! Let's manage {shop_name} together.",
            tips=["Keep your inventory updated daily", "Track low-stock items", "Use AI chat for business advice"],
            ai_greeting="Welcome! Let's grow your business together.",
        )
