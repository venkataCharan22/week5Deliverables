import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.groq_service import get_groq_client

router = APIRouter(tags=["product-image"])

PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"


class ProductImageRequest(BaseModel):
    product_name: str
    business_type: Optional[str] = None


@router.post("/product-image")
async def product_image(req: ProductImageRequest):
    """Search Pexels for a product image, using AI to refine the query if needed."""
    pexels_key = os.getenv("PEXELS_API_KEY", "")
    if not pexels_key:
        return {"image_url": None, "error": "PEXELS_API_KEY not configured"}

    async def search_pexels(query: str, http: httpx.AsyncClient):
        """Search Pexels and return the best photo URL or None."""
        resp = await http.get(
            PEXELS_SEARCH_URL,
            params={"query": query, "per_page": 5, "orientation": "square"},
            headers={"Authorization": pexels_key},
        )
        resp.raise_for_status()
        photos = resp.json().get("photos", [])
        if photos:
            src = photos[0].get("src", {})
            return {
                "image_url": src.get("medium") or src.get("small") or src.get("original"),
                "search_query": query,
                "photographer": photos[0].get("photographer", ""),
            }
        return None

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            # Step 1: Try searching with the original product name directly
            result = await search_pexels(req.product_name, http)
            if result:
                return result

            # Step 2: If no results, ask AI for a better search query
            context = f" The shop is a {req.business_type} business." if req.business_type else ""
            prompt = f"""You are helping find a product photo on a stock image site.{context}

Product name: "{req.product_name}"

Return ONLY a short (2-5 word) English search query that would find the best photo of this EXACT product.
- KEEP the brand name and model name — they are critical for finding the right image
- Be specific: "KTM Duke motorcycle" NOT just "motorcycle"
- No quotes, no explanation, just the search query text"""

            search_query = req.product_name
            try:
                client = get_groq_client()
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=20,
                )
                ai_query = completion.choices[0].message.content.strip().strip('"').strip("'")
                if ai_query:
                    search_query = ai_query
            except Exception:
                pass

            result = await search_pexels(search_query, http)
            if result:
                return result

            return {"image_url": None, "search_query": search_query}
    except Exception:
        return {"image_url": None, "search_query": req.product_name}
