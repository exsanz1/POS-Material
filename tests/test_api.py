"""Integration tests for FastAPI endpoints and static frontend serving."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_frontend_index_served():
    """Verify that index.html is served at root path."""
    response = client.get("/")
    assert response.status_code == 200
    assert "POS Toko Material & Bangunan" in response.text
    assert "Strict White Minimalist" in response.text
    assert "tabular-nums" in response.text

def test_static_css_served():
    """Verify that styles.css is accessible."""
    response = client.get("/css/styles.css")
    assert response.status_code == 200
    assert "tabular-nums" in response.text
    assert "--color-hairline: #E2E8F0" in response.text

def test_list_products_api():
    """Verify products API endpoint returns multi-unit products."""
    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    semen = next(p for p in data if p["sku"] == "SMN-TR-50")
    assert semen["name"] == "Semen Tiga Roda 50kg"
    assert semen["base_unit"] == "Sak"
    assert len(semen["units"]) >= 2

def test_inventory_api():
    """Verify inventory summary endpoint returns dual-state numbers."""
    response = client.get("/api/inventory")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    for item in data:
        assert "physical_stock" in item
        assert "reserved_stock" in item
        assert "available_stock" in item
        assert item["available_stock"] == item["physical_stock"] - item["reserved_stock"]


def test_delivery_orders_api():
    """Verify delivery orders list endpoint returns proper DO records."""
    response = client.get("/api/delivery-orders")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        first = data[0]
        assert "do_number" in first
        assert "invoice_number" in first
        assert "status" in first
        assert "items_summary" in first


def test_receivables_api():
    """Verify receivables list endpoint returns tempo and dp records."""
    response = client.get("/api/receivables")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        first = data[0]
        assert "invoice_number" in first
        assert "balance" in first
        assert "due_date" in first
        assert first["balance"] > 0


def test_reports_summary_api():
    """Verify reports summary endpoint returns aggregated metrics."""
    response = client.get("/api/reports/summary")
    assert response.status_code == 200
    data = response.json()
    assert "today_sales" in data
    assert "total_receivables" in data
    assert "pending_deliveries" in data
    assert "total_sku" in data
    assert data["total_sku"] >= 5

