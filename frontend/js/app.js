/**
 * Application Entrypoint — POS Toko Material & Bangunan
 * Ties components into an interactive, real-time client demonstration.
 */

import { Layout } from "./components/Layout.js";
import { DataTable } from "./components/DataTable.js";
import { Badge } from "./components/Badge.js";
import { CurrencyInput } from "./components/CurrencyInput.js";
import { QuantityInput } from "./components/QuantityInput.js";
import { ProductFormModal } from "./components/ProductFormModal.js";
import { StockCardModal } from "./components/StockCardModal.js";
import { POSModule } from "./components/POSModule.js";
import { PrintTemplates } from "./components/PrintTemplates.js";

class App {
  constructor() {
    this.layout = new Layout({
      container: "#app-root",
      onModuleChange: (modId) => this.renderModule(modId),
    });

    this.products = [];
    this.categories = [];
    this.customers = [];

    // Initialize POS Module
    this.posModule = new POSModule({
      products: [],
      customers: [],
      categories: [],
      onCheckoutSuccess: () => this.refreshData(),
    });

    // Load initial data
    this.initData();
  }

  async initData() {
    try {
      const [catRes, prodRes, custRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/products"),
        fetch("/api/customers"),
      ]);
      if (catRes.ok) this.categories = await catRes.json();
      if (prodRes.ok) this.products = await prodRes.json();
      if (custRes.ok) this.customers = await custRes.json();

      this.posModule.setCategories(this.categories);
      this.posModule.setProducts(this.products);
      this.posModule.setCustomers(this.customers);
    } catch (e) {
      console.warn("Using offline fallback data:", e);
    }

