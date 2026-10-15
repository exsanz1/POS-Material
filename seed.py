"""
Seed script for POS Material database.

Populates the database with sample categories, products, product units,
inventory records, customers, and wholesale price rules.
"""

from decimal import Decimal

from app.database import SessionLocal
from app.models.category import Category
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.product_unit import ProductUnit
from app.models.wholesale_price import WholesalePrice


def seed() -> None:
    """Seed the database with sample data."""
    session = SessionLocal()

    try:
        # ------------------------------------------------------------------
        # 1. Categories
        # ------------------------------------------------------------------
        category_names = [
            "Semen",
            "Besi & Baja",
            "Pasir & Batu",
            "Kayu",
            "Cat & Finishing",
            "Atap & Genteng",
            "Pipa & Sanitasi",
            "Alat Tukang",
        ]
        categories: dict[str, Category] = {}
        for name in category_names:
            cat = Category(name=name)
            session.add(cat)
            categories[name] = cat

        session.flush()  # Assign IDs
        print(f"[OK] Created {len(categories)} categories")

        # ------------------------------------------------------------------
        # 2. Products with multi-unit conversions
        # ------------------------------------------------------------------
        products_data = [
            {
                "category": "Semen",
                "sku": "SMN-TR-50",
                "name": "Semen Tiga Roda 50kg",
                "base_unit": "Sak",
                "description": "Semen Portland Tipe I, kemasan 50 kg",
                "units": [
                    {
                        "unit_name": "Sak",
                        "conversion_factor": Decimal("1.0000"),
                        "price_retail": Decimal("58000.00"),
                        "price_contractor": Decimal("56000.00"),
                        "price_wholesale": Decimal("55000.00"),
                        "sort_order": 0,
                    },
                    {
                        "unit_name": "Dus/10Sak",
                        "conversion_factor": Decimal("10.0000"),
                        "price_retail": Decimal("570000.00"),
                        "price_contractor": Decimal("550000.00"),
                        "price_wholesale": Decimal("540000.00"),
                        "sort_order": 1,
                    },
                ],
                "physical_stock": Decimal("500.0000"),
            },
            {
                "category": "Besi & Baja",
                "sku": "BSI-BT-10",
                "name": "Besi Beton 10mm",
                "base_unit": "Batang",
                "description": "Besi beton polos diameter 10mm, panjang 12m",
                "units": [
                    {
                        "unit_name": "Batang",
                        "conversion_factor": Decimal("1.0000"),
                        "price_retail": Decimal("75000.00"),
                        "price_contractor": Decimal("72000.00"),
                        "price_wholesale": Decimal("70000.00"),
                        "sort_order": 0,
                    },
                    {
                        "unit_name": "Ikat/20Btg",
                        "conversion_factor": Decimal("20.0000"),
                        "price_retail": Decimal("1450000.00"),
                        "price_contractor": Decimal("1400000.00"),
                        "price_wholesale": Decimal("1360000.00"),
                        "sort_order": 1,
                    },
                ],
                "physical_stock": Decimal("200.0000"),
            },
            {
                "category": "Pasir & Batu",
                "sku": "PSR-COR-01",
                "name": "Pasir Cor",
                "base_unit": "Kubik",
                "description": "Pasir cor kasar untuk campuran beton",
                "units": [
                    {
                        "unit_name": "Kubik",
                        "conversion_factor": Decimal("1.0000"),
                        "price_retail": Decimal("350000.00"),
                        "price_contractor": Decimal("330000.00"),
                        "price_wholesale": Decimal("310000.00"),
                        "sort_order": 0,
                    },
                    {
                        "unit_name": "Truk/7Kubik",
                        "conversion_factor": Decimal("7.0000"),
                        "price_retail": Decimal("2400000.00"),
                        "price_contractor": Decimal("2250000.00"),
                        "price_wholesale": Decimal("2100000.00"),
                        "sort_order": 1,
                    },
                ],
                "physical_stock": Decimal("50.0000"),
            },
            {
                "category": "Cat & Finishing",
                "sku": "CAT-DLX-5L",
                "name": "Cat Dulux Pentalite 5L",
                "base_unit": "Pail",
                "description": "Cat interior Dulux Pentalite 5 liter",
                "units": [
                    {
                        "unit_name": "Pail",
                        "conversion_factor": Decimal("1.0000"),
                        "price_retail": Decimal("185000.00"),
                        "price_contractor": Decimal("178000.00"),
                        "price_wholesale": Decimal("172000.00"),
                        "sort_order": 0,
                    },
                    {
                        "unit_name": "Dus/4Pail",
                        "conversion_factor": Decimal("4.0000"),
                        "price_retail": Decimal("720000.00"),
                        "price_contractor": Decimal("695000.00"),
                        "price_wholesale": Decimal("675000.00"),
                        "sort_order": 1,
                    },
                ],
                "physical_stock": Decimal("80.0000"),
            },
            {
                "category": "Pipa & Sanitasi",
                "sku": "PPA-PVC-4AW",
                "name": "Pipa PVC 4\" AW",
                "base_unit": "Batang",
                "description": "Pipa PVC diameter 4 inch tipe AW, panjang 4m",
                "units": [
                    {
                        "unit_name": "Batang",
                        "conversion_factor": Decimal("1.0000"),
                        "price_retail": Decimal("95000.00"),
                        "price_contractor": Decimal("90000.00"),
                        "price_wholesale": Decimal("87000.00"),
                        "sort_order": 0,
                    },
                    {
                        "unit_name": "Ikat/10Btg",
                        "conversion_factor": Decimal("10.0000"),
                        "price_retail": Decimal("920000.00"),
                        "price_contractor": Decimal("880000.00"),
                        "price_wholesale": Decimal("850000.00"),
                        "sort_order": 1,
                    },
                ],
                "physical_stock": Decimal("120.0000"),
            },
        ]

        semen_sak_unit: ProductUnit | None = None

        for pd in products_data:
            product = Product(
                category_id=categories[pd["category"]].id,
                sku=pd["sku"],
                name=pd["name"],
                base_unit=pd["base_unit"],
                description=pd["description"],
            )
            session.add(product)
            session.flush()

            for unit_data in pd["units"]:
                pu = ProductUnit(
                    product_id=product.id,
                    unit_name=unit_data["unit_name"],
                    conversion_factor=unit_data["conversion_factor"],
                    price_retail=unit_data["price_retail"],
                    price_contractor=unit_data["price_contractor"],
                    price_wholesale=unit_data["price_wholesale"],
                    sort_order=unit_data["sort_order"],
                )
                session.add(pu)
                session.flush()

                # Keep reference to Semen Sak unit for wholesale prices
                if pd["sku"] == "SMN-TR-50" and unit_data["unit_name"] == "Sak":
                    semen_sak_unit = pu

            # Inventory
            inv = Inventory(
                product_id=product.id,
                physical_stock=pd["physical_stock"],
                reserved_stock=Decimal("0.0000"),
                low_stock_threshold=Decimal("10.0000"),
            )
            session.add(inv)

        session.flush()
        print(f"[OK] Created {len(products_data)} products with units and inventory")

        # ------------------------------------------------------------------
        # 3. Wholesale price rules for Semen Sak
        # ------------------------------------------------------------------
        if semen_sak_unit is not None:
            wholesale_rules = [
                WholesalePrice(
                    product_unit_id=semen_sak_unit.id,
                    min_qty=50,
                    price=Decimal("55000.00"),
                ),
                WholesalePrice(
                    product_unit_id=semen_sak_unit.id,
                    min_qty=100,
                    price=Decimal("53000.00"),
                ),
            ]
            session.add_all(wholesale_rules)
            print("[OK] Created wholesale price rules for Semen Tiga Roda (Sak)")

        # ------------------------------------------------------------------
        # 4. Customers
        # ------------------------------------------------------------------
        customers = [
            Customer(
                name="Budi Santoso",
                phone="081234567890",
                address="Jl. Merdeka No. 10, Denpasar",
                price_tier="retail",
                credit_limit=Decimal("5000000.00"),
                notes="Pelanggan tetap, pembangunan rumah pribadi",
            ),
            Customer(
                name="CV Bangun Jaya",
                phone="081298765432",
                address="Jl. Gatot Subroto No. 55, Denpasar",
                price_tier="contractor",
                credit_limit=Decimal("50000000.00"),
                notes="Kontraktor proyek perumahan",
            ),
            Customer(
                name="PT Mega Proyek",
                phone="081122334455",
                address="Kawasan Industri No. 8, Denpasar",
                price_tier="wholesale",
                credit_limit=Decimal("150000000.00"),
                notes="Proyek Infrastruktur & Komersial",
            ),
        ]
        session.add_all(customers)
        print(f"[OK] Created {len(customers)} customers")

        # ------------------------------------------------------------------
        # Commit all
        # ------------------------------------------------------------------
        session.commit()
        print("\n[SUCCESS] Database seeded successfully!")

    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] Error seeding database: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed()
