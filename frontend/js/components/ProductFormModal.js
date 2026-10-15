/**
 * ProductFormModal Component — Strict White Minimalist modal for creating and editing products
 * with dynamic multi-unit conversions and 3-tier pricing (Eceran, Tukang, Proyek).
 */

import { CurrencyInput } from "./CurrencyInput.js";

export class ProductFormModal {
  /**
   * @param {Object} options
   * @param {Array<Object>} options.categories - List of categories { id, name }
   * @param {Object} [options.product] - Product data if editing, null if creating
   * @param {Function} options.onSave - Callback with submitted data
   * @param {Function} [options.onClose] - Callback when modal closes
   */
  constructor({ categories = [], product = null, onSave, onClose }) {
    this.categories = categories;
    this.product = product;
    this.isEdit = !!product;
    this.onSave = onSave;
    this.onClose = onClose;

    // Unit conversions state
    // Default base unit row
    this.units = this.isEdit && product.units && product.units.length > 0
      ? JSON.parse(JSON.stringify(product.units))
      : [
          {
            id: null,
            unit_name: product ? product.base_unit : "Kg",
            conversion_factor: 1,
            barcode: "",
            price_retail: 0,
            price_contractor: 0,
            price_wholesale: 0,
          },
        ];

    this.render();
  }

