from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes import (
    inventory, ocr, chat, poster, analytics, suggestions, voice_parse,
    setup_shop, insights, image_recognize, transactions, festival_insights,
    smart_restock, price_optimizer, business_report, auto_categorize, demand_forecast,
    product_image, agent,
)

load_dotenv()

app = FastAPI(
    title="BizBuddy AI API",
    description="Backend API for BizBuddy AI — inventory & business management",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://10.134.247.152:5173",
        "http://10.134.247.152:5174",
        "https://10.134.247.152:5173",
        "https://10.134.247.152:5174",
        "http://9.124.105.118:5173",
        "http://9.124.105.118:5174",
        "https://9.124.105.118:5173",
        "https://9.124.105.118:5174",
        "https://bizbuddy-ai.web.app",
        "https://bizbuddy-ai.firebaseapp.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(inventory.router)
app.include_router(ocr.router)
app.include_router(chat.router)
app.include_router(poster.router)
app.include_router(analytics.router)
app.include_router(suggestions.router)
app.include_router(voice_parse.router)
app.include_router(setup_shop.router)
app.include_router(insights.router)
app.include_router(image_recognize.router)
app.include_router(transactions.router)
app.include_router(festival_insights.router)
app.include_router(smart_restock.router)
app.include_router(price_optimizer.router)
app.include_router(business_report.router)
app.include_router(auto_categorize.router)
app.include_router(demand_forecast.router)
app.include_router(product_image.router)
app.include_router(agent.router)


@app.get("/")
async def root():
    return {"message": "BizBuddy AI API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
