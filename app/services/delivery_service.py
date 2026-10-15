"""Delivery order (Surat Jalan) service supporting partial deliveries."""

from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.exceptions import (
    DeliveryQuantityExceededError,
    EntityNotFoundError,
    InvalidStateError,
)
from app.models.delivery_order import DeliveryOrder
from app.models.delivery_order_item import DeliveryOrderItem
from app.models.transaction import Transaction
from app.models.transaction_item import TransactionItem
from app.services.inventory_service import InventoryService


class DeliveryService:
    """Manages Delivery Orders (Surat Jalan) and partial shipment fulfillment."""

    @staticmethod
    def generate_do_number(session: Session) -> str:
        """Generate formatted DO number DO-YYYYMMDD-XXXX."""
        today_prefix = f"DO-{datetime.now().strftime('%Y%m%d')}-"
        count_stmt = select(func.count(DeliveryOrder.id)).where(
            DeliveryOrder.do_number.like(f"{today_prefix}%")
        )
        seq = (session.scalar(count_stmt) or 0) + 1
        return f"{today_prefix}{seq:04d}"

    @staticmethod
    def create_delivery_order(
        session: Session,
        transaction_id: int,
        items_to_deliver: list[dict[str, Any]],
        delivery_address: str | None = None,
        driver_name: str | None = None,
        vehicle_info: str | None = None,
        notes: str | None = None,
        auto_fulfill: bool = False,
    ) -> DeliveryOrder:
        """
        Create a new Surat Jalan (Delivery Order) for partial or full delivery.

        items_to_deliver is a list of dicts:
        [
            {"transaction_item_id": 1, "quantity": Decimal("40.0000")}
        ]
        """
        tx = session.get(Transaction, transaction_id)
        if not tx:
            raise EntityNotFoundError(f"Transaksi id={transaction_id} tidak ditemukan.")

        if not items_to_deliver:
            raise ValueError("Surat Jalan harus memiliki minimal 1 item untuk dikirim.")

        do_number = DeliveryService.generate_do_number(session)
        do = DeliveryOrder(
            do_number=do_number,
            transaction_id=tx.id,
            status="pending",
            delivery_address=delivery_address or (tx.customer.address if tx.customer else None),
            driver_name=driver_name,
            vehicle_info=vehicle_info,
            notes=notes,
        )
        session.add(do)
        session.flush()  # to obtain do.id

        for item_req in items_to_deliver:
            tx_item_id = item_req["transaction_item_id"]
            qty = Decimal(str(item_req["quantity"]))
            if qty <= 0:
                continue

            tx_item = session.get(TransactionItem, tx_item_id)
            if not tx_item or tx_item.transaction_id != tx.id:
                raise EntityNotFoundError(
                    f"Item transaksi id={tx_item_id} tidak valid untuk transaksi {tx.invoice_number}."
                )

            # Convert to base unit
            unit = tx_item.product_unit
            qty_in_base = (qty * unit.conversion_factor).quantize(Decimal("0.0001"))

            remaining_base = tx_item.qty_in_base_unit - tx_item.qty_delivered
            if qty_in_base > remaining_base:
                prod_name = unit.product.name if unit.product else "Produk"
                raise DeliveryQuantityExceededError(
                    item_name=f"{prod_name} ({unit.unit_name})",
                    remaining=remaining_base,
                    requested=qty_in_base,
                    unit=unit.product.base_unit if unit.product else "Unit",
                )

            do_item = DeliveryOrderItem(
                delivery_order_id=do.id,
                transaction_item_id=tx_item.id,
                product_unit_id=unit.id,
                quantity=qty,
                qty_in_base_unit=qty_in_base,
            )
            session.add(do_item)

        session.flush()

        if auto_fulfill:
            DeliveryService.fulfill_delivery_order(session, do.id)

        return do

    @staticmethod
    def fulfill_delivery_order(session: Session, delivery_order_id: int) -> DeliveryOrder:
        """
        Mark Surat Jalan as delivered.
        - Deducts physical_stock and reserved_stock for each item.
        - Updates qty_delivered on each transaction item.
        - Updates transaction delivery_status ('taken' if fully completed, 'partial' otherwise).
        """
        do = session.get(DeliveryOrder, delivery_order_id)
        if not do:
            raise EntityNotFoundError(f"Surat Jalan id={delivery_order_id} tidak ditemukan.")

        if do.status == "delivered":
            raise InvalidStateError("Surat Jalan ini sudah berstatus delivered.")

        tx = do.transaction

        for do_item in do.items:
            tx_item = do_item.transaction_item
            product_id = tx_item.product_unit.product_id

            # Update delivered count on transaction item
            tx_item.qty_delivered = (tx_item.qty_delivered + do_item.qty_in_base_unit).quantize(Decimal("0.0001"))

            # Deduct physical stock & reserved stock and record mutation
            InventoryService.fulfill_reserved_stock(
                session=session,
                product_id=product_id,
                qty_in_base=do_item.qty_in_base_unit,
                reference_type="DO",
                reference_number=do.do_number,
                notes=f"Kirim via Surat Jalan {do.do_number} (Supir: {do.driver_name or '-'})",
            )

        do.status = "delivered"
        do.delivered_at = datetime.now()

        # Recalculate transaction delivery status
        all_items = tx.items
        all_completed = all(i.qty_delivered >= i.qty_in_base_unit for i in all_items)
        any_delivered = any(i.qty_delivered > 0 for i in all_items)

        if all_completed:
            tx.delivery_status = "taken"
        elif any_delivered:
            tx.delivery_status = "partial"
        else:
            tx.delivery_status = "pending"

        return do
