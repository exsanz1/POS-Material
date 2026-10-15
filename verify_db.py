"""
Verification script for POS Material database.

Queries all tables, prints row counts, and displays sample data
to verify the schema and seed data are correct.
"""

from sqlalchemy import inspect, text

from app.database import SessionLocal, engine
from app.models.category import Category
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.product_unit import ProductUnit
from app.models.wholesale_price import WholesalePrice


def verify() -> None:
    """Verify the database schema and data."""
    session = SessionLocal()

    try:
        # ------------------------------------------------------------------
        # 1. Table listing with row counts
        # ------------------------------------------------------------------
        inspector = inspect(engine)
        table_names = inspector.get_table_names()
        print("=" * 60)
        print("DATABASE TABLES AND ROW COUNTS")
        print("=" * 60)

        for table_name in sorted(table_names):
            if table_name == "alembic_version":
                continue
            result = session.execute(
                text(f'SELECT COUNT(*) FROM "{table_name}"')
            )
            count = result.scalar()
            print(f"  {table_name:<30} {count:>5} rows")

        # ------------------------------------------------------------------
        # 2. Sample product with units and prices
        # ------------------------------------------------------------------
        print("\n" + "=" * 60)
        print("SAMPLE PRODUCT WITH UNITS & PRICES")
        print("=" * 60)

        product = session.query(Product).filter_by(sku="SMN-TR-50").first()
        if product:
            print(f"\n  Product:  {product.name}")
            print(f"  SKU:      {product.sku}")
            print(f"  Base:     {product.base_unit}")
            print(f"  Category: {product.category.name}")
            print(f"  Active:   {product.is_active}")

            print(
                f"\n  {'Unit':<15} {'Factor':>8} {'Retail':>12} "
                f"{'Contractor':>12} {'Wholesale':>12}"
            )
            print(f"  {'-'*15} {'-'*8} {'-'*12} {'-'*12} {'-'*12}")

            for pu in sorted(product.product_units, key=lambda u: u.sort_order):
                print(
                    f"  {pu.unit_name:<15} "
                    f"{pu.conversion_factor:>8} "
                    f"{pu.price_retail:>12,.2f} "
                    f"{pu.price_contractor:>12,.2f} "
                    f"{pu.price_wholesale:>12,.2f}"
                )

            # Wholesale price rules
            sak_unit = next(
                (u for u in product.product_units if u.unit_name == "Sak"), None
            )
            if sak_unit and sak_unit.wholesale_prices:
                print(f"\n  Wholesale Price Rules (per {sak_unit.unit_name}):")
                for wp in sorted(sak_unit.wholesale_prices, key=lambda w: w.min_qty):
                    print(
                        f"    >= {wp.min_qty} {sak_unit.unit_name} "
                        f"-> Rp {wp.price:>12,.2f}"
                    )

        # ------------------------------------------------------------------
        # 3. Inventory listing
        # ------------------------------------------------------------------
        print("\n" + "=" * 60)
        print("INVENTORY STATUS")
        print("=" * 60)
        print(
            f"\n  {'Product':<30} {'Physical':>10} {'Reserved':>10} "
            f"{'Available':>10} {'Unit':<10}"
        )
        print(f"  {'-'*30} {'-'*10} {'-'*10} {'-'*10} {'-'*10}")

        inventories = (
            session.query(Inventory)
            .join(Product)
            .order_by(Product.name)
            .all()
        )
        for inv in inventories:
            print(
                f"  {inv.product.name:<30} "
                f"{inv.physical_stock:>10.4f} "
                f"{inv.reserved_stock:>10.4f} "
                f"{inv.available_stock:>10.4f} "
                f"{inv.product.base_unit:<10}"
            )

        # ------------------------------------------------------------------
        # 4. Customers
        # ------------------------------------------------------------------
        print("\n" + "=" * 60)
        print("CUSTOMERS")
        print("=" * 60)
        customers = session.query(Customer).all()
        for cust in customers:
            print(
                f"  {cust.name:<25} tier={cust.price_tier:<12} "
                f"phone={cust.phone}"
            )

        # ------------------------------------------------------------------
        # 5. Schema verification
        # ------------------------------------------------------------------
        print("\n" + "=" * 60)
        print("SCHEMA VERIFICATION")
        print("=" * 60)

        expected_tables = {
            "categories", "products", "product_units", "wholesale_prices",
            "inventory", "customers", "transactions", "transaction_items",
            "payments", "delivery_orders", "delivery_order_items",
        }
        actual_tables = {t for t in table_names if t != "alembic_version"}
        missing = expected_tables - actual_tables
        extra = actual_tables - expected_tables

        if not missing and not extra:
            print("  [OK] All expected tables present")
        else:
            if missing:
                print(f"  [FAIL] Missing tables: {missing}")
            if extra:
                print(f"  [WARN] Extra tables: {extra}")

        # Check numeric column types on product_units
        pu_columns = {c["name"]: c for c in inspector.get_columns("product_units")}
        numeric_cols = [
            "conversion_factor", "price_retail",
            "price_contractor", "price_wholesale",
        ]
        all_numeric_ok = True
        for col_name in numeric_cols:
            col_type = str(pu_columns[col_name]["type"])
            if "NUMERIC" in col_type.upper():
                print(f"  [OK] product_units.{col_name} -> {col_type}")
            else:
                print(
                    f"  [FAIL] product_units.{col_name} -> {col_type} "
                    f"(expected NUMERIC)"
                )
                all_numeric_ok = False

        if all_numeric_ok:
            print("\n[SUCCESS] Verification complete!")
        else:
            print("\n[WARN] Verification complete with warnings.")

    except Exception as e:
        print(f"\n[ERROR] Verification error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    verify()
