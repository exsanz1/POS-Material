"""Integration tests for Product CRUD, Dynamic Multi-Units, and Stock Card APIs."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_categories():
    """Verify category list API."""
    res = client.get("/api/categories")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 8
    cat_names = [c["name"] for c in data]
    assert "Semen" in cat_names
    assert "Besi & Baja" in cat_names


def test_create_product_with_multi_units_and_stock_card():
    """
    Test creating a product with:
    - Base unit: Kg
    - Conversion 1: Sak = 40 Kg
    - Conversion 2: Ton = 1000 Kg
    - 3-tier pricing on each unit
    - Rack location: Rak B-12
    - Initial stock: 2000 Kg
    - Verifies Stock Card ledger entry
    """
    # 1. Fetch category id for Semen
    cats = client.get("/api/categories").json()
    semen_cat = next(c for c in cats if c["name"] == "Semen")

    import uuid
    unique_sku = f"SMN-TEST-{uuid.uuid4().hex[:6].upper()}"

    payload = {
        "sku": unique_sku,
        "name": "Semen Dynamix Holcim Curah",
        "category_id": semen_cat["id"],
        "base_unit": "Kg",
        "rack_location": "Silo Gudang C-1",
        "description": "Semen curah berkualitas tinggi untuk cor beton",
        "low_stock_threshold": 500,
        "initial_stock": 2000,
        "units": [
            {
                "unit_name": "Kg",
                "conversion_factor": 1.0,
                "barcode": f"899{uuid.uuid4().int % 1000000000:09d}",
                "price_retail": 1800,
                "price_contractor": 1650,
                "price_wholesale": 1500,
            },
            {
                "unit_name": "Sak (40 Kg)",
                "conversion_factor": 40.0,
                "barcode": f"899{uuid.uuid4().int % 1000000000:09d}",
                "price_retail": 70000,
                "price_contractor": 64000,
                "price_wholesale": 58000,
            },
            {
                "unit_name": "Ton (1000 Kg)",
                "conversion_factor": 1000.0,
                "barcode": f"899{uuid.uuid4().int % 1000000000:09d}",
                "price_retail": 1700000,
                "price_contractor": 1550000,
                "price_wholesale": 1400000,
            },
        ],
    }

    create_res = client.post("/api/products", json=payload)
    assert create_res.status_code == 200, create_res.text
    create_data = create_res.json()
    assert create_data["success"] is True
    prod_id = create_data["product_id"]

    # 2. Get Product Detail
    get_res = client.get(f"/api/products/{prod_id}")
    assert get_res.status_code == 200
    p = get_res.json()
    assert p["sku"] == unique_sku
    assert p["base_unit"] == "Kg"
    assert p["rack_location"] == "Silo Gudang C-1"
    assert p["physical_stock"] == 2000.0
    assert p["available_stock"] == 2000.0
    assert len(p["units"]) == 3

    # Check 3-tier prices on Ton unit
    ton_unit = next(u for u in p["units"] if "Ton" in u["unit_name"])
    assert ton_unit["conversion_factor"] == 1000.0
    assert ton_unit["price_retail"] == 1700000.0
    assert ton_unit["price_contractor"] == 1550000.0
    assert ton_unit["price_wholesale"] == 1400000.0

    # 3. Verify Stock Card (Kartu Stok)
    sc_res = client.get(f"/api/products/{prod_id}/stock-card")
    assert sc_res.status_code == 200
    sc_data = sc_res.json()
    assert sc_data["product"]["name"] == "Semen Dynamix Holcim Curah"
    assert len(sc_data["mutations"]) >= 1

    first_mut = sc_data["mutations"][0]
    assert first_mut["mutation_type"] == "INITIAL"
    assert first_mut["qty_in"] == 2000.0
    assert first_mut["balance_physical"] == 2000.0
    assert first_mut["balance_available"] == 2000.0

    # 4. Update Product (Edit)
    update_payload = {
        "sku": unique_sku,
        "name": "Semen Dynamix Holcim Curah (Updated)",
        "category_id": semen_cat["id"],
        "base_unit": "Kg",
        "rack_location": "Silo Gudang C-2",
        "description": "Keterangan terupdate",
        "low_stock_threshold": 600,
        "units": p["units"],
    }
    update_res = client.put(f"/api/products/{prod_id}", json=update_payload)
    assert update_res.status_code == 200

    p_updated = client.get(f"/api/products/{prod_id}").json()
    assert p_updated["name"] == "Semen Dynamix Holcim Curah (Updated)"
    assert p_updated["rack_location"] == "Silo Gudang C-2"
    assert p_updated["low_stock_threshold"] == 600.0

    # 5. Delete Product (Soft delete)
    del_res = client.delete(f"/api/products/{prod_id}")
    assert del_res.status_code == 200
    # Should not appear in active products list
    active_prods = client.get("/api/products").json()
    assert not any(item["id"] == prod_id for item in active_prods)
