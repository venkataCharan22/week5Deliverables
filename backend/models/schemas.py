from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Product(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    quantity: int
    price: float
    threshold: int = 10
    image: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: int = 0
    price: float = 0
    threshold: int = 10
    image: Optional[str] = None


class ChatMessage(BaseModel):
    message: str
    inventory_context: Optional[str] = None
    business_type: Optional[str] = None


class ChatResponse(BaseModel):
    response: str


class OCRRequest(BaseModel):
    image_base64: str


class OCRResponse(BaseModel):
    extracted_items: list[dict]
    raw_text: str


class PosterRequest(BaseModel):
    description: str


class PosterResponse(BaseModel):
    poster_text: str


class SalesSummary(BaseModel):
    daily_sales: list[dict]
    category_breakdown: list[dict]
    total_revenue: float
    total_orders: int


# --- Suggestions ---

class SuggestProductsRequest(BaseModel):
    business_type: str
    count: int = 12


class SuggestedProduct(BaseModel):
    name: str
    category: str
    typical_price: float
    emoji: str


class SuggestProductsResponse(BaseModel):
    products: list[SuggestedProduct]


# --- Voice Parse ---

class VoiceParseRequest(BaseModel):
    transcript: str
    business_type: Optional[str] = None


class VoiceParseResponse(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: int = 1
    price: float = 0


# --- Shop Setup ---

class ShopSetupRequest(BaseModel):
    business_type: str
    business_name: Optional[str] = None
    user_id: str


class BusinessInsight(BaseModel):
    title: str
    description: str
    icon: str


class ShopSetupResponse(BaseModel):
    suggested_products: list[SuggestedProduct]
    business_insights: list[BusinessInsight]
    welcome_message: str
    tips: list[str]
    ai_greeting: str


# --- Daily Insight ---

class DailyInsightRequest(BaseModel):
    business_type: str
    product_count: int = 0
    low_stock_count: int = 0
    top_categories: list[str] = []


class DailyInsightResponse(BaseModel):
    insight: str
    tip: str


# --- Image Recognize ---

class ImageRecognizeRequest(BaseModel):
    image_base64: str
    business_type: Optional[str] = None


class ImageRecognizeResponse(BaseModel):
    name: str
    category: Optional[str] = None
    price: float = 0
