"""StockMutation model for Kartu Stok (Stock Card)."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.product import Product


class StockMutation(Base):
    """
    Stock movement ledger record for Kartu Stok.
    All quantities are recorded in the product's base unit for audit trail.
    """

    __tablename__ = "stock_mutations"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("products.id"), nullable=False
    )
    mutation_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # IN_PURCHASE, OUT_DELIVERY, OUT_DIRECT_SALE, ADJUSTMENT_PLUS, ADJUSTMENT_MINUS, INITIAL
    reference_type: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )  # DO, INV, OPNAME, PO, MANUAL
    reference_number: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # DO-20261015-0001, INV-20261015-0001
    qty_in: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), default=0, nullable=False
    )
    qty_out: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), default=0, nullable=False
    )
    balance_physical: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), nullable=False
    )
    balance_reserved: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), nullable=False
    )
    balance_available: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationship
    product: Mapped[Product] = relationship("Product")

    def __repr__(self) -> str:
        return (
            f"<StockMutation(id={self.id}, product_id={self.product_id}, "
            f"type='{self.mutation_type}', in={self.qty_in}, out={self.qty_out})>"
        )
