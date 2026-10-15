"""FastAPI application serving the POS Backend API and the frontend application."""

import contextlib
from datetime import date, datetime, time
from decimal import Decimal
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.exceptions import POSException
from app.models.category import Category
from app.models.customer import Customer
from app.models.delivery_order import DeliveryOrder
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.product_unit import ProductUnit
from app.models.transaction import Transaction
from app.services import (
    DeliveryService,
    InventoryService,
    PaymentService,
    TransactionService,
)

app = FastAPI(title="POS Toko Material & Bangunan API")

# Dependency for DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class ProductUnitInput(BaseModel):
    id: int | None = None
    unit_name: str
    conversion_factor: Decimal
    barcode: str | None = None
    price_retail: Decimal
    price_contractor: Decimal
    price_wholesale: Decimal

class CreateProductRequest(BaseModel):
    sku: str
    name: str
    category_id: int
    base_unit: str
    rack_location: str | None = None
    description: str | None = None
    low_stock_threshold: Decimal = Decimal(0)
    initial_stock: Decimal = Decimal(0)
    units: list[ProductUnitInput]

class UpdateProductRequest(BaseModel):
    sku: str
    name: str
    category_id: int
    base_unit: str
    rack_location: str | None = None
    description: str | None = None
    low_stock_threshold: Decimal = Decimal(0)
    units: list[ProductUnitInput]

class SaleItemRequest(BaseModel):
    product_unit_id: int
    quantity: Decimal
    take_now_qty: Decimal | None = None
    ship_later_qty: Decimal | None = None

class InitialPaymentRequest(BaseModel):
    amount: Decimal
    method: str = "cash"
    reference: str | None = None
    notes: str | None = None

class CreateSaleRequest(BaseModel):
    customer_id: int | None = None
    items: list[SaleItemRequest]
    delivery_mode: str = "taken"  # taken, partial, pending
    payment_mode: str = "paid"     # paid, dp, tempo
    initial_payment: InitialPaymentRequest | None = None
    due_date: str | None = None
    delivery_address: str | None = None
    driver_name: str | None = None
    vehicle_info: str | None = None
    delivery_notes: str | None = None
    notes: str | None = None

class AddPaymentRequest(BaseModel):
    amount: Decimal
    method: str
    reference: str | None = None
    notes: str | None = None

class DeliverItemRequest(BaseModel):
    transaction_item_id: int
    quantity: Decimal

class CreateDeliveryOrderRequest(BaseModel):
    transaction_id: int
    items: list[DeliverItemRequest]
    driver_name: str | None = None
    vehicle_info: str | None = None
    delivery_address: str | None = None
    notes: str | None = None
    auto_fulfill: bool = True


# ==========================================
# REST API: MASTER BARANG & KATEGORI
# ==========================================

@app.get("/api/categories")
def list_categories(db: Session = Depends(get_db)):
    """List all product categories."""
    cats = db.scalars(select(Category).order_by(Category.name.asc())).all()
    return [{"id": c.id, "name": c.name} for c in cats]


@app.get("/api/customers")
def list_customers(db: Session = Depends(get_db)):
    """List all registered customers with credit limit & current outstanding debt."""
    customers = db.scalars(select(Customer).order_by(Customer.name.asc())).all()
    results = []
    for c in customers:
        current_debt = TransactionService.get_customer_outstanding(db, c.id)
        limit = c.credit_limit or Decimal("0.00")
        results.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "address": c.address,
            "price_tier": c.price_tier,
            "credit_limit": float(limit),
            "current_debt": float(current_debt),
            "remaining_credit": float(limit - current_debt),
        })
    return results



