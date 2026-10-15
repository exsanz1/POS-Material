"""Transaction service orchestrating checkout, stock reservation, payments, and delivery."""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.exceptions import (
    CreditLimitExceededError,
    EntityNotFoundError,
)
from app.models.customer import Customer
from app.models.product_unit import ProductUnit
from app.models.transaction import Transaction
from app.models.transaction_item import TransactionItem
from app.services.delivery_service import DeliveryService
from app.services.inventory_service import InventoryService
from app.services.payment_service import PaymentService
from app.services.pricing_service import PriceCalculationResult, PricingService


@dataclass
class ItemSplit:
    product_unit: ProductUnit
    quantity: Decimal
    price_res: PriceCalculationResult
    take_now: Decimal
    ship_later: Decimal
    tx_item: TransactionItem | None = None



def terbilang(n: float | Decimal) -> str:
    """Convert number to Indonesian words (Terbilang)."""
    n_int = int(Decimal(str(n)).to_integral_value())
    if n_int == 0:
        return "Nol Rupiah"

    satuan = [
        "", "Satu", "Dua", "Tiga", "Empat", "Lima",
        "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas",
    ]

    def bilang(x: int) -> str:
        if x < 12:
            return satuan[x]
        elif x < 20:
            return bilang(x - 10) + " Belas"
        elif x < 100:
            return bilang(x // 10) + " Puluh " + bilang(x % 10)
        elif x < 200:
            return "Seratus " + bilang(x - 100)
        elif x < 1000:
            return bilang(x // 100) + " Ratus " + bilang(x % 100)
        elif x < 2000:
            return "Seribu " + bilang(x - 1000)
        elif x < 1000000:
            return bilang(x // 1000) + " Ribu " + bilang(x % 1000)
        elif x < 1000000000:
            return bilang(x // 1000000) + " Juta " + bilang(x % 1000000)
        elif x < 1000000000000:
            return bilang(x // 1000000000) + " Miliar " + bilang(x % 1000000000)
        else:
            return bilang(x // 1000000000000) + " Triliun " + bilang(x % 1000000000000)

    res = " ".join(bilang(n_int).split())
    return f"{res} Rupiah"


class TransactionService:
    """Manages the full checkout flow from cart items to invoice, payments, and deliveries."""

    @staticmethod
    def generate_invoice_number(session: Session) -> str:
        """Generate formatted invoice number INV-YYYYMMDD-XXXX."""
        today_prefix = f"INV-{datetime.now().strftime('%Y%m%d')}-"
        count_stmt = select(func.count(Transaction.id)).where(
            Transaction.invoice_number.like(f"{today_prefix}%")
        )
        seq = (session.scalar(count_stmt) or 0) + 1
        return f"{today_prefix}{seq:04d}"

    @staticmethod
    def get_customer_outstanding(session: Session, customer_id: int) -> Decimal:
        """Calculate total unpaid or partially paid receivables for a customer."""
        stmt = select(
            func.coalesce(func.sum(Transaction.total_amount - Transaction.paid_amount), 0)
        ).where(
            Transaction.customer_id == customer_id,
            Transaction.payment_status != "paid",
        )
        return Decimal(str(session.scalar(stmt) or 0))

    @staticmethod
    def create_sale(
        session: Session,
        items: list[dict[str, Any]],
        customer_id: int | None = None,
        delivery_mode: str = "taken",  # 'taken' (Bawa Langsung), 'partial', 'pending'
        payment_mode: str = "tempo",   # 'paid', 'dp', 'tempo'
        initial_payment: dict[str, Any] | None = None,
        due_date: Any = None,
        delivery_address: str | None = None,
        driver_name: str | None = None,
        vehicle_info: str | None = None,
        delivery_notes: str | None = None,
        auto_create_do: bool = False,
        notes: str | None = None,
    ) -> Transaction:
        """
        Create a new sales transaction with multi-tier pricing, customer credit validation,
        and split delivery handling (bawa sekarang vs kirim armada menyusul).
        """
        if not items:
            raise ValueError("Transaksi harus memiliki minimal 1 item produk.")

        # Convert due_date to date object if passed as string, or default to 30 days for tempo/dp
        parsed_due_date: date | None = None
        if due_date:
            if isinstance(due_date, str):
                parsed_due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
            elif isinstance(due_date, (datetime, date)):
                parsed_due_date = due_date if isinstance(due_date, date) else due_date.date()
        elif payment_mode in ("dp", "tempo"):
            from datetime import timedelta
            parsed_due_date = date.today() + timedelta(days=30)

        # Validate customer requirement for DP or Tempo
        customer = None
        customer_tier = "retail"
        if customer_id:
            customer = session.get(Customer, customer_id)
            if not customer:
                raise EntityNotFoundError(f"Customer id={customer_id} tidak ditemukan.")
            customer_tier = customer.price_tier or "retail"

        # Customer requirement check will happen after grand_total & payment_mode inference

        # Compute initial line item calculations & reservations
        grand_total = Decimal("0.00")
        item_splits: list[ItemSplit] = []

        for item_data in items:
            p_unit_id = item_data["product_unit_id"]
            qty = Decimal(str(item_data["quantity"]))
            if qty <= Decimal(0):
                raise ValueError("Kuantitas barang harus lebih besar dari 0.")

            p_unit = session.get(ProductUnit, p_unit_id)
            if not p_unit:
                raise EntityNotFoundError(f"ProductUnit id={p_unit_id} tidak ditemukan.")

            # Calculate price with tiered & wholesale rules
            price_res = PricingService.calculate_item_price(
                session=session,
                product_unit_id=p_unit_id,
                quantity=qty,
                customer_tier=customer_tier,
            )

            # Check and reserve stock (always in base unit)
            InventoryService.reserve_stock(
                session=session,
                product_id=p_unit.product_id,
                qty_in_base=price_res.qty_in_base_unit,
            )

            # Determine split quantities (take_now vs ship_later)
            if delivery_mode == "taken":
                take_now = qty
                ship_later = Decimal(0)
            else:
                take_now = Decimal(str(item_data.get("take_now_qty", 0) or 0))
                ship_later = Decimal(str(item_data.get("ship_later_qty", 0) or 0))
                if take_now == Decimal(0) and ship_later == Decimal(0):
                    ship_later = qty
                elif (take_now + ship_later) != qty:
                    raise ValueError(
                        f"Jumlah bawa sekarang ({take_now}) + kirim ({ship_later}) "
                        f"harus sama dengan total kuantitas ({qty}) untuk {p_unit.product.name}."
                    )

            item_splits.append(
                ItemSplit(
                    product_unit=p_unit,
                    quantity=qty,
                    price_res=price_res,
                    take_now=take_now,
                    ship_later=ship_later,
                )
            )
            grand_total += price_res.subtotal

        grand_total = grand_total.quantize(Decimal("0.01"))

        # Payment validation and customer credit limit check
        init_amount = Decimal(str(initial_payment.get("amount", 0))) if initial_payment else Decimal("0.00")
        if init_amount < Decimal(0):
            raise ValueError("Nominal pembayaran tidak boleh negatif.")

        # Infer 'paid' status if initial payment covers or exceeds grand total and mode is not explicitly 'dp'
        if initial_payment and init_amount >= grand_total and payment_mode != "dp":
            payment_mode = "paid"

        if payment_mode in ("dp", "tempo") and not customer:
            raise ValueError("Pelanggan/Kontraktor wajib dipilih untuk pembayaran DP atau Tempo.")

        if payment_mode == "paid":
            if init_amount < grand_total:
                raise ValueError(
                    f"Pembayaran Lunas membutuhkan nominal pembayaran minimal Rp {grand_total:,.2f}."
                )
            new_debt = Decimal("0.00")
        elif payment_mode == "dp":
            if init_amount <= Decimal(0):
                raise ValueError("Pembayaran DP (Uang Muka) membutuhkan nominal pembayaran awal > 0.")
            new_debt = max(Decimal("0.00"), grand_total - init_amount)
        elif payment_mode == "tempo":
            new_debt = max(Decimal("0.00"), grand_total - init_amount)
        else:
            raise ValueError(f"Mode pembayaran '{payment_mode}' tidak valid.")

        if new_debt > Decimal(0) and customer:
            current_debt = TransactionService.get_customer_outstanding(session, customer.id)
            credit_limit = customer.credit_limit or Decimal("0.00")
            if credit_limit <= Decimal(0):
                raise CreditLimitExceededError(customer.name, credit_limit, current_debt, new_debt)
            if (current_debt + new_debt) > credit_limit:
                raise CreditLimitExceededError(customer.name, credit_limit, current_debt, new_debt)

        # Create Transaction record
        invoice_number = TransactionService.generate_invoice_number(session)
        tx = Transaction(
            invoice_number=invoice_number,
            customer_id=customer.id if customer else None,
            payment_status=payment_mode,
            delivery_status="pending",
            total_amount=grand_total,
            paid_amount=Decimal("0.00"),
            due_date=parsed_due_date,
            notes=notes,
        )
        session.add(tx)
        session.flush()

        # Create Transaction Items
        created_line_items = []
        for split in item_splits:
            p_unit = split.product_unit
            price_res = split.price_res
            qty = split.quantity

            tx_item = TransactionItem(
                transaction_id=tx.id,
                product_unit_id=p_unit.id,
                quantity=qty,
                unit_price=price_res.unit_price,
                discount=price_res.discount_per_unit,
                subtotal=price_res.subtotal,
                qty_in_base_unit=price_res.qty_in_base_unit,
                qty_delivered=Decimal("0.0000"),
            )
            session.add(tx_item)
            session.flush()
            split.tx_item = tx_item
            created_line_items.append(tx_item)

        # Handle initial payment
        if init_amount > Decimal(0) and initial_payment is not None:
            method = initial_payment.get("method", "cash") or "cash"
            actual_payment = min(init_amount, grand_total) if method == "cash" else init_amount
            PaymentService.add_payment(
                session=session,
                transaction_id=tx.id,
                amount=actual_payment,
                method=method,
                reference=initial_payment.get("reference"),
                notes=initial_payment.get("notes", f"Pembayaran awal saat checkout ({payment_mode.upper()})"),
            )
        else:
            tx.payment_status = "tempo"

        session.flush()

        # Handle delivery splits:
        # A. Fulfill immediate "Bawa Langsung" portions
        items_take_now = [
            {"transaction_item_id": split.tx_item.id, "quantity": split.take_now}
            for split in item_splits
            if split.take_now > Decimal(0) and split.tx_item is not None
        ]
        if items_take_now:
            DeliveryService.create_delivery_order(
                session=session,
                transaction_id=tx.id,
                items_to_deliver=items_take_now,
                notes="Bawa Langsung saat transaksi",
                auto_fulfill=True,
            )

        # B. Generate pending Delivery Order (Surat Jalan) for "Kirim Armada" portions
        if auto_create_do:
            items_ship_later = [
                {"transaction_item_id": split.tx_item.id, "quantity": split.ship_later}
                for split in item_splits
                if split.ship_later > Decimal(0) and split.tx_item is not None
            ]
            if items_ship_later:
                DeliveryService.create_delivery_order(
                    session=session,
                    transaction_id=tx.id,
                    items_to_deliver=items_ship_later,
                    delivery_address=delivery_address or (customer.address if customer else None),
                    driver_name=driver_name,
                    vehicle_info=vehicle_info,
                    notes=delivery_notes or "Kirim armada gudang",
                    auto_fulfill=False,
                )

        session.flush()

        # Recalculate transaction final delivery status
        all_completed = all(i.qty_delivered >= i.qty_in_base_unit for i in created_line_items)
        any_delivered = any(i.qty_delivered > Decimal(0) for i in created_line_items)

        if all_completed:
            tx.delivery_status = "taken"
        elif any_delivered:
            tx.delivery_status = "partial"
        else:
            tx.delivery_status = "pending"

        session.flush()
        return tx

    @staticmethod
    def get_transaction_detail(session: Session, identifier: int | str) -> dict[str, Any]:
        """
        Fetch full transaction detail including items, payments, delivery orders,
        and customer data formatted for receipt and dot matrix invoice/DO printing.
        """
        if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
            tx = session.get(Transaction, int(identifier))
        else:
            tx = session.scalars(
                select(Transaction).where(Transaction.invoice_number == str(identifier))
            ).first()

        if not tx:
            raise EntityNotFoundError(f"Transaksi '{identifier}' tidak ditemukan.")

        customer_info = None
        if tx.customer:
            c = tx.customer
            current_debt = TransactionService.get_customer_outstanding(session, c.id)
            customer_info = {
                "id": c.id,
                "name": c.name,
                "phone": c.phone or "-",
                "address": c.address or "-",
                "price_tier": c.price_tier,
                "credit_limit": float(c.credit_limit),
                "current_debt": float(current_debt),
                "remaining_credit": float(c.credit_limit - current_debt),
            }

        items_data = []
        for it in tx.items:
            unit = it.product_unit
            product = unit.product
            qty_remaining = float(it.qty_in_base_unit - it.qty_delivered)
            items_data.append({
                "id": it.id,
                "product_id": product.id,
                "sku": product.sku,
                "product_name": product.name,
                "rack_location": product.rack_location or "Gudang",
                "base_unit": product.base_unit,
                "unit_name": unit.unit_name,
                "conversion_factor": float(unit.conversion_factor),
                "quantity": float(it.quantity),
                "unit_price": float(it.unit_price),
                "discount": float(it.discount),
                "subtotal": float(it.subtotal),
                "qty_in_base_unit": float(it.qty_in_base_unit),
                "qty_delivered": float(it.qty_delivered),
                "qty_remaining": qty_remaining,
            })

        payments_data = [
            {
                "id": p.id,
                "amount": float(p.amount),
                "method": p.method,
                "reference": p.reference or "-",
                "notes": p.notes or "-",
                "paid_at": p.paid_at.strftime("%d/%m/%Y %H:%M") if p.paid_at else "-",
            }
            for p in tx.payments
        ]

        delivery_orders_data = []
        for do in tx.delivery_orders:
            do_items = [
                {
                    "id": doi.id,
                    "product_name": doi.product_unit.product.name,
                    "sku": doi.product_unit.product.sku,
                    "unit_name": doi.product_unit.unit_name,
                    "base_unit": doi.product_unit.product.base_unit,
                    "quantity": float(doi.quantity),
                    "qty_in_base_unit": float(doi.qty_in_base_unit),
                }
                for doi in do.items
            ]
            delivery_orders_data.append({
                "id": do.id,
                "do_number": do.do_number,
                "status": do.status,
                "delivery_address": do.delivery_address or "-",
                "driver_name": do.driver_name or "-",
                "vehicle_info": do.vehicle_info or "-",
                "notes": do.notes or "-",
                "created_at": do.created_at.strftime("%d/%m/%Y %H:%M") if do.created_at else "-",
                "items": do_items,
            })

        remaining_amount = max(0.0, float(tx.total_amount - tx.paid_amount))

        return {
            "id": tx.id,
            "invoice_number": tx.invoice_number,
            "created_at": tx.created_at.strftime("%d/%m/%Y %H:%M") if tx.created_at else "-",
            "due_date": tx.due_date.strftime("%d/%m/%Y") if tx.due_date else None,
            "due_date_iso": tx.due_date.isoformat() if tx.due_date else None,
            "payment_status": tx.payment_status,
            "delivery_status": tx.delivery_status,
            "total_amount": float(tx.total_amount),
            "paid_amount": float(tx.paid_amount),
            "remaining_amount": remaining_amount,
            "terbilang": terbilang(tx.total_amount),
            "notes": tx.notes or "-",
            "customer": customer_info,
            "items": items_data,
            "payments": payments_data,
            "delivery_orders": delivery_orders_data,
        }

