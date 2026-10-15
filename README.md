# Sistem POS Toko Bangunan & Material (Point of Sale)

Aplikasi Point of Sale (POS) modern berarsitektur tinggi yang dirancang khusus untuk operasional toko bahan bangunan dan material konstruksi. Menggabungkan performa backend Python (FastAPI + SQLAlchemy 2.0) dengan antarmuka **Strict White Minimalist** berbasis Tailwind CSS dan font `tabular-nums`.

---

## Fitur Utama

### 1. Multi-Units & Konversi Dinamis Terbuka
- Manajemen produk dengan satuan terkecil (`base_unit`) dan beberapa satuan turunan/penjualan (misal: 1 Dus = 10 Sak, 1 Truk = 7 Kubik).
- Barcode independen per satuan konversi.
- Perhitungan stok otomatis tersinkronisasi ke satuan dasar di kartu stok ledger.

### 2. Tiered Pricing (3 Level Harga) & Aturan Grosir Otomatis
- **3 Tingkatan Harga:** Harga Eceran (Retail), Harga Tukang (Contractor), dan Harga Proyek (Wholesale).
- **Aturan Volume Grosir Otomatis:** Potongan harga atau harga khusus otomatis aktif jika kuantitas pembelian melampaui `min_qty`.
- Perhitungan harga menggunakan tipe data `Decimal` presisi tinggi (bebas bug binary float).

### 3. Dual-State Inventory & Proteksi Overselling
- Memisahkan status stok gudang secara riil:
  $$\text{Available Stock} = \text{Physical Stock} - \text{Reserved Stock}$$
- Saat barang dipesan untuk dikirim nanti atau dicicil, stok otomatis berpindah ke `reserved_stock`.
- `physical_stock` baru berkurang saat Surat Jalan (Delivery Order) diverifikasi dan dikirim ke supir/lapangan.
- Dilengkapi **Kartu Stok Ledger** kronologis dengan riwayat mutasi keluar-masuk.

### 4. Split Delivery & Pengiriman Parsial (Surat Jalan)
- Pilihan metode pengiriman per transaksi:
  - **Bawa Langsung:** Potong `physical_stock` seketika.
  - **Kirim Armada / Ambil Nanti:** Masuk ke `reserved_stock` dan membuat dokumen Surat Jalan.
  - **Split Parsial:** Kasir dapat menentukan berapa kuantitas yang dibawa sekarang dan berapa yang dikirim menyusul per item pesanan.

### 5. Multi-Payment & Buku Piutang Proyek (Tempo / DP)
- Mendukung pembayaran Lunas (Tunai, Transfer Bank, QRIS, EDC), Uang Muka (DP), dan Tempo (Kasbon/Kredit Proyek).
- Validasi limit kredit pelanggan dan tanggal jatuh tempo.
- Modul Buku Piutang untuk pelunasan bertahap/cicilan secara kronologis.

### 6. Desain Keyboard-First & Template Cetak
- Pintasan keyboard cepat di kasir: `F1` (Cari barang), `F2` (Ganti tier harga), `F4` (Hold transaksi), `F12` (Checkout).
- Cetak Struk Kasir Thermal 80mm.
- Cetak Faktur Penjualan & Surat Jalan ukuran Continuous Form (Dot Matrix) dengan mode khusus gudang yang menyembunyikan nominal harga.

---

## Struktur Direktori

```text
POS Material/
├── alembic/                # Database migration scripts
├── app/
│   ├── database.py         # SQLAlchemy engine & session setup
│   ├── exceptions.py       # Domain business logic exceptions
│   ├── main.py             # FastAPI REST API & static file serving
│   ├── models/             # SQLAlchemy ORM models (Product, Transaction, DO, dll.)
│   └── services/           # Business logic layer (Pricing, Inventory, Delivery, dll.)
├── frontend/
│   ├── css/styles.css      # Strict White Minimalist styling
│   ├── index.html          # Single Page Application container
│   └── js/
│       ├── app.js          # App initialization & routing
│       └── components/     # UI Components (POS, DataTable, Modals, Print)
├── tests/                  # Pytest test suite (23 integration & unit tests)
├── alembic.ini             # Alembic configuration
├── pytest.ini              # Pytest configuration
├── requirements.txt        # Python dependencies
├── ruff.toml               # Linter configuration
├── run_app.py              # Application launcher script
└── seed.py                 # Initial database seeder
```

---

## Instalasi & Menjalankan Aplikasi

### 1. Prasyarat
- Python 3.10+ (atau Python 3.14)
- Git

### 2. Setup Virtual Environment & Dependensi
```bash
# Buat virtual environment
python -m venv venv

# Aktivasi virtual environment (Windows)
.\venv\Scripts\activate

# Install dependensi
pip install -r requirements.txt
```

### 3. Migrasi Database & Seeder
```bash
# Jalankan migrasi Alembic
alembic upgrade head

# Jalankan database seeder
python seed.py
```

### 4. Menjalankan Aplikasi
```bash
python run_app.py
```
Aplikasi akan aktif di: `http://127.0.0.1:8000`

### 5. Menjalankan Pengujian (Testing & Linting)
```bash
# Jalankan test suite pytest
pytest

# Jalankan linter ruff
ruff check app tests

# Jalankan typechecker mypy
mypy app tests --ignore-missing-imports
```

---

## Lisensi
Proyek ini dibuat untuk keperluan manajemen toko bahan bangunan dan material konstruksi.
