"""Delivery order model for shipment tracking."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.delivery_order_item import DeliveryOrderItem
    from app.models.transaction import Transaction


class DeliveryOrder(Base):
    """
    Delivery order linked to a transaction.

    Statuses: 'pending', 'shipped', 'delivered', 'cancelled'.
    Tracks driver, vehicle, and delivery address information.
    """

    __tablename__ = "delivery_orders"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    do_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    transaction_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("transactions.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), default="pending")
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_info: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now()
    )

    # Relationships
    transaction: Mapped[Transaction] = relationship(
        "Transaction", back_populates="delivery_orders"
    )
    items: Mapped[list[DeliveryOrderItem]] = relationship(
        "DeliveryOrderItem", back_populates="delivery_order"
    )

    def __repr__(self) -> str:
        return (
            f"<DeliveryOrder(id={self.id}, do='{self.do_number}', "
            f"status='{self.status}')>"
        )