@app.get("/api/products")
def list_products(
    category_id: int | None = Query(None),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """List all products with units and dual-state inventory."""
    stmt = select(Product).where(Product.is_active.is_(True))
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if search:
        q = f"%{search}%"
        stmt = stmt.where((Product.name.ilike(q)) | (Product.sku.ilike(q)))

    stmt = stmt.order_by(Product.name.asc())
    products = db.scalars(stmt).all()
    results = []
    for p in products:
        inv = p.inventory
        units = []
        for u in p.product_units:
            units.append({
                "id": u.id,
                "unit_name": u.unit_name,
                "conversion_factor": float(u.conversion_factor),
                "barcode": u.barcode,
                "price_retail": float(u.price_retail),
                "price_contractor": float(u.price_contractor),
                "price_wholesale": float(u.price_wholesale),
            })
        results.append({
            "id": p.id,
            "category_id": p.category_id,
            "category_name": p.category.name if p.category else None,
            "sku": p.sku,
            "name": p.name,
            "base_unit": p.base_unit,
            "rack_location": p.rack_location,
            "description": p.description,
            "physical_stock": float(inv.physical_stock) if inv else 0.0,
            "reserved_stock": float(inv.reserved_stock) if inv else 0.0,
            "available_stock": float(inv.available_stock) if inv else 0.0,
            "low_stock_threshold": float(inv.low_stock_threshold) if inv else 0.0,
            "status": "stock-empty" if (inv and inv.available_stock <= 0) else (
                "stock-low" if (inv and inv.available_stock < inv.low_stock_threshold) else "stock-safe"
            ),
            "units": units,
        })
    return results


@app.get("/api/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get single product details with units and inventory."""
    p = db.get(Product, product_id)
    if not p or not p.is_active:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")

    inv = p.inventory
    units = [
        {
            "id": u.id,
            "unit_name": u.unit_name,
            "conversion_factor": float(u.conversion_factor),
            "barcode": u.barcode,
            "price_retail": float(u.price_retail),
            "price_contractor": float(u.price_contractor),
            "price_wholesale": float(u.price_wholesale),
        }
        for u in p.product_units
    ]

    return {
        "id": p.id,
        "sku": p.sku,
        "name": p.name,
        "category_id": p.category_id,
        "category_name": p.category.name if p.category else None,
        "base_unit": p.base_unit,
        "rack_location": p.rack_location,
        "description": p.description,
        "physical_stock": float(inv.physical_stock) if inv else 0.0,
        "reserved_stock": float(inv.reserved_stock) if inv else 0.0,
        "available_stock": float(inv.available_stock) if inv else 0.0,
        "low_stock_threshold": float(inv.low_stock_threshold) if inv else 0.0,
        "units": units,
    }


@app.post("/api/products")
def create_product(req: CreateProductRequest, db: Session = Depends(get_db)):
    """Create new product with multi-units and initial inventory."""
    # Check SKU unique
    existing = db.scalars(select(Product).where(Product.sku == req.sku)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"SKU '{req.sku}' sudah terdaftar.")

    # Validate category
    cat = db.get(Category, req.category_id)
    if not cat:
        raise HTTPException(status_code=400, detail="Kategori tidak valid.")

    product = Product(
        category_id=req.category_id,
        sku=req.sku.strip(),
        name=req.name.strip(),
        base_unit=req.base_unit.strip(),
        rack_location=req.rack_location.strip() if req.rack_location else None,
        description=req.description.strip() if req.description else None,
    )
    db.add(product)
    db.flush()

    # Create units
    # Ensure at least one unit matches base_unit with factor 1.0
    has_base_unit = False
    for u in req.units:
        factor = Decimal(str(u.conversion_factor))
        if u.unit_name.lower() == req.base_unit.lower() or factor == Decimal("1.0"):
            has_base_unit = True

        p_unit = ProductUnit(
            product_id=product.id,
            unit_name=u.unit_name.strip(),
            conversion_factor=factor,
            barcode=u.barcode.strip() if u.barcode else None,
            price_retail=Decimal(str(u.price_retail)),
            price_contractor=Decimal(str(u.price_contractor)),
            price_wholesale=Decimal(str(u.price_wholesale)),
        )
        db.add(p_unit)

    if not has_base_unit:
        # Auto-create base unit row
        db.add(
            ProductUnit(
                product_id=product.id,
                unit_name=req.base_unit.strip(),
                conversion_factor=Decimal("1.0000"),
                price_retail=Decimal(str(req.units[0].price_retail if req.units else 0)),
                price_contractor=Decimal(str(req.units[0].price_contractor if req.units else 0)),
                price_wholesale=Decimal(str(req.units[0].price_wholesale if req.units else 0)),
            )
        )

    # Create inventory
    initial_stock = Decimal(str(req.initial_stock))
    low_stock = Decimal(str(req.low_stock_threshold))
    inv = Inventory(
        product_id=product.id,
        physical_stock=initial_stock,
        reserved_stock=Decimal("0.0000"),
        low_stock_threshold=low_stock,
    )
    db.add(inv)
    db.flush()

    # Record initial stock mutation if > 0
    if initial_stock > 0:
        InventoryService.record_mutation(
            session=db,
            product_id=product.id,
            mutation_type="INITIAL",
            qty_in=initial_stock,
            qty_out=Decimal("0.0000"),
            reference_type="MANUAL",
            reference_number="SALDO-AWAL",
            notes="Saldo awal saat pembuatan master barang",
        )

    db.commit()
    return {"success": True, "product_id": product.id, "sku": product.sku}


@app.put("/api/products/{product_id}")
def update_product(product_id: int, req: UpdateProductRequest, db: Session = Depends(get_db)):
    """Update product information, inventory thresholds, and multi-units."""
    p = db.get(Product, product_id)
    if not p or not p.is_active:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")

    # Check SKU unique if changed
    if p.sku != req.sku:
        existing = db.scalars(
            select(Product).where(Product.sku == req.sku, Product.id != product_id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"SKU '{req.sku}' sudah digunakan produk lain.")

    p.sku = req.sku.strip()
    p.name = req.name.strip()
    p.category_id = req.category_id
    p.base_unit = req.base_unit.strip()
    p.rack_location = req.rack_location.strip() if req.rack_location else None
    p.description = req.description.strip() if req.description else None

    # Update low stock threshold
    if p.inventory:
        p.inventory.low_stock_threshold = Decimal(str(req.low_stock_threshold))

    # Sync units
    existing_units = {u.id: u for u in p.product_units}
    updated_ids = set()

    for u_req in req.units:
        if u_req.id and u_req.id in existing_units:
            unit = existing_units[u_req.id]
            unit.unit_name = u_req.unit_name.strip()
            unit.conversion_factor = Decimal(str(u_req.conversion_factor))
            unit.barcode = u_req.barcode.strip() if u_req.barcode else None
            unit.price_retail = Decimal(str(u_req.price_retail))
            unit.price_contractor = Decimal(str(u_req.price_contractor))
            unit.price_wholesale = Decimal(str(u_req.price_wholesale))
            updated_ids.add(unit.id)
        else:
            new_unit = ProductUnit(
                product_id=p.id,
                unit_name=u_req.unit_name.strip(),
                conversion_factor=Decimal(str(u_req.conversion_factor)),
                barcode=u_req.barcode.strip() if u_req.barcode else None,
                price_retail=Decimal(str(u_req.price_retail)),
                price_contractor=Decimal(str(u_req.price_contractor)),
                price_wholesale=Decimal(str(u_req.price_wholesale)),
            )
            db.add(new_unit)

    # Delete units removed by admin (except if referenced in historical sales)
    for u_id, old_unit in existing_units.items():
        if u_id not in updated_ids:
            with contextlib.suppress(Exception):
                db.delete(old_unit)

    db.commit()
    return {"success": True, "product_id": p.id}


@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Soft delete product."""
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")

    p.is_active = False
    db.commit()
    return {"success": True, "message": f"Produk {p.sku} berhasil dinonaktifkan."}


# ==========================================
# REST API: KARTU STOK (STOCK CARD)
# ==========================================

@app.get("/api/products/{product_id}/stock-card")
def get_product_stock_card(product_id: int, db: Session = Depends(get_db)):
    """Fetch complete chronological stock card ledger for a product."""
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")

    inv = p.inventory
    mutations = InventoryService.get_stock_card(db, product_id)

    # Format mutation history
    mutation_list = []
    for m in mutations:
        mutation_list.append({
            "id": m.id,
            "created_at": m.created_at.strftime("%d/%m/%Y %H:%M") if m.created_at else "-",
            "mutation_type": m.mutation_type,
            "reference_type": m.reference_type or "-",
            "reference_number": m.reference_number or "-",
            "qty_in": float(m.qty_in),
            "qty_out": float(m.qty_out),
            "balance_physical": float(m.balance_physical),
            "balance_reserved": float(m.balance_reserved),
            "balance_available": float(m.balance_available),
            "notes": m.notes or "-",
        })

    return {
        "product": {
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category_name": p.category.name if p.category else "-",
            "base_unit": p.base_unit,
            "rack_location": p.rack_location or "Belum Diatur",
            "physical_stock": float(inv.physical_stock) if inv else 0.0,
            "reserved_stock": float(inv.reserved_stock) if inv else 0.0,
            "available_stock": float(inv.available_stock) if inv else 0.0,
            "low_stock_threshold": float(inv.low_stock_threshold) if inv else 0.0,
        },
        "mutations": mutation_list,
    }


# ==========================================
# REST API: INVENTORY, SALES, DELIVERIES, PAYMENTS
# ==========================================

@app.get("/api/inventory")
def get_inventory_summary(db: Session = Depends(get_db)):
    """Summary of warehouse dual-state stock."""
    inventories = db.scalars(select(Inventory)).all()
    return [
        {
            "product_id": inv.product_id,
            "product_name": inv.product.name,
            "sku": inv.product.sku,
            "rack_location": inv.product.rack_location or "-",
            "base_unit": inv.product.base_unit,
            "physical_stock": float(inv.physical_stock),
            "reserved_stock": float(inv.reserved_stock),
            "available_stock": float(inv.available_stock),
            "status": "stock-empty" if inv.available_stock <= 0 else (
                "stock-low" if inv.available_stock < inv.low_stock_threshold else "stock-safe"
            ),
        }
        for inv in inventories
    ]


@app.post("/api/sales")
def create_sale(req: CreateSaleRequest, db: Session = Depends(get_db)):
    """Create a new sale checkout with credit limit check and delivery splitting."""
    try:
        items = [
            {
                "product_unit_id": it.product_unit_id,
                "quantity": Decimal(str(it.quantity)),
                "take_now_qty": Decimal(str(it.take_now_qty)) if it.take_now_qty is not None else None,
                "ship_later_qty": Decimal(str(it.ship_later_qty)) if it.ship_later_qty is not None else None,
            }
            for it in req.items
        ]
        init_pay = req.initial_payment.model_dump() if req.initial_payment else None

        tx = TransactionService.create_sale(
            session=db,
            items=items,
            customer_id=req.customer_id,
            delivery_mode=req.delivery_mode,
            payment_mode=req.payment_mode,
            initial_payment=init_pay,
            due_date=req.due_date,
            delivery_address=req.delivery_address,
            driver_name=req.driver_name,
            vehicle_info=req.vehicle_info,
            delivery_notes=req.delivery_notes,
            auto_create_do=True,
            notes=req.notes,
        )

        db.commit()

        # Fetch complete detail for printing and confirmation
        tx_detail = TransactionService.get_transaction_detail(db, tx.id)
        init_amount = Decimal(str(req.initial_payment.amount)) if req.initial_payment else Decimal("0.00")
        change_amount = max(Decimal("0.00"), init_amount - tx.total_amount) if req.payment_mode == "paid" else Decimal("0.00")

        return {
            "success": True,
            "invoice_number": tx.invoice_number,
            "transaction_id": tx.id,
            "total_amount": float(tx.total_amount),
            "paid_amount": float(tx.paid_amount),
            "change_amount": float(change_amount),
            "payment_status": tx.payment_status,
            "delivery_status": tx.delivery_status,
            "detail": tx_detail,
        }
    except POSException as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/api/transactions/{identifier}")
def get_transaction(identifier: str, db: Session = Depends(get_db)):
    """Fetch complete transaction details for receipt/invoice/surat jalan rendering."""
    try:
        return TransactionService.get_transaction_detail(db, identifier)
    except POSException as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e



@app.post("/api/transactions/{transaction_id}/payments")
def add_payment(transaction_id: int, req: AddPaymentRequest, db: Session = Depends(get_db)):
    """Record a phased payment."""
    try:
        pay = PaymentService.add_payment(
            session=db,
            transaction_id=transaction_id,
            amount=Decimal(str(req.amount)),
            method=req.method,
            reference=req.reference,
            notes=req.notes,
        )
        db.commit()
        tx = pay.transaction
        return {
            "success": True,
            "payment_id": pay.id,
            "paid_amount": float(tx.paid_amount),
            "payment_status": tx.payment_status,
        }
    except POSException as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/delivery-orders")
def create_delivery_order(req: CreateDeliveryOrderRequest, db: Session = Depends(get_db)):
    """Create and fulfill a Surat Jalan (Delivery Order)."""
    try:
        items = [{"transaction_item_id": it.transaction_item_id, "quantity": Decimal(str(it.quantity))} for it in req.items]
        do = DeliveryService.create_delivery_order(
            session=db,
            transaction_id=req.transaction_id,
            items_to_deliver=items,
            driver_name=req.driver_name,
            vehicle_info=req.vehicle_info,
            delivery_address=req.delivery_address,
            notes=req.notes,
            auto_fulfill=req.auto_fulfill,
        )
        db.commit()
        return {
            "success": True,
            "do_number": do.do_number,
            "status": do.status,
            "transaction_delivery_status": do.transaction.delivery_status,
        }
    except POSException as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/api/delivery-orders")
def list_delivery_orders(db: Session = Depends(get_db)):
    """List all delivery orders with customer, driver, items summary, and status."""
    dos = db.scalars(
        select(DeliveryOrder).order_by(DeliveryOrder.id.desc())
    ).all()

    result = []
    for do in dos:
        tx = do.transaction
        cust_name = tx.customer.name if (tx and tx.customer) else "Pelanggan Langsung (Walk-in)"
        items_summary_list = []
        for doi in do.items:
            unit_name = doi.product_unit.unit_name
            prod_name = doi.product_unit.product.name
            items_summary_list.append(f"{doi.quantity:,.0f} {unit_name} {prod_name}")
        items_summary = ", ".join(items_summary_list) if items_summary_list else "Tidak ada item"

        result.append({
            "id": do.id,
            "do_number": do.do_number,
            "invoice_number": tx.invoice_number if tx else "-",
            "transaction_id": do.transaction_id,
            "customer": cust_name,
            "driver": f"{do.driver_name or '-'} ({do.vehicle_info or '-'})" if do.driver_name else (do.vehicle_info or "-"),
            "driver_name": do.driver_name or "-",
            "vehicle_info": do.vehicle_info or "-",
            "delivery_address": do.delivery_address or "-",
            "items_summary": items_summary,
            "status": do.status,
            "date": do.created_at.strftime("%d %b %Y, %H:%M") if do.created_at else "-",
            "delivered_at": do.delivered_at.strftime("%d %b %Y, %H:%M") if do.delivered_at else None,
        })
    return result


@app.post("/api/delivery-orders/{order_id}/fulfill")
def fulfill_delivery_order(order_id: int, db: Session = Depends(get_db)):
    """Fulfill a pending delivery order (deducts physical & reserved stock)."""
    try:
        do = DeliveryService.fulfill_delivery_order(db, order_id)
        db.commit()
        return {
            "success": True,
            "do_number": do.do_number,
            "status": do.status,
            "delivered_at": do.delivered_at.strftime("%d %b %Y, %H:%M") if do.delivered_at else None,
        }
    except POSException as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/api/receivables")
def list_receivables(db: Session = Depends(get_db)):
    """List all transactions with unpaid receivables (tempo or dp)."""
    txs = db.scalars(
        select(Transaction)
        .where(Transaction.payment_status != "paid")
        .order_by(Transaction.id.desc())
    ).all()

    today_dt = date.today()
    result = []
    for tx in txs:
        cust = tx.customer
        balance = tx.total_amount - tx.paid_amount
        days_left = (tx.due_date - today_dt).days if tx.due_date else 0
        display_status = tx.payment_status
        if tx.due_date and days_left < 0:
            display_status = "overdue"

        result.append({
            "id": tx.id,
            "invoice_number": tx.invoice_number,
            "customer": cust.name if cust else "Pelanggan Walk-in",
            "customer_phone": cust.phone if cust else "-",
            "tier": cust.price_tier if cust else "retail",
            "total": float(tx.total_amount),
            "paid": float(tx.paid_amount),
            "balance": float(balance),
            "status": display_status,
            "payment_status": tx.payment_status,
            "due_date": tx.due_date.strftime("%d %b %Y") if tx.due_date else "-",
            "due_date_iso": tx.due_date.isoformat() if tx.due_date else None,
            "days_left": days_left,
        })
    return result


@app.get("/api/reports/summary")
def get_reports_summary(db: Session = Depends(get_db)):
    """Get aggregated metrics for the reports dashboard."""
    today_start = datetime.combine(date.today(), time.min)

    today_sales_stmt = select(func.coalesce(func.sum(Transaction.total_amount), 0)).where(
        Transaction.created_at >= today_start
    )
    today_sales = Decimal(str(db.scalar(today_sales_stmt) or 0))

    total_receivables_stmt = select(
        func.coalesce(func.sum(Transaction.total_amount - Transaction.paid_amount), 0)
    ).where(Transaction.payment_status != "paid")
    total_receivables = Decimal(str(db.scalar(total_receivables_stmt) or 0))

    pending_do_stmt = select(func.count(DeliveryOrder.id)).where(DeliveryOrder.status == "pending")
    pending_do_count = db.scalar(pending_do_stmt) or 0

    total_sku_stmt = select(func.count(Product.id)).where(Product.is_active.is_(True))
    total_sku = db.scalar(total_sku_stmt) or 0

    return {
        "today_sales": float(today_sales),
        "total_receivables": float(total_receivables),
        "pending_deliveries": pending_do_count,
        "total_sku": total_sku,
    }


# ==========================================
# STATIC FRONTEND SERVING
# ==========================================

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")

@app.get("/")
def serve_index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))
