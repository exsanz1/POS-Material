"""Payment model for recording payments against transactions."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.transaction import Transaction


class Payment(Base):
    """
    Payment record for a transaction.

    Methods: 'cash', 'transfer', 'qris', 'edc'.
    A transaction may have multiple payments (e.g. DP then final payment).
    """

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    transaction_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("transactions.id"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(30), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    transaction: Mapped[Transaction] = relationship(
        "Transaction", back_populates="payments"
    )

    def __repr__(self) -> str:
        return (
            f"<Payment(id={self.id}, amount={self.amount}, "
            f"method='{self.method}')>"
        )