  render() {
    // Remove existing modal if any
    const existing = document.getElementById("product-form-modal");
    if (existing) existing.remove();

    const p = this.product || {
      sku: "",
      name: "",
      category_id: this.categories[0]?.id || 1,
      base_unit: "Kg",
      rack_location: "",
      low_stock_threshold: 10,
      initial_stock: 0,
      description: "",
    };

    const modal = document.createElement("div");
    modal.id = "product-form-modal";
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4";

    modal.innerHTML = `
      <div class="w-full max-w-4xl bg-white rounded-md border border-[#E2E8F0] shadow-sm flex flex-col max-h-[90vh] overflow-hidden">
        <!-- Modal Header -->
        <div class="px-5 py-3.5 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between select-none">
          <div>
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
              ${this.isEdit ? `EDIT MASTER BARANG: ${p.sku}` : "TAMBAH MASTER BARANG BARU"}
            </h3>
            <p class="text-[11px] text-slate-500 font-sans">
              Informasi dasar, lokasi gudang, dan konversi multi-satuan dengan 3-tier harga
            </p>
          </div>
          <button type="button" data-close-btn class="text-slate-400 hover:text-slate-700 text-lg font-bold p-1">
            ✕
          </button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          <!-- Section 1: Informasi Dasar -->
          <div>
            <div class="text-[11px] font-semibold text-slate-800 uppercase tracking-wider mb-2.5 pb-1 border-b border-[#E2E8F0] flex items-center justify-between">
              <span>1. Informasi Dasar Produk</span>
              <span class="text-[10px] font-normal text-slate-400">* Wajib diisi</span>
            </div>

            <div class="grid grid-cols-3 gap-3.5">
              <div>
                <label class="block font-medium text-slate-700 mb-1">SKU / Kode Barang *</label>
                <input
                  type="text"
                  id="p-sku"
                  value="${p.sku}"
                  placeholder="Contoh: SMN-TR-50"
                  class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-[5px] font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 uppercase"
                  required
                />
              </div>

              <div class="col-span-2">
                <label class="block font-medium text-slate-700 mb-1">Nama Barang Lengkap *</label>
                <input
                  type="text"
                  id="p-name"
                  value="${p.name}"
                  placeholder="Contoh: Semen Tiga Roda Portland Composite 50kg"
                  class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-[5px] text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label class="block font-medium text-slate-700 mb-1">Kategori Barang *</label>
                <select id="p-category" class="w-full h-8 px-2 bg-white border border-[#E2E8F0] rounded-[5px] text-slate-900 focus:outline-none focus:border-blue-600">
                  ${this.categories
                    .map(
                      (cat) => `
                    <option value="${cat.id}" ${cat.id === p.category_id ? "selected" : ""}>
                      ${cat.name}
                    </option>
                  `
                    )
                    .join("")}
                </select>
              </div>

              <div>
                <label class="block font-medium text-slate-700 mb-1">Lokasi Rak / Gudang</label>
                <input
                  type="text"
                  id="p-rack"
                  value="${p.rack_location || ""}"
                  placeholder="Contoh: Rak A-02 / Gudang B"
                  class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-[5px] text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label class="block font-medium text-slate-700 mb-1">Satuan Dasar Terkecil (Base Unit) *</label>
                <input
                  type="text"
                  id="p-base-unit"
                  value="${p.base_unit}"
                  placeholder="Contoh: Kg / Sak / Batang / Kubik"
                  class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-[5px] font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label class="block font-medium text-slate-700 mb-1">Minimum Stock Alert</label>
                <input
                  type="number"
                  id="p-low-stock"
                  value="${p.low_stock_threshold || 10}"
                  min="0"
                  class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-[5px] font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              ${
                !this.isEdit
                  ? `
                <div>
                  <label class="block font-medium text-slate-700 mb-1">Stok Fisik Awal (Gudang)</label>
                  <input
                    type="number"
                    id="p-initial-stock"
                    value="${p.initial_stock || 0}"
                    min="0"
                    class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-[5px] font-mono tabular-nums text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              `
                  : ""
              }

              <div class="${this.isEdit ? "col-span-2" : ""}">
                <label class="block font-medium text-slate-700 mb-1">Keterangan / Spesifikasi</label>
                <input
                  type="text"
                  id="p-description"
                  value="${p.description || ""}"
                  placeholder="Catatan tambahan..."
                  class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded-[5px] text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          <!-- Section 2: Dynamic Form "Satuan & Harga Jual" -->
          <div>
            <div class="text-[11px] font-semibold text-slate-800 uppercase tracking-wider mb-2.5 pb-1 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span>2. Satuan & Konversi Harga Jual (3-Tier)</span>
                <span class="text-[10px] text-slate-500 font-normal ml-2">
                  (Baris 1 wajib satuan dasar; baris berikutnya adalah satuan konversi grosir/pak)
                </span>
              </div>
              <button
                type="button"
                id="btn-add-unit-row"
                class="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-[#E2E8F0] rounded text-slate-700 text-[11px] font-medium transition-colors flex items-center gap-1"
              >
                <span>+ Tambah Baris Satuan</span>
              </button>
            </div>

            <!-- Dynamic Table of Units -->
            <div class="border border-[#E2E8F0] rounded-md overflow-hidden bg-white">
              <table class="w-full border-collapse table-compact text-left">
                <thead class="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr>
                    <th class="w-32">Nama Satuan</th>
                    <th class="w-36">Konversi ke Base Unit</th>
                    <th class="w-36 text-right">Harga Eceran</th>
                    <th class="w-36 text-right">Harga Tukang</th>
                    <th class="w-36 text-right">Harga Proyek</th>
                    <th class="w-28">Barcode</th>
                    <th class="w-10 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody id="unit-rows-tbody" class="divide-y divide-[#E2E8F0] bg-white">
                  <!-- Dynamically rendered rows -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="px-5 py-3 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
          <div class="text-[11px] text-slate-500 font-mono">
            * Seluruh perhitungan harga & stok menggunakan presisi desimal tanpa pembulatan mengambang.
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-close-btn
              class="h-8 px-3.5 border border-[#E2E8F0] rounded-[5px] bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-submit-product"
              class="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[5px] text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              <span>${this.isEdit ? "Simpan Perubahan" : "Simpan Barang Baru"}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    this.renderUnitRows();
    this.attachListeners();
  }

  renderUnitRows() {
    const tbody = this.modalEl.querySelector("#unit-rows-tbody");
    if (!tbody) return;

    const baseUnitInput = this.modalEl.querySelector("#p-base-unit");
    const baseUnitName = baseUnitInput ? baseUnitInput.value.trim() || "Unit" : "Unit";

    tbody.innerHTML = this.units
      .map((u, idx) => {
        const isBase = idx === 0;
        return `
          <tr data-unit-idx="${idx}" class="hover:bg-slate-50/60 transition-colors">
            <!-- Unit Name -->
            <td class="p-1.5">
              <input
                type="text"
                data-field="unit_name"
                value="${u.unit_name}"
                placeholder="cth: ${isBase ? baseUnitName : 'Dus / Truk'}"
                class="w-full h-7 px-2 text-xs bg-white border border-[#E2E8F0] rounded text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                ${isBase ? 'title="Satuan Dasar Terkecil"' : ''}
              />
              ${isBase ? `<span class="text-[9px] text-slate-400 font-mono block pl-1">(Satuan Dasar)</span>` : ""}
            </td>

            <!-- Conversion Factor -->
            <td class="p-1.5">
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  data-field="conversion_factor"
                  value="${u.conversion_factor}"
                  ${isBase ? "readonly disabled" : ""}
                  class="w-20 h-7 px-1.5 text-xs text-right font-mono tabular-nums bg-white border border-[#E2E8F0] rounded text-slate-900 focus:outline-none ${
                    isBase ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "focus:border-blue-600"
                  }"
                />
                <span class="text-[11px] text-slate-500 font-mono tabular-nums truncate">
                  ${baseUnitName}
                </span>
              </div>
            </td>

            <!-- Price Retail -->
            <td class="p-1.5">
              <input
                type="number"
                data-field="price_retail"
                value="${u.price_retail}"
                class="w-full h-7 px-2 text-xs text-right font-mono tabular-nums bg-white border border-[#E2E8F0] rounded text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </td>

