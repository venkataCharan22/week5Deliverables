from fastapi import APIRouter
from models.schemas import ChatMessage, ChatResponse
from services.groq_service import get_groq_client

router = APIRouter(tags=["chat"])

SYSTEM_PROMPT = """You are BizBuddy AI, a smart business assistant for small Indian shopkeepers.
You help with inventory management, sales analysis, pricing strategies, and general business advice.
Keep responses concise (2-4 sentences), practical, and friendly.
Use ₹ for currency. If inventory context is provided, reference it in your answer."""


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(message: ChatMessage):
    """Accept a user message + optional inventory context, return Groq/Llama response."""
    system = SYSTEM_PROMPT
    if message.business_type:
        system += f"\nThe user runs a {message.business_type} shop in India. Tailor your advice accordingly."

    messages = [{"role": "system", "content": system}]

    if message.inventory_context:
        messages.append({
            "role": "system",
            "content": f"Current inventory data:\n{message.inventory_context}",
        })

    messages.append({"role": "user", "content": message.message})

    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=512,
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        reply = f"Sorry, I couldn't process that right now. Please try again. ({str(e)[:80]})"

    return ChatResponse(response=reply)
