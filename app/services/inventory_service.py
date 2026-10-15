"""Inventory service implementing Dual-State Stock tracking and Stock Card (Kartu Stok) ledger."""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.exceptions import EntityNotFoundError, InsufficientStockError
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.stock_mutation import StockMutation


class InventoryService:
    """
    Manages dual-state inventory:
    - physical_stock: physical items in warehouse.
    - reserved_stock: items sold awaiting delivery/pickup.
    - available_stock = physical_stock - reserved_stock.
    Records every physical movement in StockMutation (Kartu Stok).
    """

    @staticmethod
    def get_inventory(session: Session, product_id: int) -> Inventory:
        stmt = select(Inventory).where(Inventory.product_id == product_id)
        inv = session.scalars(stmt).first()
        if not inv:
            raise EntityNotFoundError(f"Inventaris untuk produk id={product_id} tidak ditemukan.")
        return inv

    @staticmethod
    def check_availability(session: Session, product_id: int, required_qty: Decimal) -> bool:
        inv = InventoryService.get_inventory(session, product_id)
        return inv.available_stock >= required_qty

    @staticmethod
    def record_mutation(
        session: Session,
        product_id: int,
        mutation_type: str,
        qty_in: Decimal = Decimal("0.0000"),
        qty_out: Decimal = Decimal("0.0000"),
        reference_type: str | None = None,
        reference_number: str | None = None,
        notes: str | None = None,
    ) -> StockMutation:
        """Record an immutable stock movement ledger entry for Kartu Stok."""
        inv = InventoryService.get_inventory(session, product_id)
        mutation = StockMutation(
            product_id=product_id,
            mutation_type=mutation_type,
            reference_type=reference_type,
            reference_number=reference_number,
            qty_in=Decimal(str(qty_in)).quantize(Decimal("0.0001")),
            qty_out=Decimal(str(qty_out)).quantize(Decimal("0.0001")),
            balance_physical=inv.physical_stock,
            balance_reserved=inv.reserved_stock,
            balance_available=inv.available_stock,
            notes=notes,
        )
        session.add(mutation)
        return mutation

    @staticmethod
    def reserve_stock(session: Session, product_id: int, qty_in_base: Decimal) -> Inventory:
        """
        Reserve stock when an order is placed.
        Increases reserved_stock. available_stock drops. physical_stock remains unchanged.
        """
        inv = InventoryService.get_inventory(session, product_id)
        if not isinstance(qty_in_base, Decimal):
            qty_in_base = Decimal(str(qty_in_base))

        if inv.available_stock < qty_in_base:
            product = session.get(Product, product_id)
            prod_name = product.name if product else f"ID {product_id}"
            unit = product.base_unit if product else "Unit"
            raise InsufficientStockError(
                product_name=prod_name,
                available=inv.available_stock,
                requested=qty_in_base,
                unit=unit,
            )

        inv.reserved_stock = (inv.reserved_stock + qty_in_base).quantize(Decimal("0.0001"))
        return inv

    @staticmethod
    def fulfill_reserved_stock(
        session: Session,
        product_id: int,
        qty_in_base: Decimal,
        reference_type: str | None = "DO",
        reference_number: str | None = None,
        notes: str | None = None,
    ) -> Inventory:
        """
        Fulfill stock upon delivery / handover (Surat Jalan delivered or Bawa Langsung).
        Both physical_stock and reserved_stock decrease by qty_in_base.
        available_stock remains constant.
        Records entry in Kartu Stok.
        """
        inv = InventoryService.get_inventory(session, product_id)
        if not isinstance(qty_in_base, Decimal):
            qty_in_base = Decimal(str(qty_in_base))

        inv.physical_stock = (inv.physical_stock - qty_in_base).quantize(Decimal("0.0001"))
        inv.reserved_stock = (inv.reserved_stock - qty_in_base).quantize(Decimal("0.0001"))

        if inv.reserved_stock < 0:
            inv.reserved_stock = Decimal("0.0000")
        if inv.physical_stock < 0:
            inv.physical_stock = Decimal("0.0000")

        # Record Kartu Stok mutation
        mtype = "OUT_DELIVERY" if reference_type == "DO" else "OUT_DIRECT_SALE"
        InventoryService.record_mutation(
            session=session,
            product_id=product_id,
            mutation_type=mtype,
            qty_in=Decimal("0.0000"),
            qty_out=qty_in_base,
            reference_type=reference_type,
            reference_number=reference_number,
            notes=notes or "Pengiriman barang ke pelanggan",
        )

        return inv

    @staticmethod
    def release_reserved_stock(session: Session, product_id: int, qty_in_base: Decimal) -> Inventory:
        """
        Release reserved stock (e.g. transaction cancellation).
        reserved_stock decreases, physical_stock unchanged. available_stock increases.
        """
        inv = InventoryService.get_inventory(session, product_id)
        if not isinstance(qty_in_base, Decimal):
            qty_in_base = Decimal(str(qty_in_base))

        inv.reserved_stock = max(Decimal("0.0000"), (inv.reserved_stock - qty_in_base).quantize(Decimal("0.0001")))
        return inv

    @staticmethod
    def restock(
        session: Session,
        product_id: int,
        qty_in_base: Decimal,
        reference_number: str | None = None,
        notes: str | None = None,
    ) -> Inventory:
        """Add stock from purchase order or supplier and record in Kartu Stok."""
        inv = InventoryService.get_inventory(session, product_id)
        if not isinstance(qty_in_base, Decimal):
            qty_in_base = Decimal(str(qty_in_base))

        inv.physical_stock = (inv.physical_stock + qty_in_base).quantize(Decimal("0.0001"))

        InventoryService.record_mutation(
            session=session,
            product_id=product_id,
            mutation_type="IN_PURCHASE",
            qty_in=qty_in_base,
            qty_out=Decimal("0.0000"),
            reference_type="PO",
            reference_number=reference_number,
            notes=notes or "Penerimaan barang dari supplier",
        )

        return inv

    @staticmethod
    def get_stock_card(session: Session, product_id: int, limit: int = 200) -> list[StockMutation]:
        """Fetch chronological stock card mutations for a product."""
        stmt = (
            select(StockMutation)
            .where(StockMutation.product_id == product_id)
            .order_by(StockMutation.created_at.asc(), StockMutation.id.asc())
            .limit(limit)
        )
        return list(session.scalars(stmt).all())
