from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.inventory import Inventory
from app.models.product import Product

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_test_inventory():
    with SessionLocal() as db:
        semen = db.query(Product).filter_by(sku="SMN-TR-50").first()
        if semen:
            inv = db.query(Inventory).filter_by(product_id=semen.id).first()
            if inv:
                inv.physical_stock = Decimal("500.0000")
                inv.reserved_stock = Decimal("0.0000")
                db.commit()
    yield


def test_list_customers_api():
    """Verify customers list API returns price tiers."""
    res = client.get("/api/customers")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    cv_bangun = next(c for c in data if c["name"] == "CV Bangun Jaya")
    assert cv_bangun["price_tier"] == "contractor"


def test_pos_checkout_flow_with_multi_units():
    """Test full checkout with multi-unit conversion and payment."""
    # 1. Fetch products
    prods = client.get("/api/products").json()
    semen = next(p for p in prods if p["sku"] == "SMN-TR-50")
    dus_unit = next(u for u in semen["units"] if "Dus" in u["unit_name"])

    # 2. Fetch contractor customer
    custs = client.get("/api/customers").json()
    cust = next(c for c in custs if c["price_tier"] == "contractor")

    # 3. Create sale with 2 Dus
    payload = {
        "customer_id": cust["id"],
        "delivery_mode": "taken",
        "payment_mode": "paid",
        "items": [
            {
                "product_unit_id": dus_unit["id"],
                "quantity": 2,  # 2 Dus = 20 Sak
            }
        ],
        "initial_payment": {
            "amount": float(dus_unit["price_contractor"]) * 2,
            "method": "cash",
            "notes": "Pembayaran lunas kasir",
        },
        "notes": "Beli 2 Dus Semen",
    }

    res = client.post("/api/sales", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert "INV-" in data["invoice_number"]
    assert data["payment_status"] == "paid"
    assert data["delivery_status"] == "taken"
    assert "detail" in data
    assert len(data["detail"]["items"]) == 1


def test_pos_checkout_credit_limit_and_tempo_api():
    """Test credit limit enforcement via API."""
    prods = client.get("/api/products").json()
    semen = next(p for p in prods if p["sku"] == "SMN-TR-50")
    sak_unit = next(u for u in semen["units"] if u["unit_name"] == "Sak")
    custs = client.get("/api/customers").json()
    cv_bangun = next(c for c in custs if c["name"] == "CV Bangun Jaya")

    # 1. Walk-in customer selecting tempo -> 400
    res = client.post("/api/sales", json={
        "customer_id": None,
        "payment_mode": "tempo",
        "delivery_mode": "taken",
        "items": [{"product_unit_id": sak_unit["id"], "quantity": 1}],
    })
    assert res.status_code == 400
    assert "Pelanggan/Kontraktor wajib dipilih" in res.json()["detail"]

    # 2. Valid tempo sale with contractor customer
    res = client.post("/api/sales", json={
        "customer_id": cv_bangun["id"],
        "payment_mode": "tempo",
        "delivery_mode": "taken",
        "due_date": "2026-11-20",
        "items": [{"product_unit_id": sak_unit["id"], "quantity": 5}],
    })
    assert res.status_code == 200
    data = res.json()
    assert data["payment_status"] == "tempo"
    assert data["total_amount"] == 5 * sak_unit["price_contractor"]


def test_pos_checkout_split_delivery_and_detail_api():
    """Test split delivery (take now vs ship later) and transaction detail retrieval."""
    prods = client.get("/api/products").json()
    semen = next(p for p in prods if p["sku"] == "SMN-TR-50")
    sak_unit = next(u for u in semen["units"] if u["unit_name"] == "Sak")
    custs = client.get("/api/customers").json()
    cust = next(c for c in custs if c["name"] == "PT Mega Proyek")

    payload = {
        "customer_id": cust["id"],
        "delivery_mode": "partial",
        "payment_mode": "paid",
        "initial_payment": {
            "amount": sak_unit["price_wholesale"] * 10,
            "method": "transfer",
        },
        "delivery_address": "Proyek Gudang Bypass No. 12",
        "driver_name": "Pak Ketut",
        "vehicle_info": "DK 1234 XY",
        "items": [
            {
                "product_unit_id": sak_unit["id"],
                "quantity": 10,
                "take_now_qty": 3,
                "ship_later_qty": 7,
            }
        ],
    }

    res = client.post("/api/sales", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["delivery_status"] == "partial"
    inv_num = data["invoice_number"]

    # Fetch via GET /api/transactions/{inv_num}
    get_res = client.get(f"/api/transactions/{inv_num}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["invoice_number"] == inv_num
    assert detail["customer"]["name"] == "PT Mega Proyek"
    assert len(detail["delivery_orders"]) == 2
    assert "Rupiah" in detail["terbilang"]

