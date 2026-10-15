"""Product model for building materials."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, BigInt

if TYPE_CHECKING:
    from app.models.category import Category
    from app.models.inventory import Inventory
    from app.models.product_unit import ProductUnit


class Product(Base):
    """Building material product (e.g. Semen Tiga Roda 50kg, Besi Beton 10mm)."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInt, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        BigInt, ForeignKey("categories.id"), nullable=False
    )
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_unit: Mapped[str] = mapped_column(String(30), nullable=False)
    rack_location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, onupdate=func.now()
    )

    # Relationships
    category: Mapped[Category] = relationship("Category", back_populates="products")
    product_units: Mapped[list[ProductUnit]] = relationship(
        "ProductUnit", back_populates="product"
    )
    inventory: Mapped[Inventory | None] = relationship(
        "Inventory", back_populates="product", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, sku='{self.sku}', name='{self.name}')>"
