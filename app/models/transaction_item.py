"""Transaction item model for line items in a sale."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.delivery_order_item import DeliveryOrderItem
    from app.models.product_unit import ProductUnit
    from app.models.transaction import Transaction


class TransactionItem(Base):
    """
    Line item in a transaction.

    Stores the quantity in both the sold unit and the base unit for
    accurate inventory tracking and delivery management.
    """

    __tablename__ = "transaction_items"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    transaction_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("transactions.id"), nullable=False
    )
    product_unit_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("product_units.id"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    qty_in_base_unit: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    qty_delivered: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), default=0, nullable=False
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    transaction: Mapped[Transaction] = relationship(
        "Transaction", back_populates="items"
    )
    product_unit: Mapped[ProductUnit] = relationship("ProductUnit")
    delivery_order_items: Mapped[list[DeliveryOrderItem]] = relationship(
        "DeliveryOrderItem", back_populates="transaction_item"
    )

    def __repr__(self) -> str:
        return (
            f"<TransactionItem(id={self.id}, qty={self.quantity}, "
            f"subtotal={self.subtotal})>"
        )
