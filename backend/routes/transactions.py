from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from services.firebase_service import get_db
import csv
import io

router = APIRouter(tags=["transactions"])


class SellRequest(BaseModel):
    product_id: str
    quantity: int
    customer_name: Optional[str] = None


class RentRequest(BaseModel):
    product_id: str
    quantity: int
    customer_name: Optional[str] = None
    return_date: str  # ISO string


class ReturnRentalRequest(BaseModel):
    rental_id: str


# ─── Sell ───────────────────────────────────────────

@router.post("/sell")
async def sell_product(req: SellRequest, user_id: str = Query(...)):
    db = get_db()
    prod_ref = db.collection("users").document(user_id).collection("products").document(req.product_id)
    prod_snap = prod_ref.get()

    if not prod_snap.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    product = prod_snap.to_dict()
    if product.get("quantity", 0) < req.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    # Deduct stock
    new_qty = product["quantity"] - req.quantity
    prod_ref.update({"quantity": new_qty, "updatedAt": datetime.now()})

    # Record transaction
    tx_data = {
        "type": "sale",
        "productId": req.product_id,
        "productName": product.get("name", ""),
        "category": product.get("category", ""),
        "quantity": req.quantity,
        "pricePerUnit": product.get("price", 0),
        "totalAmount": req.quantity * product.get("price", 0),
        "customerName": req.customer_name,
        "createdAt": datetime.now(),
    }
    db.collection("users").document(user_id).collection("transactions").add(tx_data)

    return {"message": "Sale recorded", "newQuantity": new_qty, "totalAmount": tx_data["totalAmount"]}


# ─── Rent ───────────────────────────────────────────

@router.post("/rent")
async def rent_product(req: RentRequest, user_id: str = Query(...)):
    db = get_db()
    prod_ref = db.collection("users").document(user_id).collection("products").document(req.product_id)
    prod_snap = prod_ref.get()

    if not prod_snap.exists:
        raise HTTPException(status_code=404, detail="Product not found")

    product = prod_snap.to_dict()
    if product.get("quantity", 0) < req.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    # Deduct stock
    new_qty = product["quantity"] - req.quantity
    prod_ref.update({"quantity": new_qty, "updatedAt": datetime.now()})

    # Record rental
    return_dt = datetime.fromisoformat(req.return_date.replace("Z", "+00:00"))
    rental_data = {
        "productId": req.product_id,
        "productName": product.get("name", ""),
        "category": product.get("category", ""),
        "quantity": req.quantity,
        "pricePerUnit": product.get("price", 0),
        "customerName": req.customer_name,
        "returnDate": return_dt,
        "status": "active",
        "createdAt": datetime.now(),
    }
    _, rental_ref = db.collection("users").document(user_id).collection("rentals").add(rental_data)

    return {"message": "Rental recorded", "rentalId": rental_ref.id, "newQuantity": new_qty}


# ─── Return a rental ───────────────────────────────

@router.post("/return-rental")
async def return_rental(req: ReturnRentalRequest, user_id: str = Query(...)):
    db = get_db()
    rental_ref = db.collection("users").document(user_id).collection("rentals").document(req.rental_id)
    rental_snap = rental_ref.get()

    if not rental_snap.exists:
        raise HTTPException(status_code=404, detail="Rental not found")

    rental = rental_snap.to_dict()
    if rental.get("status") != "active":
        raise HTTPException(status_code=400, detail="Rental already returned")

    # Restore stock
    prod_ref = db.collection("users").document(user_id).collection("products").document(rental["productId"])
    prod_snap = prod_ref.get()
    if prod_snap.exists:
        current_qty = prod_snap.to_dict().get("quantity", 0)
        prod_ref.update({"quantity": current_qty + rental["quantity"], "updatedAt": datetime.now()})

    # Mark rental returned
    rental_ref.update({"status": "returned", "returnedAt": datetime.now()})

    return {"message": "Rental returned successfully"}


# ─── Get active rentals ────────────────────────────

@router.get("/rentals")
async def get_rentals(user_id: str = Query(...)):
    db = get_db()
    docs = (
        db.collection("users").document(user_id).collection("rentals")
        .where("status", "==", "active")
        .order_by("returnDate")
        .stream()
    )
    rentals = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        # Convert datetime to ISO string for JSON
        if data.get("returnDate"):
            data["returnDate"] = data["returnDate"].isoformat() if hasattr(data["returnDate"], "isoformat") else str(data["returnDate"])
        if data.get("createdAt"):
            data["createdAt"] = data["createdAt"].isoformat() if hasattr(data["createdAt"], "isoformat") else str(data["createdAt"])
        rentals.append(data)
    return {"rentals": rentals}


# ─── Get recent transactions ──────────────────────

@router.get("/transactions")
async def get_transactions(user_id: str = Query(...), limit: int = Query(20)):
    db = get_db()
    docs = (
        db.collection("users").document(user_id).collection("transactions")
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
        .stream()
    )
    txs = []
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id
        if data.get("createdAt"):
            data["createdAt"] = data["createdAt"].isoformat() if hasattr(data["createdAt"], "isoformat") else str(data["createdAt"])
        txs.append(data)
    return {"transactions": txs}


# ─── Export all data as CSV ───────────────────────

def _fmt_dt(val):
    if val is None:
        return ""
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


@router.get("/export")
async def export_data(user_id: str = Query(...)):
    """Export all sales, rentals, and inventory as a single CSV file."""
    db = get_db()
    output = io.StringIO()
    writer = csv.writer(output)

    # ── Sheet 1: Inventory ──
    writer.writerow(["=== INVENTORY ==="])
    writer.writerow(["Name", "Category", "Quantity", "Price", "Threshold", "Created"])
    products = db.collection("users").document(user_id).collection("products").order_by("createdAt", direction="DESCENDING").stream()
    for d in products:
        p = d.to_dict()
        writer.writerow([
            p.get("name", ""),
            p.get("category", ""),
            p.get("quantity", 0),
            p.get("price", 0),
            p.get("threshold", 0),
            _fmt_dt(p.get("createdAt")),
        ])

    writer.writerow([])

    # ── Sheet 2: Sales ──
    writer.writerow(["=== SALES ==="])
    writer.writerow(["Product", "Category", "Qty Sold", "Price/Unit", "Total", "Customer", "Date"])
    txs = db.collection("users").document(user_id).collection("transactions").order_by("createdAt", direction="DESCENDING").stream()
    for d in txs:
        t = d.to_dict()
        writer.writerow([
            t.get("productName", ""),
            t.get("category", ""),
            t.get("quantity", 0),
            t.get("pricePerUnit", 0),
            t.get("totalAmount", 0),
            t.get("customerName", ""),
            _fmt_dt(t.get("createdAt")),
        ])

    writer.writerow([])

    # ── Sheet 3: Rentals ──
    writer.writerow(["=== RENTALS ==="])
    writer.writerow(["Product", "Category", "Qty", "Price/Unit", "Customer", "Status", "Return Date", "Rented On"])
    rentals = db.collection("users").document(user_id).collection("rentals").order_by("createdAt", direction="DESCENDING").stream()
    for d in rentals:
        r = d.to_dict()
        writer.writerow([
            r.get("productName", ""),
            r.get("category", ""),
            r.get("quantity", 0),
            r.get("pricePerUnit", 0),
            r.get("customerName", ""),
            r.get("status", ""),
            _fmt_dt(r.get("returnDate")),
            _fmt_dt(r.get("createdAt")),
        ])

    output.seek(0)
    today = datetime.now().strftime("%Y-%m-%d")
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="bizbuddy_export_{today}.csv"'},
    )
