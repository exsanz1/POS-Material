"""Customer model for buyer records."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.transaction import Transaction


class Customer(Base):
    """
    Customer record with price tier classification and credit limits.

    Price tiers: 'retail', 'contractor', 'wholesale'.
    Walk-in customers are represented as NULL customer_id on transactions.
    """

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    price_tier: Mapped[str] = mapped_column(String(20), default="retail")
    credit_limit: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=0, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now()
    )

    # Relationships
    transactions: Mapped[list[Transaction]] = relationship(
        "Transaction", back_populates="customer"
    )

    def __repr__(self) -> str:
        return (
            f"<Customer(id={self.id}, name='{self.name}', "
            f"tier='{self.price_tier}')>"
        )
