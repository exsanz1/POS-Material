"""Inventory model for stock tracking."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.product import Product


class Inventory(Base):
    """
    Stock record for a product (one-to-one with Product).

    Tracks physical stock, reserved stock, and low stock threshold.
    All quantities are in the product's base_unit.
    """

    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("products.id"), unique=True, nullable=False
    )
    physical_stock: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), default=0, nullable=False
    )
    reserved_stock: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), default=0, nullable=False
    )
    low_stock_threshold: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), default=0, nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now()
    )

    # Relationships
    product: Mapped[Product] = relationship("Product", back_populates="inventory")

    @hybrid_property
    def available_stock(self) -> Decimal:
        """Available stock = physical stock minus reserved stock."""
        return self.physical_stock - self.reserved_stock

    def __repr__(self) -> str:
        return (
            f"<Inventory(product_id={self.product_id}, "
            f"physical={self.physical_stock}, available={self.available_stock})>"
        )
