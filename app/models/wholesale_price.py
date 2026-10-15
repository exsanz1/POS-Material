"""Wholesale price rules for quantity-based discounts."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.product_unit import ProductUnit


class WholesalePrice(Base):
    """
    Quantity-based price tier for a product unit.

    Example: Buy >= 50 Sak Semen -> Rp 55.000/Sak,
             Buy >= 100 Sak Semen -> Rp 53.000/Sak.
    """

    __tablename__ = "wholesale_prices"
    __table_args__ = (
        UniqueConstraint(
            "product_unit_id", "min_qty", name="uq_wholesale_price_tier"
        ),
    )

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    product_unit_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("product_units.id"), nullable=False
    )
    min_qty: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now()
    )

    # Relationships
    product_unit: Mapped[ProductUnit] = relationship(
        "ProductUnit", back_populates="wholesale_prices"
    )

    def __repr__(self) -> str:
        return (
            f"<WholesalePrice(id={self.id}, min_qty={self.min_qty}, "
            f"price={self.price})>"
        )
