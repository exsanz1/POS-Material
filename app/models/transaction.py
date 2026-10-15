"""Transaction model for sales records."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.delivery_order import DeliveryOrder
    from app.models.payment import Payment
    from app.models.transaction_item import TransactionItem


class Transaction(Base):
    """
    Sales transaction record.

    Payment statuses: 'paid', 'dp' (down payment), 'tempo' (credit).
    Delivery statuses: 'taken' (picked up), 'partial', 'pending'.
    NULL customer_id indicates a walk-in customer.
    """

    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    customer_id: Mapped[int | None] = mapped_column(
        BigInt, ForeignKey("customers.id"), nullable=True
    )
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="tempo"
    )
    delivery_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=0, nullable=False
    )
    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=0, nullable=False
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now()
    )

    # Relationships
    customer: Mapped[Customer | None] = relationship(
        "Customer", back_populates="transactions"
    )
    items: Mapped[list[TransactionItem]] = relationship(
        "TransactionItem", back_populates="transaction"
    )
    payments: Mapped[list[Payment]] = relationship(
        "Payment", back_populates="transaction"
    )
    delivery_orders: Mapped[list[DeliveryOrder]] = relationship(
        "DeliveryOrder", back_populates="transaction"
    )

    def __repr__(self) -> str:
        return (
            f"<Transaction(id={self.id}, invoice='{self.invoice_number}', "
            f"total={self.total_amount})>"
        )
