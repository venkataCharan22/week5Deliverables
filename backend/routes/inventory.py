from fastapi import APIRouter, Query
from models.schemas import ProductCreate
from services.firebase_service import get_db
from datetime import datetime

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _products_col(user_id: str):
    db = get_db()
    return db.collection("users").document(user_id).collection("products")


@router.get("")
async def list_products(user_id: str = Query(...)):
    """List all products for a user."""
    docs = _products_col(user_id).order_by("createdAt", direction="DESCENDING").stream()
    products = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        products.append(data)
    return {"products": products}


@router.post("")
async def add_product(product: ProductCreate, user_id: str = Query(...)):
    """Add a new product for a user."""
    data = {
        **product.model_dump(),
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
    }
    doc_ref = _products_col(user_id).add(data)
    return {"product": {**data, "id": doc_ref[1].id}, "message": "Product added successfully"}
