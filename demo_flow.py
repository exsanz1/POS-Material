"""Interactive simulation demonstrating full POS business logic in action."""

from decimal import Decimal
from app.database import SessionLocal
from app.models.customer import Customer
from app.models.product import Product
from app.models.product_unit import ProductUnit
from app.services import (
    DeliveryService,
    InventoryService,
    PaymentService,
    TransactionService,
)


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title.upper()}")
    print("=" * 70)


def print_stock_status(session, product_id: int):
    inv = InventoryService.get_inventory(session, product_id)
    prod = session.get(Product, product_id)
    print(
        f"  >> STOK [{prod.name}]: "
        f"Fisik = {inv.physical_stock:,.0f} {prod.base_unit} | "
        f"Reserved = {inv.reserved_stock:,.0f} {prod.base_unit} | "
        f"Tersedia (Available) = {inv.available_stock:,.0f} {prod.base_unit}"
    )


def run_demo():
    session = SessionLocal()
    try:
        print_header("Simulasi POS Toko Material: Alur Cicil Kirim & Bayar Bertahap")

        # 1. Check product & initial stock
        semen = session.query(Product).filter_by(sku="SMN-TR-50").first()
        sak_unit = session.query(ProductUnit).filter_by(product_id=semen.id, unit_name="Sak").first()
        customer = session.query(Customer).filter_by(name="CV Bangun Jaya").first()

        print(f"Pelanggan : {customer.name} (Tier: {customer.price_tier})")
        print(f"Produk    : {semen.name} (Satuan Dasar: {semen.base_unit})")
        print_stock_status(session, semen.id)

        # 2. Transaksi Penjualan 100 Sak (Kirim Nanti, Bayar DP)
        print_header("Langkah 1: Pembelian 100 Sak Semen (Kirim Nanti, DP Rp 2 Juta)")
        tx = TransactionService.create_sale(
            session=session,
            items=[{"product_unit_id": sak_unit.id, "quantity": Decimal("100")}],
            customer_id=customer.id,
            delivery_mode="pending",
            payment_mode="dp",
            initial_payment={"amount": Decimal("2000000.00"), "method": "transfer", "reference": "TRX-DP-01"},
            notes="Proyek Ruko Gandaria - Pengiriman bertahap",
        )
        session.commit()

        print(f"  Nota Dibuat      : {tx.invoice_number}")
        print(f"  Total Tagihan    : Rp {tx.total_amount:,.2f}")
        print(f"  Sudah Dibayar    : Rp {tx.paid_amount:,.2f}")
        print(f"  Status Bayar     : {tx.payment_status.upper()}")
        print(f"  Status Kirim     : {tx.delivery_status.upper()}")
        print_stock_status(session, semen.id)

        tx_item = tx.items[0]

        # 3. Surat Jalan #1 (Kirim 40 Sak)
        print_header("Langkah 2: Surat Jalan #1 (Kirim 40 Sak)")
        do1 = DeliveryService.create_delivery_order(
            session=session,
            transaction_id=tx.id,
            items_to_deliver=[{"transaction_item_id": tx_item.id, "quantity": Decimal("40")}],
            driver_name="Supir Asep (Engkel B 9012 ABC)",
            auto_fulfill=True,
        )
        session.commit()
        session.refresh(tx)
        session.refresh(tx_item)

        print(f"  Surat Jalan #1   : {do1.do_number} (Terkirim: 40 Sak)")
        print(f"  Status Kirim Nota: {tx.delivery_status.upper()}")
        print(f"  Total Terkirim   : {tx_item.qty_delivered:,.0f} dari {tx_item.qty_in_base_unit:,.0f} Sak")
        print_stock_status(session, semen.id)

        # 4. Surat Jalan #2 (Kirim 35 Sak)
        print_header("Langkah 3: Surat Jalan #2 (Kirim 35 Sak)")
        do2 = DeliveryService.create_delivery_order(
            session=session,
            transaction_id=tx.id,
            items_to_deliver=[{"transaction_item_id": tx_item.id, "quantity": Decimal("35")}],
            driver_name="Supir Joko (Pick Up B 1234 DEF)",
            auto_fulfill=True,
        )
        session.commit()
        session.refresh(tx)
        session.refresh(tx_item)

        print(f"  Surat Jalan #2   : {do2.do_number} (Terkirim: 35 Sak)")
        print(f"  Status Kirim Nota: {tx.delivery_status.upper()}")
        print(f"  Total Terkirim   : {tx_item.qty_delivered:,.0f} dari {tx_item.qty_in_base_unit:,.0f} Sak")
        print_stock_status(session, semen.id)

        # 5. Surat Jalan #3 (Kirim Sisa 25 Sak - Selesai)
        print_header("Langkah 4: Surat Jalan #3 (Kirim Sisa 25 Sak)")
        do3 = DeliveryService.create_delivery_order(
            session=session,
            transaction_id=tx.id,
            items_to_deliver=[{"transaction_item_id": tx_item.id, "quantity": Decimal("25")}],
            driver_name="Supir Joko",
            auto_fulfill=True,
        )
        session.commit()
        session.refresh(tx)
        session.refresh(tx_item)

        print(f"  Surat Jalan #3   : {do3.do_number} (Terkirim: 25 Sak)")
        print(f"  Status Kirim Nota: {tx.delivery_status.upper()} (Semua barang terkirim)")
        print(f"  Total Terkirim   : {tx_item.qty_delivered:,.0f} dari {tx_item.qty_in_base_unit:,.0f} Sak")
        print_stock_status(session, semen.id)

        # 6. Pelunasan Pembayaran
        print_header("Langkah 5: Pelunasan Sisa Pembayaran")
        sisa = tx.total_amount - tx.paid_amount
        print(f"  Sisa Tagihan     : Rp {sisa:,.2f}")
        PaymentService.add_payment(
            session=session,
            transaction_id=tx.id,
            amount=sisa,
            method="transfer",
            notes="Pelunasan via Transfer Bank Mandiri",
        )
        session.commit()
        session.refresh(tx)

        print(f"  Total Terbayar   : Rp {tx.paid_amount:,.2f}")
        print(f"  Status Bayar     : {tx.payment_status.upper()} (LUNAS)")
        print_stock_status(session, semen.id)

        print_header("Simulasi Berhasil: Seluruh Alur Bisnis Bekerja Sesuai Spesifikasi!")

    finally:
        session.close()


if __name__ == "__main__":
    run_demo()
