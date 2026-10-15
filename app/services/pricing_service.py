"""Pricing service for tiered pricing and automated wholesale discounts."""

from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.exceptions import EntityNotFoundError
from app.models.product_unit import ProductUnit
from app.models.wholesale_price import WholesalePrice


@dataclass
class PriceCalculationResult:
    product_unit_id: int
    unit_name: str
    quantity: Decimal
    unit_price: Decimal
    discount_per_unit: Decimal
    subtotal: Decimal
    qty_in_base_unit: Decimal
    applied_rule: str  # e.g. "tier:retail", "tier:contractor", "wholesale_qty:>=50"


class PricingService:
    """Service to compute unit prices and subtotals based on tiers and volume."""

    @staticmethod
    def calculate_item_price(
        session: Session,
        product_unit_id: int,
        quantity: Decimal,
        customer_tier: str | None = "retail",
    ) -> PriceCalculationResult:
        """
        Calculate price for a product unit and quantity given a customer tier.

        Logic:
        1. Base price determined by customer tier (retail, contractor, wholesale).
        2. Automatic wholesale rules checked based on quantity. If quantity meets min_qty,
           the lowest eligible wholesale price is evaluated.
        3. All calculations use Decimal with 2 decimal places precision for currency.
        """
        unit = session.get(ProductUnit, product_unit_id)
        if not unit:
            raise EntityNotFoundError(f"ProductUnit id={product_unit_id} tidak ditemukan.")

        if not isinstance(quantity, Decimal):
            quantity = Decimal(str(quantity))

        # 1. Determine base price by customer tier
        tier = (customer_tier or "retail").lower()
        if tier == "contractor":
            base_price = unit.price_contractor
            rule_applied = "tier:contractor"
        elif tier == "wholesale":
            base_price = unit.price_wholesale
            rule_applied = "tier:wholesale"
        else:
            base_price = unit.price_retail
            rule_applied = "tier:retail"

        effective_price = base_price

        # 2. Check automated wholesale rules based on min_qty
        # Find wholesale prices where min_qty <= quantity, ordered by min_qty desc
        stmt = (
            select(WholesalePrice)
            .where(
                WholesalePrice.product_unit_id == product_unit_id,
                WholesalePrice.min_qty <= quantity,
            )
            .order_by(WholesalePrice.min_qty.desc())
        )
        wholesale_rule = session.scalars(stmt).first()

        if wholesale_rule and wholesale_rule.price <= effective_price:
            effective_price = wholesale_rule.price
            rule_applied = f"wholesale_qty:>={wholesale_rule.min_qty}"

        # 3. Calculate conversions and subtotal
        qty_in_base = (quantity * unit.conversion_factor).quantize(Decimal("0.0001"))
        subtotal = (quantity * effective_price).quantize(Decimal("0.01"))
        discount_per_unit = max(Decimal(0), (base_price - effective_price)).quantize(Decimal("0.01"))

        return PriceCalculationResult(
            product_unit_id=unit.id,
            unit_name=unit.unit_name,
            quantity=quantity,
            unit_price=effective_price.quantize(Decimal("0.01")),
            discount_per_unit=discount_per_unit,
            subtotal=subtotal,
            qty_in_base_unit=qty_in_base,
            applied_rule=rule_applied,
        )

