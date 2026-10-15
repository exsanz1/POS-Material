"""Custom exceptions for POS Material business logic."""

from decimal import Decimal


class POSException(Exception):
    """Base exception for POS application."""


class EntityNotFoundError(POSException):
    """Raised when a requested entity (Product, Transaction, etc.) is not found."""


class InsufficientStockError(POSException):
    """Raised when available stock is insufficient for a sale or reservation."""
    def __init__(self, product_name: str, available: Decimal, requested: Decimal, unit: str):
        super().__init__(
            f"Stok tidak mencukupi untuk '{product_name}'. "
            f"Tersedia: {available} {unit}, Diminta: {requested} {unit}"
        )
        self.product_name = product_name
        self.available = available
        self.requested = requested
        self.unit = unit


class DeliveryQuantityExceededError(POSException):
    """Raised when Surat Jalan quantity exceeds remaining undelivered quantity."""
    def __init__(self, item_name: str, remaining: Decimal, requested: Decimal, unit: str):
        super().__init__(
            f"Jumlah pengiriman melebihi sisa pesanan untuk '{item_name}'. "
            f"Sisa belum dikirim: {remaining} {unit}, Dicoba kirim: {requested} {unit}"
        )
        self.item_name = item_name
        self.remaining = remaining
        self.requested = requested
        self.unit = unit


class InvalidPaymentError(POSException):
    """Raised when a payment operation is invalid."""


class CreditLimitExceededError(POSException):
    """Raised when customer receivables exceed credit limit."""
    def __init__(self, customer_name: str, credit_limit: Decimal, current_debt: Decimal, new_debt: Decimal):
        total = current_debt + new_debt
        super().__init__(
            f"Limit kredit terlampaui untuk '{customer_name}'. "
            f"Limit: Rp {credit_limit:,.0f}, Piutang berjalan: Rp {current_debt:,.0f}, "
            f"Hutang baru: Rp {new_debt:,.0f}. Total Rp {total:,.0f} melebihi plafon kredit!"
        )
        self.customer_name = customer_name
        self.credit_limit = credit_limit
        self.current_debt = current_debt
        self.new_debt = new_debt


class InvalidStateError(POSException):
    """Raised when an operation is invalid for current entity state."""

