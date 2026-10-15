"""Payment service for recording phased payments (DP, kasbon/tempo, pelunasan)."""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.exceptions import EntityNotFoundError, InvalidPaymentError
from app.models.payment import Payment
from app.models.transaction import Transaction


class PaymentService:
    """Handles payments, updates paid totals, and transitions payment statuses."""

    @staticmethod
    def add_payment(
        session: Session,
        transaction_id: int,
        amount: Decimal,
        method: str,
        reference: str | None = None,
        notes: str | None = None,
    ) -> Payment:
        """
        Record a payment for a transaction.
        Updates transaction.paid_amount and refreshes payment_status:
        - 'paid' if paid_amount >= total_amount
        - 'dp' if 0 < paid_amount < total_amount
        - 'tempo' if paid_amount == 0
        """
        tx = session.get(Transaction, transaction_id)
        if not tx:
            raise EntityNotFoundError(f"Transaksi id={transaction_id} tidak ditemukan.")

        if not isinstance(amount, Decimal):
            amount = Decimal(str(amount))

        if amount <= 0:
            raise InvalidPaymentError("Nominal pembayaran harus lebih besar dari 0.")

        payment = Payment(
            transaction_id=tx.id,
            amount=amount.quantize(Decimal("0.01")),
            method=method,
            reference=reference,
            notes=notes,
        )
        session.add(payment)

        # Update paid_amount
        tx.paid_amount = (tx.paid_amount + payment.amount).quantize(Decimal("0.01"))

        # Update payment_status
        if tx.paid_amount >= tx.total_amount:
            tx.payment_status = "paid"
        elif tx.paid_amount > 0:
            tx.payment_status = "dp"
        else:
            tx.payment_status = "tempo"

        return payment
