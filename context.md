# Project Rules: POS Toko Material & Bangunan

## 1. Design System (Strict White Minimalist)
- Background: Pure White (#FFFFFF) untuk area kerja aktif, Slate (#F8FAFC) untuk area sekunder/katalog.
- Text: Deep Charcoal (#0F172A) untuk teks utama, Muted Slate (#64748B) untuk label sekunder.
- Border & Shadow: Gunakan hairline border (`1px solid #E2E8F0`), radius `6px` (`rounded-md`). DILARang menggunakan drop-shadow tebal (`shadow-lg`/`shadow-xl`) atau gradien dekoratif.
- Typography: Font sans-serif bersih (Inter / Plus Jakarta Sans). WAJIB gunakan class `tabular-nums` pada seluruh elemen harga, stok, kuantitas, dan kalkulasi tabel.
- Accent Colors: Gunakan warna hanya untuk status/aksi utama: Biru (#2563EB) untuk Primary Action, Hijau (#10B981) untuk Lunas/Stok Aman, Amber (#D97706) untuk Tempo/Piutang, Merah (#EF4444) untuk Stok Habis/Jatuh Tempo.

## 2. Core Business Logic Rules
- Semua perhitungan harga dan konversi stok WAJIB menggunakan tipe data presisi (`DECIMAL`/`NUMERIC`), jangan gunakan float standar untuk menghindari selisih pembulatan.
- Setiap produk memiliki 1 Satuan Dasar (Base Unit) untuk penyimpanan stok, dan bisa memiliki banyak Satuan Jual (Conversion Units) dengan harga bertingkat (Eceran, Tukang, Grosir/Proyek).
- Transaksi kasir harus memisahkan status Pembayaran (Lunas, DP, Tempo) dan status Pengiriman (Bawa Langsung, Kirim Sebagian/Partial, Kirim Nanti).