    this.renderModule("pos");
  }

  async refreshData() {
    try {
      const [prodRes, custRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/customers"),
      ]);
      if (prodRes.ok) {
        this.products = await prodRes.json();
        this.posModule.setProducts(this.products);
      }
      if (custRes.ok) {
        this.customers = await custRes.json();
        this.posModule.setCustomers(this.customers);
      }
    } catch (e) {
      console.warn("Failed to refresh data:", e);
    }
  }

  renderModule(moduleId) {
    const canvas = this.layout.getWorkspaceElement();
    if (!canvas) return;

    switch (moduleId) {
      case "pos":
        this.renderPOS(canvas);
        break;
      case "inventory":
        this.renderInventory(canvas);
        break;
      case "delivery":
        this.renderDelivery(canvas);
        break;
      case "receivables":
        this.renderReceivables(canvas);
        break;
      case "reports":
        this.renderReports(canvas);
        break;
      default:
        this.renderPOS(canvas);
    }
  }

  // ==========================================
  // MODULE 1: KASIR (POS) — SPLIT-SCREEN 60/40
  // ==========================================
  renderPOS(canvas) {
    this.posModule.render(canvas);
  }

  // ==========================================
  // MODULE 2: MASTER BARANG & DUAL-STATE STOK (CRUD & KARTU STOK)
  // ==========================================
  async renderInventory(canvas) {
    // Reload products from server
    try {
      const res = await fetch("/api/products");
      if (res.ok) this.products = await res.json();
      const catRes = await fetch("/api/categories");
      if (catRes.ok) this.categories = await catRes.json();
    } catch (e) {
      console.warn("Failed to reload products:", e);
    }

    const totalSKU = this.products.length;
    const totalPhysical = this.products.reduce((acc, p) => acc + (p.physical_stock || 0), 0);
    const totalReserved = this.products.reduce((acc, p) => acc + (p.reserved_stock || 0), 0);
    const totalAvailable = this.products.reduce((acc, p) => acc + (p.available_stock || 0), 0);

    canvas.innerHTML = `
      <div class="flex flex-col h-full space-y-4">
        <!-- Top Action Bar -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Master Barang & Konversi Satuan</h2>
            <p class="text-[11px] text-slate-500">Kelola master barang, multi-satuan, lokasi rak, dan riwayat mutasi kartu stok</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              id="btn-refresh-inventory"
              class="h-8 px-2.5 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Refresh Data"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              id="btn-create-product"
              class="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>+ Tambah Barang Baru</span>
            </button>
          </div>
        </div>

        <!-- Metric Summary Cards (Strict White Minimalist) -->
        <div class="grid grid-cols-4 gap-4">
          <div class="p-3.5 bg-white border border-[#E2E8F0] rounded-md">
            <div class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Total SKU Terdaftar</div>
            <div class="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">${totalSKU.toLocaleString("id-ID")} <span class="text-xs font-normal text-slate-500">item</span></div>
          </div>
          <div class="p-3.5 bg-white border border-[#E2E8F0] rounded-md">
            <div class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Total Fisik Gudang</div>
            <div class="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">${totalPhysical.toLocaleString("id-ID")} <span class="text-xs font-normal text-slate-500">unit base</span></div>
          </div>
          <div class="p-3.5 bg-white border border-[#E2E8F0] rounded-md">
            <div class="text-[10px] text-amber-700 font-medium uppercase tracking-wider">Barang Reserved (Dipesan)</div>
            <div class="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">${totalReserved.toLocaleString("id-ID")} <span class="text-xs font-normal text-amber-600">unit base</span></div>
          </div>
          <div class="p-3.5 bg-white border border-[#E2E8F0] rounded-md">
            <div class="text-[10px] text-emerald-700 font-medium uppercase tracking-wider">Stok Bersih Siap Jual</div>
            <div class="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">${totalAvailable.toLocaleString("id-ID")} <span class="text-xs font-normal text-emerald-600">available</span></div>
          </div>
        </div>

        <!-- High-Density Inventory DataTable -->
        <div class="flex-1 bg-white rounded-md border border-[#E2E8F0] overflow-hidden flex flex-col" id="inventory-dt-container"></div>
      </div>
    `;

    // Render Compact Inventory Table with CRUD actions
    new DataTable({
      container: canvas.querySelector("#inventory-dt-container"),
      columns: [
        { key: "sku", label: "SKU", width: "100px" },
        {
          key: "name",
          label: "Nama Barang",
          render: (val, row) => `
            <div>
              <div class="font-medium text-slate-900 leading-tight">${val}</div>
              <div class="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                <span>Rak: <strong class="text-slate-700">${row.rack_location || "Gudang Utama"}</strong></span>
                <span>•</span>
                <span>Base: <strong class="text-slate-700">${row.base_unit}</strong></span>
              </div>
            </div>
          `,
        },
        { key: "category_name", label: "Kategori", width: "110px" },
        {
          key: "units",
          label: "Satuan & Konversi",
          width: "160px",
          render: (units, row) => {
            if (!units || units.length === 0) return row.base_unit;
            return `
              <div class="space-y-0.5 text-[10px] font-mono">
                ${units
                  .map((u) => {
                    const factorLabel = u.conversion_factor > 1 ? ` (${u.conversion_factor} ${row.base_unit})` : "";
                    return `<span class="inline-block px-1 py-0.2 rounded bg-slate-100 border border-[#E2E8F0] text-slate-700 mr-1">${u.unit_name}${factorLabel}</span>`;
                  })
                  .join("")}
              </div>
            `;
          },
        },
        {
          key: "physical_stock",
          label: "Stok Fisik",
          align: "right",
          isNumber: true,
          width: "90px",
          render: (val, row) => `${val.toLocaleString("id-ID")} <span class="text-[10px] text-slate-400">${row.base_unit}</span>`,
        },
        {
          key: "reserved_stock",
          label: "Reserved",
          align: "right",
          isNumber: true,
          width: "80px",
          render: (val) => `<span class="${val > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}">${val.toLocaleString("id-ID")}</span>`,
        },
        {
          key: "available_stock",
          label: "Tersedia",
          align: "right",
          isNumber: true,
          width: "80px",
          render: (val) => `<span class="font-bold ${val <= 0 ? "text-rose-600" : "text-slate-900"}">${val.toLocaleString("id-ID")}</span>`,
        },
        {
          key: "status",
          label: "Status",
          align: "center",
          width: "95px",
          render: (val) => Badge.render({ variant: val }),
        },
        {
          key: "actions",
          label: "Aksi",
          align: "center",
          width: "160px",
          render: (_, row) => `
            <div class="inline-flex items-center gap-1 select-none">
              <button
                type="button"
                data-stock-card-id="${row.id}"
                class="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-[#E2E8F0] text-slate-700 text-[11px] font-medium transition-colors"
                title="Lihat riwayat mutasi kartu stok"
              >
                Kartu Stok
              </button>
              <button
                type="button"
                data-edit-prod-id="${row.id}"
                class="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-[#E2E8F0] text-slate-700 text-[11px] font-medium transition-colors"
                title="Edit barang & satuan"
              >
                Edit
              </button>
              <button
                type="button"
                data-delete-prod-id="${row.id}"
                class="px-1.5 py-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-medium transition-colors"
                title="Nonaktifkan barang"
              >
                ✕
              </button>
            </div>
          `,
        },
      ],
      data: this.products,
      pageSize: 20,
      searchable: true,
    });

    // Attach Action Listeners
    this.attachInventoryListeners(canvas);
  }

  attachInventoryListeners(canvas) {
    // Refresh button
    canvas.querySelector("#btn-refresh-inventory")?.addEventListener("click", () => {
      this.renderInventory(canvas);
    });

    // Create product button
    canvas.querySelector("#btn-create-product")?.addEventListener("click", () => {
      new ProductFormModal({
        categories: this.categories,
        onSave: async (payload) => {
          try {
            const res = await fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Gagal menyimpan barang");
            alert(`Barang '${payload.name}' berhasil dibuat!`);
            this.renderInventory(canvas);
          } catch (err) {
            alert(err.message);
          }
        },
      });
    });

    // Table action delegation
    canvas.addEventListener("click", async (e) => {
      // Stock card button
      const scBtn = e.target.closest("[data-stock-card-id]");
      if (scBtn) {
        const prodId = parseInt(scBtn.getAttribute("data-stock-card-id"), 10);
        try {
          const res = await fetch(`/api/products/${prodId}/stock-card`);
          if (!res.ok) throw new Error("Gagal mengambil data kartu stok");
          const cardData = await res.json();
          new StockCardModal({
            product: cardData.product,
            mutations: cardData.mutations,
          });
        } catch (err) {
          alert(err.message);
        }
        return;
      }

      // Edit product button
      const editBtn = e.target.closest("[data-edit-prod-id]");
      if (editBtn) {
        const prodId = parseInt(editBtn.getAttribute("data-edit-prod-id"), 10);
        try {
          const res = await fetch(`/api/products/${prodId}`);
          if (!res.ok) throw new Error("Gagal mengambil data barang");
          const prodData = await res.json();
          new ProductFormModal({
            categories: this.categories,
            product: prodData,
            onSave: async (payload, isEdit, id) => {
              try {
                const saveRes = await fetch(`/api/products/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                const saveData = await saveRes.json();
                if (!saveRes.ok) throw new Error(saveData.detail || "Gagal mengupdate barang");
                alert(`Perubahan barang '${payload.name}' berhasil disimpan!`);
                this.renderInventory(canvas);
              } catch (err) {
                alert(err.message);
              }
            },
          });
        } catch (err) {
          alert(err.message);
        }
        return;
      }

      // Delete product button
      const delBtn = e.target.closest("[data-delete-prod-id]");
      if (delBtn) {
        const prodId = parseInt(delBtn.getAttribute("data-delete-prod-id"), 10);
        const prod = this.products.find((p) => p.id === prodId);
        if (confirm(`Yakin ingin menonaktifkan barang '${prod?.name || prodId}'?`)) {
          try {
            const res = await fetch(`/api/products/${prodId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Gagal menghapus barang");
            this.renderInventory(canvas);
          } catch (err) {
            alert(err.message);
          }
        }
      }
    });
  }

  // ==========================================
  // MODULE 3: SURAT JALAN & PENGIRIMAN
  // ==========================================
  async renderDelivery(canvas) {
    canvas.innerHTML = `
      <div class="flex flex-col h-full space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Surat Jalan (Delivery Order)</h2>
            <p class="text-[11px] text-slate-500">Tracking pengiriman parsial barang ke proyek & pelanggan</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              id="btn-refresh-delivery"
              class="h-8 px-3 rounded bg-white border border-[#E2E8F0] text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              Refresh
            </button>
            <button
              id="btn-new-delivery"
              class="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              + Buat Transaksi Baru (Kasir)
            </button>
          </div>
        </div>

        <div class="flex-1 bg-white rounded-md border border-[#E2E8F0] overflow-hidden flex flex-col" id="delivery-dt-container">
          <div class="p-8 text-center text-xs text-slate-400">Memuat data Surat Jalan...</div>
        </div>
      </div>
    `;

    const loadDeliveries = async () => {
      try {
        const res = await fetch("/api/delivery-orders");
        if (!res.ok) throw new Error("Gagal mengambil data Surat Jalan");
        const deliveries = await res.json();

        new DataTable({
          container: canvas.querySelector("#delivery-dt-container"),
          columns: [
            {
              key: "do_number",
              label: "No. Surat Jalan",
              width: "155px",
              render: (val) => `<span class="font-mono tabular-nums text-xs font-semibold text-slate-800">${val}</span>`,
            },
            {
              key: "date",
              label: "Waktu Pengiriman",
              width: "140px",
              render: (val) => `<span class="font-mono tabular-nums text-[11px] text-slate-600">${val}</span>`,
            },
            {
              key: "invoice_number",
              label: "Ref. Nota",
              width: "150px",
              render: (val) => `<span class="font-mono tabular-nums text-xs text-blue-600 hover:underline cursor-pointer" data-view-tx="${val}">${val}</span>`,
            },
            { key: "customer", label: "Pelanggan" },
            { key: "driver", label: "Supir / Kendaraan" },
            {
              key: "items_summary",
              label: "Item Terkirim",
              render: (val) => `<div class="max-w-xs truncate text-[11px] text-slate-700" title="${val}">${val}</div>`,
            },
            {
              key: "status",
              label: "Status Pengiriman",
              align: "center",
              width: "130px",
              render: (val) => Badge.render({ variant: val }),
            },
            {
              key: "actions",
              label: "Aksi",
              align: "center",
              width: "150px",
              render: (_, row) => `
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    data-print-do="${row.transaction_id}"
                    class="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-white border border-[#E2E8F0] rounded hover:bg-slate-50 transition-colors"
                    title="Cetak Surat Jalan (Dot Matrix)"
                  >
                    Cetak
                  </button>
                  ${
                    row.status === "pending"
                      ? `<button
                          data-fulfill-do="${row.id}"
                          class="px-2 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                          title="Kirim dan potong stok gudang sekarang"
                        >
                          Kirim Sekarang
                        </button>`
                      : ""
                  }
                </div>
              `,
            },
          ],
          data: deliveries,
          pageSize: 15,
          searchable: true,
        });
      } catch (err) {
        const c = canvas.querySelector("#delivery-dt-container");
        if (c) c.innerHTML = `<div class="p-8 text-center text-xs text-red-500">${err.message}</div>`;
      }
    };

    await loadDeliveries();

    canvas.querySelector("#btn-refresh-delivery")?.addEventListener("click", () => loadDeliveries());
    canvas.querySelector("#btn-new-delivery")?.addEventListener("click", () => {
      this.layout.sidebar.setActive("pos");
    });

    canvas.addEventListener("click", async (e) => {
      // Print DO button
      const printBtn = e.target.closest("[data-print-do]");
      if (printBtn) {
        const txId = printBtn.getAttribute("data-print-do");
        try {
          const res = await fetch(`/api/transactions/${txId}`);
          if (!res.ok) throw new Error("Gagal mengambil data transaksi");
          const txDetail = await res.json();
          PrintTemplates.showPrintPreviewModal(txDetail, "delivery_order");
        } catch (err) {
          alert(err.message);
        }
        return;
      }

      // Fulfill DO button
      const fulfillBtn = e.target.closest("[data-fulfill-do]");
      if (fulfillBtn) {
        const doId = fulfillBtn.getAttribute("data-fulfill-do");
        if (confirm("Konfirmasi: Tandai Surat Jalan ini sudah dikirim ke pelanggan? Stok fisik gudang & reserved akan dipotong seketika.")) {
          try {
            const res = await fetch(`/api/delivery-orders/${doId}/fulfill`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Gagal memproses pengiriman");
            alert(`Surat Jalan ${data.do_number} berhasil dikirim! Stok gudang telah dipotong.`);
            await loadDeliveries();
            this.refreshData();
          } catch (err) {
            alert(err.message);
          }
        }
        return;
      }

      // View Tx / Invoice link
      const txLink = e.target.closest("[data-view-tx]");
      if (txLink) {
        const invNum = txLink.getAttribute("data-view-tx");
        try {
          const res = await fetch(`/api/transactions/${invNum}`);
          if (!res.ok) throw new Error("Gagal mengambil data transaksi");
          const txDetail = await res.json();
          PrintTemplates.showPrintPreviewModal(txDetail, "dotmatrix");
        } catch (err) {
          alert(err.message);
        }
      }
    });
  }

  // ==========================================
  // MODULE 4: PIUTANG & TEMPO
  // ==========================================
  async renderReceivables(canvas) {
    canvas.innerHTML = `
      <div class="flex flex-col h-full space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Buku Piutang & Penjualan Tempo</h2>
            <p class="text-[11px] text-slate-500">Monitoring jatuh tempo kasbon proyek dan pelunasan bertahap</p>
          </div>
          <button
            id="btn-refresh-receivables"
            class="h-8 px-3 rounded bg-white border border-[#E2E8F0] text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div class="flex-1 bg-white rounded-md border border-[#E2E8F0] overflow-hidden flex flex-col" id="receivables-dt-container">
          <div class="p-8 text-center text-xs text-slate-400">Memuat data piutang...</div>
        </div>
      </div>
    `;

    const loadReceivables = async () => {
      try {
        const res = await fetch("/api/receivables");
        if (!res.ok) throw new Error("Gagal mengambil data piutang");
        const receivables = await res.json();

        new DataTable({
          container: canvas.querySelector("#receivables-dt-container"),
          columns: [
            {
              key: "invoice_number",
              label: "No. Nota",
              width: "155px",
              render: (val) => `<span class="font-mono tabular-nums text-xs font-semibold text-slate-800">${val}</span>`,
            },
            {
              key: "customer",
              label: "Pelanggan / Proyek",
              render: (val, row) => `
                <div>
                  <div class="font-medium text-slate-900 leading-tight">${val}</div>
                  <div class="text-[10px] text-slate-400 font-mono">${row.customer_phone || "-"} • Tier: ${row.tier}</div>
                </div>
              `,
            },
            {
              key: "total",
              label: "Total Tagihan",
              align: "right",
              isNumber: true,
              render: (val) => `<span class="font-mono tabular-nums">Rp ${val.toLocaleString("id-ID")}</span>`,
            },
            {
              key: "paid",
              label: "Sudah Dibayar",
              align: "right",
              isNumber: true,
              render: (val) => `<span class="font-mono tabular-nums text-slate-600">Rp ${val.toLocaleString("id-ID")}</span>`,
            },
            {
              key: "balance",
              label: "Sisa Piutang",
              align: "right",
              isNumber: true,
              render: (val) => `<span class="font-mono tabular-nums font-bold text-amber-700">Rp ${val.toLocaleString("id-ID")}</span>`,
            },
            {
              key: "due_date",
              label: "Jatuh Tempo",
              width: "135px",
              render: (val, row) => {
                const isOverdue = row.days_left < 0;
                return `
                  <div class="font-mono tabular-nums text-[11px] ${isOverdue ? "text-red-600 font-semibold" : "text-slate-700"}">
                    ${val}
                    <div class="text-[10px] font-sans ${isOverdue ? "text-red-500 font-medium" : "text-slate-400"}">
                      ${isOverdue ? `Lewat ${Math.abs(row.days_left)} hari` : `${row.days_left} hari lagi`}
                    </div>
                  </div>
                `;
              },
            },
            {
              key: "status",
              label: "Status Piutang",
              align: "center",
              width: "110px",
              render: (val) => Badge.render({ variant: val }),
            },
            {
              key: "actions",
              label: "Aksi",
              align: "center",
              width: "140px",
              render: (_, row) => `
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    data-pay-receivable="${row.id}"
                    data-balance="${row.balance}"
                    data-inv="${row.invoice_number}"
                    data-cust="${row.customer}"
                    class="px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                  >
                    Bayar / Cicil
                  </button>
                  <button
                    data-print-receivable="${row.id}"
                    class="px-2 py-0.5 text-[11px] font-medium text-slate-700 bg-white border border-[#E2E8F0] rounded hover:bg-slate-50 transition-colors"
                  >
                    Nota
                  </button>
                </div>
              `,
            },
          ],
          data: receivables,
          pageSize: 15,
          searchable: true,
        });
      } catch (err) {
        const c = canvas.querySelector("#receivables-dt-container");
        if (c) c.innerHTML = `<div class="p-8 text-center text-xs text-red-500">${err.message}</div>`;
      }
    };

    await loadReceivables();

    canvas.querySelector("#btn-refresh-receivables")?.addEventListener("click", () => loadReceivables());

    canvas.addEventListener("click", async (e) => {
      // Print button
      const printBtn = e.target.closest("[data-print-receivable]");
      if (printBtn) {
        const txId = printBtn.getAttribute("data-print-receivable");
        try {
          const res = await fetch(`/api/transactions/${txId}`);
          if (!res.ok) throw new Error("Gagal mengambil data nota");
          const txDetail = await res.json();
          PrintTemplates.showPrintPreviewModal(txDetail, "dotmatrix");
        } catch (err) {
          alert(err.message);
        }
        return;
      }

      // Pay button
      const payBtn = e.target.closest("[data-pay-receivable]");
      if (payBtn) {
        const txId = payBtn.getAttribute("data-pay-receivable");
        const balance = parseFloat(payBtn.getAttribute("data-balance")) || 0;
        const inv = payBtn.getAttribute("data-inv");
        const cust = payBtn.getAttribute("data-cust");

        this.openPaymentModal({
          transactionId: txId,
          invoiceNumber: inv,
          customerName: cust,
          balance: balance,
          onSuccess: async () => {
            await loadReceivables();
            this.refreshData();
          },
        });
      }
    });
  }

  /**
   * Modal to record installment or full payment for a receivable
   */
  openPaymentModal({ transactionId, invoiceNumber, customerName, balance, onSuccess }) {
    const backdrop = document.createElement("div");
    backdrop.className = "fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4";

    backdrop.innerHTML = `
      <div class="bg-white rounded-md border border-[#E2E8F0] shadow-sm w-full max-w-md overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50">
          <div>
            <div class="text-xs font-bold text-slate-900 uppercase tracking-wider">Catat Pembayaran / Pelunasan</div>
            <div class="text-[11px] text-slate-500 font-mono">${invoiceNumber} • ${customerName}</div>
          </div>
          <button id="modal-pay-close" class="text-slate-400 hover:text-slate-700 text-sm">✕</button>
        </div>

        <form id="form-pay-receivable" class="p-4 space-y-3">
          <div class="p-3 bg-amber-50/60 border border-amber-200/80 rounded">
            <div class="text-[10px] uppercase font-bold text-amber-800">Sisa Piutang Berjalan</div>
            <div class="text-xl font-bold font-mono tabular-nums text-amber-700 mt-0.5">Rp ${balance.toLocaleString("id-ID")}</div>
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Nominal Bayar (Rp) *</label>
            <input
              type="number"
              id="pay-amount-input"
              required
              min="1"
              max="${balance}"
              value="${balance}"
              class="w-full h-8 px-2.5 text-xs font-mono tabular-nums bg-white border border-[#E2E8F0] rounded focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Metode Pembayaran *</label>
            <select
              id="pay-method-select"
              class="w-full h-8 px-2 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none focus:border-blue-600"
            >
              <option value="cash">Tunai (Cash)</option>
              <option value="transfer">Transfer Bank (BCA / Mandiri / BRI)</option>
              <option value="qris">QRIS</option>
              <option value="edc">Mesin EDC / Debit</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Referensi / Bukti Transfer</label>
            <input
              type="text"
              id="pay-ref-input"
              placeholder="Nomor referensi / approval code"
              class="w-full h-8 px-2.5 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-700 mb-1">Catatan Tambahan</label>
            <input
              type="text"
              id="pay-notes-input"
              placeholder="Keterangan pembayaran (opsional)"
              class="w-full h-8 px-2.5 text-xs bg-white border border-[#E2E8F0] rounded focus:outline-none focus:border-blue-600"
            />
          </div>

          <div class="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
            <button
              type="button"
              id="modal-pay-cancel"
              class="h-8 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-[#E2E8F0]"
            >
              Batal
            </button>
            <button
              type="submit"
              id="modal-pay-submit"
              class="h-8 px-4 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);

    const close = () => {
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    };

    backdrop.querySelector("#modal-pay-close")?.addEventListener("click", close);
    backdrop.querySelector("#modal-pay-cancel")?.addEventListener("click", close);

    const form = backdrop.querySelector("#form-pay-receivable");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const amount = parseFloat(backdrop.querySelector("#pay-amount-input").value) || 0;
      const method = backdrop.querySelector("#pay-method-select").value;
      const reference = backdrop.querySelector("#pay-ref-input").value.trim() || null;
      const notes = backdrop.querySelector("#pay-notes-input").value.trim() || null;

      if (amount <= 0) {
        alert("Nominal pembayaran harus lebih besar dari 0");
        return;
      }

      const submitBtn = backdrop.querySelector("#modal-pay-submit");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Memproses...";
      }

      try {
        const res = await fetch(`/api/transactions/${transactionId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, method, reference, notes }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Gagal mencatat pembayaran");

        alert(`Pembayaran sebesar Rp ${amount.toLocaleString("id-ID")} berhasil dicatat! Status: ${data.payment_status.toUpperCase()}`);
        close();
        if (onSuccess) onSuccess();
      } catch (err) {
        alert(err.message);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = "Simpan Pembayaran";
        }
      }
    });
  }

  // ==========================================
  // MODULE 5: LAPORAN & REKAP
  // ==========================================
  async renderReports(canvas) {
    canvas.innerHTML = `
      <div class="space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Laporan & Rekapitulasi POS</h2>
            <p class="text-[11px] text-slate-500">Ringkasan performa penjualan harian, piutang tertagih, dan pergerakan stok</p>
          </div>
          <button
            id="btn-refresh-reports"
            class="h-8 px-3 rounded bg-white border border-[#E2E8F0] text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        <div class="grid grid-cols-4 gap-4" id="reports-cards-container">
          <div class="p-4 bg-white border border-[#E2E8F0] rounded-md space-y-1">
            <div class="text-xs text-slate-500 font-medium">Omset Penjualan Hari Ini</div>
            <div class="text-2xl font-bold font-mono tabular-nums text-slate-900" id="rep-today-sales">Memuat...</div>
            <div class="text-[11px] text-emerald-600 font-medium">Real-time transaksi hari ini</div>
          </div>

          <div class="p-4 bg-white border border-[#E2E8F0] rounded-md space-y-1">
            <div class="text-xs text-slate-500 font-medium">Total Piutang Berjalan (Tempo)</div>
            <div class="text-2xl font-bold font-mono tabular-nums text-amber-700" id="rep-total-receivables">Memuat...</div>
            <div class="text-[11px] text-slate-500">Saldo piutang belum lunas</div>
          </div>

          <div class="p-4 bg-white border border-[#E2E8F0] rounded-md space-y-1">
            <div class="text-xs text-slate-500 font-medium">Surat Jalan Pending</div>
            <div class="text-2xl font-bold font-mono tabular-nums text-blue-600" id="rep-pending-deliveries">Memuat...</div>
            <div class="text-[11px] text-slate-500">Menunggu jadwal pengiriman</div>
          </div>

          <div class="p-4 bg-white border border-[#E2E8F0] rounded-md space-y-1">
            <div class="text-xs text-slate-500 font-medium">Total SKU Terdaftar</div>
            <div class="text-2xl font-bold font-mono tabular-nums text-slate-800" id="rep-total-sku">Memuat...</div>
            <div class="text-[11px] text-slate-500">Produk master aktif</div>
          </div>
        </div>
      </div>
    `;

    const loadReports = async () => {
      try {
        const res = await fetch("/api/reports/summary");
        if (!res.ok) throw new Error("Gagal mengambil data laporan");
        const data = await res.json();

        const salesEl = canvas.querySelector("#rep-today-sales");
        const recEl = canvas.querySelector("#rep-total-receivables");
        const delEl = canvas.querySelector("#rep-pending-deliveries");
        const skuEl = canvas.querySelector("#rep-total-sku");

        if (salesEl) salesEl.innerText = `Rp ${data.today_sales.toLocaleString("id-ID")}`;
        if (recEl) recEl.innerText = `Rp ${data.total_receivables.toLocaleString("id-ID")}`;
        if (delEl) delEl.innerText = `${data.pending_deliveries} Pengiriman`;
        if (skuEl) skuEl.innerText = `${data.total_sku} SKU`;
      } catch (err) {
        console.error("Reports error:", err);
      }
    };

    await loadReports();
    canvas.querySelector("#btn-refresh-reports")?.addEventListener("click", () => loadReports());
  }
}

// Start application
window.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
