"""Product unit model for multi-unit pricing and conversions."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.wholesale_price import WholesalePrice


class ProductUnit(Base):
    """
    Unit variant for a product with conversion factor and tiered prices.

    Example: Semen can be sold per Sak (base) or per Dus (10 Sak).
    Each unit has its own retail, contractor, and wholesale price.
    """

    __tablename__ = "product_units"
    __table_args__ = (
        UniqueConstraint("product_id", "unit_name", name="uq_product_unit"),
    )

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("products.id"), nullable=False
    )
    unit_name: Mapped[str] = mapped_column(String(30), nullable=False)
    conversion_factor: Mapped[Decimal] = mapped_column(
        Numeric(15, 4), nullable=False
    )
    barcode: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True
    )
    price_retail: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    price_contractor: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    price_wholesale: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), nullable=False, default=0
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now()
    )

    # Relationships
    product: Mapped[Product] = relationship(
        "Product", back_populates="product_units"
    )
    wholesale_prices: Mapped[list[WholesalePrice]] = relationship(
        "WholesalePrice", back_populates="product_unit"
    )

    def __repr__(self) -> str:
        return (
            f"<ProductUnit(id={self.id}, unit='{self.unit_name}', "
            f"factor={self.conversion_factor})>"
        )
