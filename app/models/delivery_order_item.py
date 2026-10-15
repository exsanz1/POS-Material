"""Delivery order item model for items in a delivery."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.delivery_order import DeliveryOrder
    from app.models.product_unit import ProductUnit
    from app.models.transaction_item import TransactionItem


class DeliveryOrderItem(Base):
    """
    Line item in a delivery order.

    Links back to the original transaction item to track partial deliveries.
    """

    __tablename__ = "delivery_order_items"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    delivery_order_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("delivery_orders.id"), nullable=False
    )
    transaction_item_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("transaction_items.id"), nullable=False
    )
    product_unit_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("product_units.id"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    qty_in_base_unit: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    delivery_order: Mapped[DeliveryOrder] = relationship(
        "DeliveryOrder", back_populates="items"
    )
    transaction_item: Mapped[TransactionItem] = relationship(
        "TransactionItem", back_populates="delivery_order_items"
    )
    product_unit: Mapped[ProductUnit] = relationship("ProductUnit")

    def __repr__(self) -> str:
        return (
            f"<DeliveryOrderItem(id={self.id}, qty={self.quantity})>"
        )
