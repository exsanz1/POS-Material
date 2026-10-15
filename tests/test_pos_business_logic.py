"""Comprehensive unit and integration tests for POS Material core business logic."""

from decimal import Decimal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.category import Category
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.product_unit import ProductUnit
from app.models.wholesale_price import WholesalePrice
from app.services import (
    DeliveryService,
    InventoryService,
    PaymentService,
    PricingService,
    TransactionService,
)
from app.exceptions import (
    DeliveryQuantityExceededError,
    InsufficientStockError,
    CreditLimitExceededError,
)



@pytest.fixture
def session():
    """Create a fresh in-memory SQLite database and session for each test."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    sess = Session()

    # Seed baseline fixtures
    cat = Category(name="Semen")
    sess.add(cat)
    sess.flush()

    # Product: Semen Tiga Roda 50kg (base unit: Sak)
    semen = Product(
        category_id=cat.id,
        sku="SMN-01",
        name="Semen Tiga Roda 50kg",
        base_unit="Sak",
    )
    sess.add(semen)
    sess.flush()

    # Units: Sak (1) and Dus (10 Sak)
    unit_sak = ProductUnit(
        product_id=semen.id,
        unit_name="Sak",
        conversion_factor=Decimal("1.0000"),
        price_retail=Decimal("60000.00"),
        price_contractor=Decimal("56000.00"),
        price_wholesale=Decimal("54000.00"),
    )
    unit_dus = ProductUnit(
        product_id=semen.id,
        unit_name="Dus",
        conversion_factor=Decimal("10.0000"),
        price_retail=Decimal("590000.00"),
        price_contractor=Decimal("550000.00"),
        price_wholesale=Decimal("530000.00"),
    )
    sess.add_all([unit_sak, unit_dus])
    sess.flush()

    # Wholesale Rules for Sak:
    # >= 50 Sak: Rp 53.000
    # >= 100 Sak: Rp 50.000
    w1 = WholesalePrice(product_unit_id=unit_sak.id, min_qty=50, price=Decimal("53000.00"))
    w2 = WholesalePrice(product_unit_id=unit_sak.id, min_qty=100, price=Decimal("50000.00"))
    sess.add_all([w1, w2])

    # Initial inventory: 500 Sak physical, 0 reserved
    inv = Inventory(
        product_id=semen.id,
        physical_stock=Decimal("500.0000"),
        reserved_stock=Decimal("0.0000"),
        low_stock_threshold=Decimal("20.0000"),
    )
    sess.add(inv)

    # Customers
    cust_retail = Customer(name="Pak Budi", price_tier="retail", credit_limit=Decimal("10000000.00"))
    cust_contractor = Customer(name="CV Maju", price_tier="contractor", credit_limit=Decimal("50000000.00"))
    cust_wholesale = Customer(name="PT Mega Proyek", price_tier="wholesale", credit_limit=Decimal("150000000.00"))
    sess.add_all([cust_retail, cust_contractor, cust_wholesale])


    sess.commit()
    yield sess
    sess.close()


def test_multi_unit_conversion_and_pricing(session):
    """Test that buying multi-units converts correctly to base unit."""
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    dus_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Dus").first()

    # Retail customer buys 3 Dus
    res = PricingService.calculate_item_price(
        session=session,
        product_unit_id=dus_unit.id,
        quantity=Decimal("3"),
        customer_tier="retail",
    )

    assert res.unit_price == Decimal("590000.00")
    assert res.subtotal == Decimal("1770000.00")
    # 3 Dus * 10 Sak = 30 Sak base unit
    assert res.qty_in_base_unit == Decimal("30.0000")


def test_tiered_pricing_by_customer_tier(session):
    """Test 3 price levels: Retail, Contractor, Wholesale."""
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()

    res_retail = PricingService.calculate_item_price(session, sak_unit.id, Decimal("5"), "retail")
    res_contractor = PricingService.calculate_item_price(session, sak_unit.id, Decimal("5"), "contractor")
    res_wholesale = PricingService.calculate_item_price(session, sak_unit.id, Decimal("5"), "wholesale")

    assert res_retail.unit_price == Decimal("60000.00")
    assert res_contractor.unit_price == Decimal("56000.00")
    assert res_wholesale.unit_price == Decimal("54000.00")


def test_automated_wholesale_volume_rules(session):
    """Test wholesale price thresholds triggered by min_qty."""
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()

    # Buy 20 Sak (retail tier, no rule triggers) -> Rp 60.000
    res1 = PricingService.calculate_item_price(session, sak_unit.id, Decimal("20"), "retail")
    assert res1.unit_price == Decimal("60000.00")

    # Buy 50 Sak (triggers >= 50 rule) -> Rp 53.000
    res2 = PricingService.calculate_item_price(session, sak_unit.id, Decimal("50"), "retail")
    assert res2.unit_price == Decimal("53000.00")
    assert res2.subtotal == Decimal("2650000.00")
    assert "wholesale_qty:>=50" in res2.applied_rule

    # Buy 120 Sak (triggers >= 100 rule) -> Rp 50.000
    res3 = PricingService.calculate_item_price(session, sak_unit.id, Decimal("120"), "retail")
    assert res3.unit_price == Decimal("50000.00")
    assert res3.subtotal == Decimal("6000000.00")
    assert "wholesale_qty:>=100" in res3.applied_rule


def test_dual_state_inventory_and_insufficient_stock(session):
    """Test physical_stock, reserved_stock, available_stock, and overselling protection."""
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()

    inv = InventoryService.get_inventory(session, semen.id)
    assert inv.physical_stock == Decimal("500.0000")
    assert inv.reserved_stock == Decimal("0.0000")
    assert inv.available_stock == Decimal("500.0000")

    # Reserving 100 Sak
    InventoryService.reserve_stock(session, semen.id, Decimal("100.0000"))
    assert inv.physical_stock == Decimal("500.0000")
    assert inv.reserved_stock == Decimal("100.0000")
    assert inv.available_stock == Decimal("400.0000")

    # Attempt to reserve 450 Sak when only 400 is available -> InsufficientStockError
    with pytest.raises(InsufficientStockError) as exc_info:
        InventoryService.reserve_stock(session, semen.id, Decimal("450.0000"))
    assert "Stok tidak mencukupi" in str(exc_info.value)


def test_phased_payments_lifecycle(session):
    """Test Payment statuses: Tempo -> DP -> Paid."""
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()
    cust = session.query(Customer).filter_by(name="CV Maju").first()

    # Total: 10 Sak @ Rp 56.000 = Rp 560.000 (Tempo / Kasbon)
    tx = TransactionService.create_sale(
        session=session,
        items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("10")}],
        customer_id=cust.id,
        delivery_mode="pending",
        payment_mode="tempo",
    )
    session.commit()

    assert tx.total_amount == Decimal("560000.00")
    assert tx.paid_amount == Decimal("0.00")
    assert tx.payment_status == "tempo"

    # Stage 1: Pay DP Rp 200.000
    PaymentService.add_payment(session, tx.id, Decimal("200000.00"), method="cash")
    session.commit()
    assert tx.paid_amount == Decimal("200000.00")
    assert tx.payment_status == "dp"

    # Stage 2: Pay Remaining Rp 360.000
    PaymentService.add_payment(session, tx.id, Decimal("360000.00"), method="transfer", reference="TRX987")
    session.commit()
    assert tx.paid_amount == Decimal("560000.00")
    assert tx.payment_status == "paid"


def test_partial_delivery_and_stock_deduction(session):
    """
    Test partial delivery flow as documented:
    Start: physical=500, reserved=0, available=500
    Sale 100 Sak: physical=500, reserved=100, available=400
    DO #1 (40 Sak): physical=460, reserved=60, available=400
    DO #2 (35 Sak): physical=425, reserved=25, available=400
    DO #3 (25 Sak): physical=400, reserved=0, available=400, delivery_status='taken'
    """
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()
    cust = session.query(Customer).filter_by(name="PT Mega Proyek").first()
    inv = InventoryService.get_inventory(session, semen.id)

    # 1. Create Sale of 100 Sak (pending delivery)
    tx = TransactionService.create_sale(
        session=session,
        items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("100")}],
        customer_id=cust.id,
        delivery_mode="pending",
    )
    session.commit()

    tx_item = tx.items[0]
    assert inv.physical_stock == Decimal("500.0000")
    assert inv.reserved_stock == Decimal("100.0000")
    assert inv.available_stock == Decimal("400.0000")
    assert tx.delivery_status == "pending"

    # 2. Surat Jalan #1: Kirim 40 Sak
    DeliveryService.create_delivery_order(
        session=session,
        transaction_id=tx.id,
        items_to_deliver=[{"transaction_item_id": tx_item.id, "quantity": Decimal("40")}],
        driver_name="Pak Joko",
        auto_fulfill=True,
    )
    session.commit()

    assert tx_item.qty_delivered == Decimal("40.0000")
    assert inv.physical_stock == Decimal("460.0000")
    assert inv.reserved_stock == Decimal("60.0000")
    assert inv.available_stock == Decimal("400.0000")
    assert tx.delivery_status == "partial"

    # 3. Surat Jalan #2: Kirim 35 Sak
    DeliveryService.create_delivery_order(
        session=session,
        transaction_id=tx.id,
        items_to_deliver=[{"transaction_item_id": tx_item.id, "quantity": Decimal("35")}],
        driver_name="Pak Joko",
        auto_fulfill=True,
    )
    session.commit()

    assert tx_item.qty_delivered == Decimal("75.0000")
    assert inv.physical_stock == Decimal("425.0000")
    assert inv.reserved_stock == Decimal("25.0000")
    assert inv.available_stock == Decimal("400.0000")
    assert tx.delivery_status == "partial"

    # 4. Attempt to deliver 30 Sak (when only 25 remaining) -> DeliveryQuantityExceededError
    with pytest.raises(DeliveryQuantityExceededError):
        DeliveryService.create_delivery_order(
            session=session,
            transaction_id=tx.id,
            items_to_deliver=[{"transaction_item_id": tx_item.id, "quantity": Decimal("30")}],
        )

    # 5. Surat Jalan #3: Kirim 25 Sak (Final shipment)
    DeliveryService.create_delivery_order(
        session=session,
        transaction_id=tx.id,
        items_to_deliver=[{"transaction_item_id": tx_item.id, "quantity": Decimal("25")}],
        driver_name="Pak Anto",
        auto_fulfill=True,
    )
    session.commit()

    assert tx_item.qty_delivered == Decimal("100.0000")
    assert inv.physical_stock == Decimal("400.0000")
    assert inv.reserved_stock == Decimal("0.0000")
    assert inv.available_stock == Decimal("400.0000")
    # All items delivered -> status changes to 'taken' (complete)
    assert tx.delivery_status == "taken"


def test_direct_pickup_bawa_langsung(session):
    """Test immediate stock deduction when customer takes items on spot (Bawa Langsung)."""
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()
    inv = InventoryService.get_inventory(session, semen.id)

    initial_physical = inv.physical_stock

    tx = TransactionService.create_sale(
        session=session,
        items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("10")}],
        delivery_mode="taken",
        initial_payment={"amount": Decimal("600000.00"), "method": "cash"},
    )
    session.commit()

    assert tx.delivery_status == "taken"
    assert tx.payment_status == "paid"
    # Physical stock deducted immediately, reserved stays 0
    assert inv.physical_stock == initial_physical - Decimal("10.0000")
    assert inv.reserved_stock == Decimal("0.0000")
    assert inv.available_stock == initial_physical - Decimal("10.0000")


def test_customer_credit_limit_validation(session):
    """
    Test customer credit limit enforcement for DP and Tempo transactions:
    1. Walk-in customer cannot purchase via DP or Tempo without registration.
    2. Customer cannot exceed credit limit.
    3. Partial DP reduces new debt and permits transaction if within limit.
    """
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()

    # Customer with credit limit Rp 500.000
    cust = Customer(
        name="Toko Kecil Sejahtera",
        price_tier="retail",
        credit_limit=Decimal("500000.00"),
    )
    session.add(cust)
    session.commit()

    # 1. Walk-in customer fails when selecting Tempo
    with pytest.raises(ValueError, match="Pelanggan/Kontraktor wajib dipilih"):
        TransactionService.create_sale(
            session=session,
            items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("5")}],
            customer_id=None,
            payment_mode="tempo",
        )

    # 2. Total 10 Sak @ Rp 60.000 = Rp 600.000 on Tempo -> Exceeds Limit Rp 500.000
    with pytest.raises(CreditLimitExceededError):
        TransactionService.create_sale(
            session=session,
            items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("10")}],
            customer_id=cust.id,
            payment_mode="tempo",
            due_date="2026-11-15",
        )

    # 3. Pay DP Rp 200.000, new debt = Rp 400.000 <= Rp 500.000 -> Succeeded!
    tx = TransactionService.create_sale(
        session=session,
        items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("10")}],
        customer_id=cust.id,
        payment_mode="dp",
        initial_payment={"amount": Decimal("200000.00"), "method": "cash"},
        due_date="2026-11-15",
    )
    session.commit()

    assert tx.payment_status == "dp"
    assert tx.total_amount == Decimal("600000.00")
    assert tx.paid_amount == Decimal("200000.00")

    # Outstanding debt is now Rp 400.000
    outstanding = TransactionService.get_customer_outstanding(session, cust.id)
    assert outstanding == Decimal("400000.00")

    # 4. Next transaction: 5 Sak @ Rp 60.000 = Rp 300.000
    # Total debt would be 400.000 + 300.000 = 700.000 > 500.000 limit -> Fails!
    with pytest.raises(CreditLimitExceededError):
        TransactionService.create_sale(
            session=session,
            items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("5")}],
            customer_id=cust.id,
            payment_mode="tempo",
            due_date="2026-11-15",
        )


def test_split_delivery_take_now_and_ship_later(session):
    """
    Test per-item delivery split:
    Customer buys 10 Sak semen:
    - 2 Sak bawa langsung sekarang
    - 8 Sak kirim armada toko menyusul
    Stock changes:
    - 2 Sak immediately deducted from physical stock
    - 8 Sak reserved in warehouse (reserved_stock = 8)
    - Available stock decreases by 10 (available = initial - 10)
    - Transaction status is 'partial'
    - Auto-creates pending Surat Jalan for the 8 Sak
    """
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()
    cust = session.query(Customer).filter_by(name="CV Maju").first()
    inv = InventoryService.get_inventory(session, semen.id)

    initial_physical = inv.physical_stock  # 500

    tx = TransactionService.create_sale(
        session=session,
        items=[
            {
                "product_unit_id": sak_unit.id,
                "quantity": Decimal("10"),
                "take_now_qty": Decimal("2"),
                "ship_later_qty": Decimal("8"),
            }
        ],
        customer_id=cust.id,
        delivery_mode="partial",
        payment_mode="paid",
        initial_payment={"amount": Decimal("560000.00"), "method": "transfer"},
        driver_name="Pak Wayan",
        vehicle_info="DK 8901 AB (Engkel)",
        delivery_address="Jl. Sunset Road No. 88, Kuta",
        delivery_notes="Titipkan di pos satpam proyek",
        auto_create_do=True,
    )
    session.commit()

    # Transaction checks
    assert tx.delivery_status == "partial"
    assert tx.payment_status == "paid"
    tx_item = tx.items[0]
    assert tx_item.qty_delivered == Decimal("2.0000")  # 2 Sak taken now

    # Inventory checks
    assert inv.physical_stock == initial_physical - Decimal("2.0000")  # 498
    assert inv.reserved_stock == Decimal("8.0000")  # 8 reserved
    assert inv.available_stock == initial_physical - Decimal("10.0000")  # 490

    # DO checks: 1 auto-fulfilled DO (take now) and 1 pending DO (ship later)
    assert len(tx.delivery_orders) == 2
    taken_do = [d for d in tx.delivery_orders if d.status == "delivered"][0]
    pending_do = [d for d in tx.delivery_orders if d.status == "pending"][0]

    assert taken_do.items[0].quantity == Decimal("2.0000")
    assert pending_do.items[0].quantity == Decimal("8.0000")
    assert pending_do.driver_name == "Pak Wayan"
    assert pending_do.vehicle_info == "DK 8901 AB (Engkel)"
    assert pending_do.delivery_address == "Jl. Sunset Road No. 88, Kuta"

    # Now fulfill the pending DO when driver departs/delivers
    DeliveryService.fulfill_delivery_order(session, pending_do.id)
    session.commit()

    # After full delivery
    assert tx.delivery_status == "taken"
    assert inv.physical_stock == initial_physical - Decimal("10.0000")  # 490
    assert inv.reserved_stock == Decimal("0.0000")
    assert inv.available_stock == initial_physical - Decimal("10.0000")  # 490


def test_transaction_detail_for_printing(session):
    """Test retrieval of transaction details and terbilang for printing."""
    semen = session.query(Product).filter_by(sku="SMN-01").first()
    sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()
    cust = session.query(Customer).filter_by(name="CV Maju").first()

    tx = TransactionService.create_sale(
        session=session,
        items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("10")}],
        customer_id=cust.id,
        delivery_mode="taken",
        payment_mode="paid",
        initial_payment={"amount": Decimal("560000.00"), "method": "cash"},
    )
    session.commit()

    detail = TransactionService.get_transaction_detail(session, tx.id)
    assert detail["invoice_number"] == tx.invoice_number
    assert detail["total_amount"] == 560000.0
    assert detail["paid_amount"] == 560000.0
    assert detail["customer"]["name"] == "CV Maju"
    assert len(detail["items"]) == 1
    assert "Lima Ratus Enam Puluh Ribu Rupiah" in detail["terbilang"]