            <!-- Price Contractor -->
            <td class="p-1.5">
              <input
                type="number"
                data-field="price_contractor"
                value="${u.price_contractor}"
                class="w-full h-7 px-2 text-xs text-right font-mono tabular-nums bg-white border border-[#E2E8F0] rounded text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </td>

            <!-- Price Wholesale -->
            <td class="p-1.5">
              <input
                type="number"
                data-field="price_wholesale"
                value="${u.price_wholesale}"
                class="w-full h-7 px-2 text-xs text-right font-mono tabular-nums bg-white border border-[#E2E8F0] rounded text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </td>

            <!-- Barcode -->
            <td class="p-1.5">
              <input
                type="text"
                data-field="barcode"
                value="${u.barcode || ""}"
                placeholder="Barcode"
                class="w-full h-7 px-2 text-[11px] font-mono bg-white border border-[#E2E8F0] rounded text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </td>

            <!-- Actions -->
            <td class="p-1.5 text-center">
              ${
                !isBase
                  ? `
                <button
                  type="button"
                  data-remove-row="${idx}"
                  class="w-6 h-6 inline-flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
                  title="Hapus baris satuan ini"
                >
                  ✕
                </button>
              `
                  : `<span class="text-slate-300 text-xs">-</span>`
              }
            </td>
          </tr>
        `;
      })
      .join("");

    // Attach listeners on dynamic table
    tbody.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const row = e.target.closest("tr");
        const idx = parseInt(row.getAttribute("data-unit-idx"), 10);
        const field = e.target.getAttribute("data-field");
        if (field === "conversion_factor" || field.startsWith("price_")) {
          this.units[idx][field] = parseFloat(e.target.value) || 0;
        } else {
          this.units[idx][field] = e.target.value;
        }
      });
    });

    tbody.querySelectorAll("[data-remove-row]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-remove-row"), 10);
        if (idx > 0) {
          this.units.splice(idx, 1);
          this.renderUnitRows();
        }
      });
    });
  }

  attachListeners() {
    // Close button
    this.modalEl.querySelectorAll("[data-close-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.close();
      });
    });

    // Base unit change updates row 0
    const baseUnitInput = this.modalEl.querySelector("#p-base-unit");
    baseUnitInput?.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      if (this.units.length > 0) {
        this.units[0].unit_name = val;
      }
      this.renderUnitRows();
    });

    // Add unit row
    this.modalEl.querySelector("#btn-add-unit-row")?.addEventListener("click", () => {
      this.units.push({
        id: null,
        unit_name: "",
        conversion_factor: 10,
        barcode: "",
        price_retail: 0,
        price_contractor: 0,
        price_wholesale: 0,
      });
      this.renderUnitRows();
    });

    // Submit product
    this.modalEl.querySelector("#btn-submit-product")?.addEventListener("click", () => {
      this.handleSubmit();
    });
  }

  handleSubmit() {
    const sku = this.modalEl.querySelector("#p-sku").value.trim();
    const name = this.modalEl.querySelector("#p-name").value.trim();
    const category_id = parseInt(this.modalEl.querySelector("#p-category").value, 10);
    const rack_location = this.modalEl.querySelector("#p-rack").value.trim();
    const base_unit = this.modalEl.querySelector("#p-base-unit").value.trim();
    const low_stock_threshold = parseFloat(this.modalEl.querySelector("#p-low-stock").value) || 0;
    const description = this.modalEl.querySelector("#p-description").value.trim();

    let initial_stock = 0;
    const initStockEl = this.modalEl.querySelector("#p-initial-stock");
    if (initStockEl) {
      initial_stock = parseFloat(initStockEl.value) || 0;
    }

    if (!sku || !name || !base_unit) {
      alert("Mohon isi SKU, Nama Barang, dan Satuan Dasar.");
      return;
    }

    // Ensure base unit row is set correctly
    this.units[0].unit_name = base_unit;
    this.units[0].conversion_factor = 1.0;

    const payload = {
      sku,
      name,
      category_id,
      rack_location,
      base_unit,
      low_stock_threshold,
      initial_stock,
      description,
      units: this.units.map((u) => ({
        id: u.id,
        unit_name: u.unit_name.trim(),
        conversion_factor: parseFloat(u.conversion_factor) || 1.0,
        barcode: u.barcode ? u.barcode.trim() : null,
        price_retail: parseFloat(u.price_retail) || 0,
        price_contractor: parseFloat(u.price_contractor) || 0,
        price_wholesale: parseFloat(u.price_wholesale) || 0,
      })),
    };

    if (this.onSave) {
      this.onSave(payload, this.isEdit, this.product?.id);
    }
    this.close();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.remove();
    }
    if (this.onClose) {
      this.onClose();
    }
  }
}
