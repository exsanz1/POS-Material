/**
 * POSModule Component — Split-Screen White Minimalist Point of Sale
 * 60% Left: Fast Catalog & Multi-Token Acronym Search
 * 40% Right: Active Cart / Invoice with Unit Conversions, Over-Stock Warnings & Hold Carts
 * Full Keyboard-First Navigation: F1, F2, F4, F12
 */

import { Badge } from "./Badge.js";
import { CurrencyInput } from "./CurrencyInput.js";
import { QuantityInput } from "./QuantityInput.js";
import { PrintTemplates } from "./PrintTemplates.js";


export class POSModule {
  /**
   * @param {Object} options
   * @param {Array<Object>} options.products - Master products with units and stock
   * @param {Array<Object>} options.customers - Customer list with price tiers
   * @param {Array<Object>} options.categories - Categories list
   * @param {Function} options.onCheckoutSuccess - Callback after transaction completed
   */
  constructor({ products = [], customers = [], categories = [], onCheckoutSuccess }) {
    this.products = products;
    this.customers = customers;
    this.categories = categories;
    this.onCheckoutSuccess = onCheckoutSuccess;

    // Multi-cart state for F4 Hold / Tab system
    this.heldCarts = [
      {
        id: "cart-1",
        label: "Faktur #1 (Aktif)",
        customer_id: null,
        customer_tier: "retail",
        items: [],
        createdAt: new Date(),
      },
    ];
    this.activeCartId = "cart-1";

    // Search and filtering state
    this.searchQuery = "";
    this.selectedCategory = null;
    this.selectedCatalogIndex = 0;

    // Checkout modal state
    this.isCheckoutModalOpen = false;

    // Bind keyboard shortcut handler
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  get activeCart() {
    return this.heldCarts.find((c) => c.id === this.activeCartId) || this.heldCarts[0];
  }

  setProducts(newProducts) {
    this.products = newProducts;
  }

  setCustomers(newCustomers) {
    this.customers = newCustomers;
  }

  setCategories(newCategories) {
    this.categories = newCategories;
  }

  /**
   * Smart token & acronym search matcher.
   * Supports:
   * - Substring match ("semen")
   * - Subsequence / consonant contraction ("smn" -> "semen", "grs" -> "gresik")
   * - Word initials / acronym ("tr" -> "Tiga Roda")
   */
  static matchesSearch(product, query) {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const tokens = q.split(/\s+/).filter(Boolean);

    const name = product.name.toLowerCase();
    const sku = product.sku.toLowerCase();
    const rack = (product.rack_location || "").toLowerCase();
    const base = product.base_unit.toLowerCase();
    const fullText = `${name} ${sku} ${rack} ${base}`;

    const words = name.split(/[\s\-_,.]+/).filter(Boolean);
    const initials = words.map((w) => w[0]).join("");

    return tokens.every((token) => {
      // 1. Direct substring in full text
      if (fullText.includes(token)) return true;

      // 2. Acronym match (e.g. "tr" in "tiga roda")
      if (initials.includes(token)) return true;

      // 3. Subsequence consonant match against any word (e.g. "smn" against "semen")
      return words.some((word) => {
        let tIdx = 0;
        for (let i = 0; i < word.length && tIdx < token.length; i++) {
          if (word[i] === token[tIdx]) tIdx++;
        }
        return tIdx === token.length;
      });
    });
  }

  /**
   * Determine unit price based on active tier and wholesale volume rules.
   */
  getUnitPrice(product, unitName, quantity = 1, tier = "retail") {
    const unit = (product.units || []).find((u) => u.unit_name === unitName) || product.units?.[0];
    if (!unit) return 0;

    let price = unit.price_retail;
    if (tier === "contractor") price = unit.price_contractor;
    if (tier === "wholesale") price = unit.price_wholesale;

    return price;
  }

  render(container) {
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    if (!this.container) return;

    // Attach global keyboard listener
    window.removeEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keydown", this.handleKeyDown);

    this.container.innerHTML = `
      <div class="flex h-full w-full gap-4 overflow-hidden select-none">
        <!-- ============================================== -->
        <!-- LEFT 60%: CATALOG & FAST SEARCH                -->
        <!-- ============================================== -->
        <div class="w-[60%] flex flex-col h-full bg-white rounded-md border border-[#E2E8F0] overflow-hidden">
          <!-- Search Header Bar -->
          <div class="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">Katalog Cepat</span>
                <span class="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                  ${this.products.length} SKU
                </span>
              </div>
              
              <!-- Keyboard Shortcut Hints -->
              <div class="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <span class="px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-slate-700 font-semibold">[F1] Cari</span>
                <span class="px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-slate-700 font-semibold">[F2] Tier</span>
                <span class="px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-slate-700 font-semibold">[F4] Hold</span>
                <span class="px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-blue-700 font-semibold border-blue-200 bg-blue-50">[F12] Bayar</span>
              </div>
            </div>

            <!-- Search Input with Keyboard Indicator -->
            <div class="relative w-full">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                id="pos-fast-search"
                value="${this.searchQuery}"
                placeholder="Ketik nama / SKU / singkatan (contoh: 'smn tr 50', 'bsi 10', 'psr') [F1]..."
                class="w-full h-9 pl-9 pr-14 text-xs bg-white border border-[#E2E8F0] rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                autocomplete="off"
              />
              <span class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <kbd class="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">F1</kbd>
              </span>
            </div>

            <!-- Category Pills Bar -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
              <button
                type="button"
                data-cat-filter=""
                class="px-2.5 py-1 rounded-[4px] border border-[#E2E8F0] text-slate-700 transition-colors shrink-0 ${
                  this.selectedCategory === null ? "bg-slate-900 text-white font-medium border-slate-900" : "bg-white hover:bg-slate-100"
                }"
              >
                Semua
              </button>
              ${this.categories
                .map((cat) => {
                  const isSelected = this.selectedCategory === cat.id;
                  return `
                    <button
                      type="button"
                      data-cat-filter="${cat.id}"
                      class="px-2.5 py-1 rounded-[4px] border border-[#E2E8F0] text-slate-700 transition-colors shrink-0 ${
                        isSelected ? "bg-slate-900 text-white font-medium border-slate-900" : "bg-white hover:bg-slate-100"
                      }"
                    >
                      ${cat.name}
                    </button>
                  `;
                })
                .join("")}
            </div>
          </div>

          <!-- Product Results List (High-Density Table) -->
          <div class="flex-1 overflow-auto bg-white" id="pos-catalog-container">
            <!-- Dynamically populated table -->
          </div>
        </div>

        <!-- ============================================== -->
        <!-- RIGHT 40%: ACTIVE CART / INVOICE               -->
        <!-- ============================================== -->
        <div class="w-[40%] flex flex-col h-full bg-white rounded-md border border-[#E2E8F0] overflow-hidden">
          <!-- Hold / Tab Bar (F4) -->
          <div class="px-3 pt-2.5 pb-2 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
            <!-- Tabs of Held Carts -->
            <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar" id="pos-tabs-container">
              ${this.heldCarts
                .map((cart, idx) => {
                  const isActive = cart.id === this.activeCartId;
                  const count = cart.items.length;
                  return `
                    <button
                      type="button"
                      data-switch-cart="${cart.id}"
                      class="h-7 px-2.5 text-xs rounded border transition-colors flex items-center gap-1.5 shrink-0 ${
                        isActive
                          ? "bg-white text-slate-900 font-semibold border-[#E2E8F0] shadow-sm"
                          : "bg-slate-200/60 text-slate-600 hover:text-slate-900 border-transparent"
                      }"
                    >
                      <span>Faktur #${idx + 1}</span>
                      ${
                        count > 0
                          ? `<span class="text-[10px] font-mono px-1 rounded ${
                              isActive ? "bg-blue-100 text-blue-700" : "bg-slate-300 text-slate-700"
                            }">${count}</span>`
                          : ""
                      }
                    </button>
                  `;
                })
                .join("")}

              <button
                type="button"
                id="btn-hold-cart"
                title="Hold transaksi aktif & buka faktur baru [F4]"
                class="h-7 px-2 bg-white border border-[#E2E8F0] hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs rounded transition-colors flex items-center gap-1 shrink-0"
              >
                <span>+ Hold [F4]</span>
              </button>
            </div>

            <!-- Clear Cart Action -->
            <button
              type="button"
              id="btn-clear-cart"
              title="Kosongkan keranjang aktif"
              class="text-slate-400 hover:text-rose-600 text-xs p-1"
            >
              Kosongkan
            </button>
          </div>

          <!-- Customer & Price Tier Toolbar (F2) -->
          <div class="p-3 border-b border-[#E2E8F0] bg-white grid grid-cols-2 gap-3 text-xs">
            <div>
              <label class="block text-[11px] font-medium text-slate-600 mb-1">Pelanggan</label>
              <select id="pos-customer-select" class="w-full h-8 px-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs text-slate-900 focus:outline-none focus:border-blue-600">
                <option value="" ${!this.activeCart.customer_id ? "selected" : ""}>Umum / Walk-In (Tunai)</option>
                ${this.customers
                  .map(
                    (c) => `
                  <option value="${c.id}" ${this.activeCart.customer_id === c.id ? "selected" : ""}>
                    ${c.name} (${c.price_tier})
                  </option>
                `
                  )
                  .join("")}
              </select>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-[11px] font-medium text-slate-600">Level Harga</label>
                <kbd class="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">F2</kbd>
              </div>
              <button
                type="button"
                id="btn-toggle-tier"
                class="w-full h-8 px-2.5 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] rounded text-xs font-semibold text-slate-800 flex items-center justify-between transition-colors"
                title="Tekan F2 untuk mengganti level harga faktur"
              >
                <span id="tier-label-display">${this.getTierLabel(this.activeCart.customer_tier)}</span>
                <span class="text-slate-400 text-[10px]">⇄ Ganti</span>
              </button>
            </div>
          </div>

          <!-- Cart Line Items Container -->
          <div class="flex-1 overflow-auto p-3 space-y-2.5 bg-white" id="pos-cart-items-container">
            <!-- Dynamically populated cart cards -->
          </div>

          <!-- Bottom: Cart Summary & Checkout Action (F12) -->
          <div class="border-t border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-3 select-none">
            <!-- Overstock warning banner if applicable -->
            <div id="overstock-global-alert" class="hidden p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center gap-1.5">
              <svg class="w-4 h-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Perhatian: Satu atau lebih item melebihi <strong>stok fisik tersedia</strong>.</span>
            </div>

            <!-- Grand Total Calculation Display -->
            <div class="flex items-baseline justify-between pt-1">
              <div>
                <div class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">TOTAL TAGIHAN</div>
                <div class="text-xs text-slate-600 font-mono tabular-nums">
                  <span id="cart-item-count">0</span> item (<span id="cart-qty-count">0</span> kuantitas)
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold font-mono text-slate-900 tabular-nums tracking-tight" id="cart-grand-total">
                  Rp 0
                </div>
              </div>
            </div>

            <!-- Main Checkout Button [F12] -->
            <button
              type="button"
              id="btn-open-checkout"
              class="w-full h-11 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>BAYAR & PENGIRIMAN</span>
              <kbd class="px-1.5 py-0.5 bg-blue-700/80 rounded text-[10px] font-mono font-normal">F12</kbd>
            </button>
          </div>
        </div>
      </div>

      <!-- Checkout & Delivery Modal Container -->
      <div id="checkout-modal-container"></div>
    `;

    // Render left catalog table
    this.renderCatalogTable();

    // Render right cart items
    this.renderCartView();

    // Attach listeners
    this.attachDOMListeners();
  }

  getTierLabel(tier) {
    if (tier === "contractor") return "Harga Tukang";
    if (tier === "wholesale") return "Harga Proyek/Grosir";
    return "Harga Eceran (Retail)";
  }

  cyclePriceTier() {
    const tiers = ["retail", "contractor", "wholesale"];
    const currentIdx = tiers.indexOf(this.activeCart.customer_tier || "retail");
    const nextTier = tiers[(currentIdx + 1) % tiers.length];
    this.activeCart.customer_tier = nextTier;

    // Recalculate price for all items in cart based on their selected unit and new tier
    this.activeCart.items.forEach((item) => {
      item.unitPrice = this.getUnitPrice(item.product, item.selectedUnit, item.quantity, nextTier);
    });

    // Update UI
    const tierDisplay = this.container.querySelector("#tier-label-display");
    if (tierDisplay) tierDisplay.innerText = this.getTierLabel(nextTier);

    this.renderCatalogTable();
    this.renderCartView();
  }

  renderCatalogTable() {
    const catalogContainer = this.container.querySelector("#pos-catalog-container");
    if (!catalogContainer) return;

    // Filter products
    const filtered = this.products.filter((p) => {
      if (this.selectedCategory && p.category_id !== this.selectedCategory) return false;
      return POSModule.matchesSearch(p, this.searchQuery);
    });

    if (filtered.length === 0) {
      catalogContainer.innerHTML = `
        <div class="h-64 flex flex-col items-center justify-center text-slate-400 space-y-1">
          <svg class="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <div class="text-xs">Tidak ada barang yang cocok dengan "${this.searchQuery}"</div>
          <div class="text-[10px] text-slate-400">Coba kata kunci lain atau hapus filter kategori</div>
        </div>
      `;
      return;
    }

    catalogContainer.innerHTML = `
      <table class="w-full text-left border-collapse table-compact">
        <thead class="sticky top-0 z-10 bg-slate-50/95 border-b border-[#E2E8F0]">
          <tr>
            <th class="w-24">SKU</th>
            <th>Nama Barang & Lokasi Rak</th>
            <th class="w-32">Satuan Tersedia</th>
            <th class="w-28 text-right">Harga (${this.activeCart.customer_tier})</th>
            <th class="w-24 text-right">Tersedia</th>
            <th class="w-12 text-center">+</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#E2E8F0] bg-white">
          ${filtered
            .map((p, idx) => {
              const u0 = p.units?.[0] || { unit_name: p.base_unit, conversion_factor: 1 };
              const currentPrice = this.getUnitPrice(p, u0.unit_name, 1, this.activeCart.customer_tier);
              const isSelected = idx === this.selectedCatalogIndex;
              const isOutOfStock = p.available_stock <= 0;

              return `
                <tr
                  data-catalog-sku="${p.sku}"
                  class="cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                  } ${isOutOfStock ? "opacity-60" : ""}"
                >
                  <td class="font-mono text-[11px] text-slate-600 font-medium">${p.sku}</td>
                  <td>
                    <div class="font-medium text-slate-900 leading-tight">${p.name}</div>
                    <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>Rak: <strong class="text-slate-700">${p.rack_location || "Gudang"}</strong></span>
                      <span>•</span>
                      <span>${p.category_name || "-"}</span>
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center gap-1 flex-wrap text-[10px] font-mono">
                      ${(p.units || [])
                        .map(
                          (u) =>
                            `<span class="px-1 py-0.2 rounded bg-slate-100 border border-[#E2E8F0] text-slate-700">${u.unit_name}</span>`
                        )
                        .join("")}
                    </div>
                  </td>
                  <td class="text-right font-mono tabular-nums text-slate-900 font-semibold text-xs">
                    Rp ${currentPrice.toLocaleString("id-ID")}
                  </td>
                  <td class="text-right font-mono tabular-nums text-xs">
                    <span class="${isOutOfStock ? "text-rose-600 font-bold" : "text-slate-800 font-semibold"}">
                      ${p.available_stock.toLocaleString("id-ID")}
                    </span>
                    <span class="text-[10px] text-slate-400 font-normal">${p.base_unit}</span>
                  </td>
                  <td class="text-center">
                    <button
                      type="button"
                      data-add-item-sku="${p.sku}"
                      class="w-6 h-6 rounded bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition-colors inline-flex items-center justify-center"
                      title="Tambahkan ke keranjang"
                    >
                      +
                    </button>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    // Catalog row click to add to cart
    catalogContainer.querySelectorAll("[data-catalog-sku]").forEach((row) => {
      row.addEventListener("click", () => {
        const sku = row.getAttribute("data-catalog-sku");
        this.addItemToCart(sku);
      });
    });
  }

  addItemToCart(sku) {
    const product = this.products.find((p) => p.sku === sku);
    if (!product) return;

    // Check if item already exists in cart with same default unit
    const defaultUnit = product.units?.[0]?.unit_name || product.base_unit;
    const existing = this.activeCart.items.find(
      (item) => item.product.sku === sku && item.selectedUnit === defaultUnit
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      const unitObj = product.units?.find((u) => u.unit_name === defaultUnit) || {
        unit_name: defaultUnit,
        conversion_factor: 1,
      };
      const unitPrice = this.getUnitPrice(
        product,
        defaultUnit,
        1,
        this.activeCart.customer_tier
      );

      this.activeCart.items.push({
        product,
        selectedUnit: defaultUnit,
        conversionFactor: unitObj.conversion_factor,
        quantity: 1,
        unitPrice,
      });
    }

    this.renderCartView();
  }

  renderCartView() {
    const cartContainer = this.container.querySelector("#pos-cart-items-container");
    const grandTotalEl = this.container.querySelector("#cart-grand-total");
    const itemCountEl = this.container.querySelector("#cart-item-count");
    const qtyCountEl = this.container.querySelector("#cart-qty-count");
    const checkoutBtn = this.container.querySelector("#btn-open-checkout");
    const overstockAlert = this.container.querySelector("#overstock-global-alert");
    if (!cartContainer) return;

    const items = this.activeCart.items;
    let grandTotal = 0;
    let totalQty = 0;
    let hasOverstock = false;

    if (items.length === 0) {
      cartContainer.innerHTML = `
        <div class="h-64 flex flex-col items-center justify-center text-slate-400 space-y-1">
          <svg class="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
          <div class="text-xs">Keranjang masih kosong</div>
          <div class="text-[10px] text-slate-400">Pilih barang di panel kiri atau tekan [F1] untuk mencari</div>
        </div>
      `;
      if (grandTotalEl) grandTotalEl.innerText = "Rp 0";
      if (itemCountEl) itemCountEl.innerText = "0";
      if (qtyCountEl) qtyCountEl.innerText = "0";
      if (checkoutBtn) checkoutBtn.disabled = true;
      if (overstockAlert) overstockAlert.classList.add("hidden");
      return;
    }

    cartContainer.innerHTML = items
      .map((item, idx) => {
        const subtotal = item.quantity * item.unitPrice;
        grandTotal += subtotal;
        totalQty += item.quantity;

        // Stock calculation
        const baseQtyDemanded = item.quantity * item.conversionFactor;
        const available = item.product.available_stock;
        const isOverStock = baseQtyDemanded > available;
        if (isOverStock) hasOverstock = true;

        return `
          <div class="p-2.5 rounded-md border ${
            isOverStock ? "border-rose-300 bg-rose-50/20" : "border-[#E2E8F0] bg-white"
          } space-y-2 transition-colors">
            <!-- Item Title & Remove Action -->
            <div class="flex items-start justify-between gap-2">
              <div class="truncate">
                <div class="font-medium text-xs text-slate-900 truncate leading-snug">${item.product.name}</div>
                <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                  <span>${item.product.sku}</span>
                  <span>•</span>
                  <span>Rak: ${item.product.rack_location || "Gudang"}</span>
                </div>
              </div>
              <button
                type="button"
                data-remove-cart-idx="${idx}"
                class="text-slate-400 hover:text-rose-600 text-xs font-bold p-1 rounded hover:bg-slate-100"
                title="Hapus barang"
              >
                ✕
              </button>
            </div>

            <!-- Overstock Warning Indicator -->
            ${
              isOverStock
                ? `
              <div class="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-[10px] text-rose-700 font-medium flex items-center gap-1">
                <span>⚠️ Stok Tidak Cukup! Diminta: <strong>${baseQtyDemanded}</strong>, Tersedia: <strong>${available}</strong> ${item.product.base_unit}</span>
              </div>
            `
                : ""
            }

            <!-- Controls: Unit Dropdown + QuantityInput + Subtotal -->
            <div class="flex items-center justify-between pt-1.5 border-t border-slate-100 gap-2">
              <!-- Unit Dropdown Selector (Feature 2) -->
              <div class="flex items-center gap-1">
                <select
                  data-cart-unit-select="${idx}"
                  class="h-7 px-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                  title="Ganti Satuan Jual"
                >
                  ${(item.product.units || [])
                    .map((u) => {
                      const isSel = u.unit_name === item.selectedUnit;
                      const factorLabel = u.conversion_factor > 1 ? ` (${u.conversion_factor} ${item.product.base_unit})` : "";
                      return `<option value="${u.unit_name}" ${isSel ? "selected" : ""}>${u.unit_name}${factorLabel}</option>`;
                    })
                    .join("")}
                </select>
              </div>

              <!-- Quantity Input Stepper -->
              <div id="cart-item-qty-${idx}">
                ${QuantityInput.render({
                  id: `input-qty-${idx}`,
                  value: item.quantity,
                  conversionFactor: item.conversionFactor,
                  baseUnit: item.product.base_unit,
                  unitName: item.selectedUnit,
                  size: "sm",
                })}
              </div>

              <!-- Price & Subtotal -->
              <div class="text-right">
                <div class="text-xs font-bold font-mono tabular-nums text-slate-900">
                  Rp ${subtotal.toLocaleString("id-ID")}
                </div>
                <div class="text-[10px] text-slate-500 font-mono tabular-nums">
                  @ Rp ${item.unitPrice.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    if (grandTotalEl) grandTotalEl.innerText = `Rp ${grandTotal.toLocaleString("id-ID")}`;
    if (itemCountEl) itemCountEl.innerText = items.length;
    if (qtyCountEl) qtyCountEl.innerText = totalQty;
    if (checkoutBtn) checkoutBtn.disabled = items.length === 0;

    if (overstockAlert) {
      if (hasOverstock) {
        overstockAlert.classList.remove("hidden");
      } else {
        overstockAlert.classList.add("hidden");
      }
    }

    // Attach quantity stepper events
    items.forEach((item, idx) => {
      QuantityInput.attach(this.container.querySelector(`#cart-item-qty-${idx}`), (newQty) => {
        item.quantity = newQty;
        this.renderCartView();
      });
    });

    // Attach unit change dropdown events (Feature 2)
    cartContainer.querySelectorAll("[data-cart-unit-select]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const idx = parseInt(sel.getAttribute("data-cart-unit-select"), 10);
        const newUnitName = e.target.value;
        const item = this.activeCart.items[idx];
        const unitObj = item.product.units?.find((u) => u.unit_name === newUnitName);

        if (unitObj) {
          item.selectedUnit = newUnitName;
          item.conversionFactor = unitObj.conversion_factor;
          item.unitPrice = this.getUnitPrice(
            item.product,
            newUnitName,
            item.quantity,
            this.activeCart.customer_tier
          );
          this.renderCartView();
        }
      });
    });

    // Attach remove buttons
    cartContainer.querySelectorAll("[data-remove-cart-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-remove-cart-idx"), 10);
        this.activeCart.items.splice(idx, 1);
        this.renderCartView();
      });
    });
  }

  attachDOMListeners() {
    // Search input typing
    const searchInp = this.container.querySelector("#pos-fast-search");
    searchInp?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.renderCatalogTable();
    });

    // Search enter to add first match
    searchInp?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const filtered = this.products.filter((p) => {
          if (this.selectedCategory && p.category_id !== this.selectedCategory) return false;
          return POSModule.matchesSearch(p, this.searchQuery);
        });
        if (filtered.length > 0) {
          this.addItemToCart(filtered[0].sku);
          searchInp.select();
        }
      }
    });

    // Category filter pills
    this.container.querySelectorAll("[data-cat-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const catVal = btn.getAttribute("data-cat-filter");
        this.selectedCategory = catVal ? parseInt(catVal, 10) : null;
        this.renderCatalogTable();
        // Update category active styles
        this.container.querySelectorAll("[data-cat-filter]").forEach((b) => {
          b.className = b.className.replace(/bg-slate-900 text-white font-medium border-slate-900/g, "bg-white hover:bg-slate-100");
        });
        btn.classList.remove("bg-white", "hover:bg-slate-100");
        btn.classList.add("bg-slate-900", "text-white", "font-medium", "border-slate-900");
      });
    });

    // Customer selector change
    const custSel = this.container.querySelector("#pos-customer-select");
    custSel?.addEventListener("change", (e) => {
      const custId = e.target.value ? parseInt(e.target.value, 10) : null;
      this.activeCart.customer_id = custId;
      if (custId) {
        const cust = this.customers.find((c) => c.id === custId);
        if (cust) {
          this.activeCart.customer_tier = cust.price_tier || "retail";
          this.cyclePriceTier(); // trigger price refresh
        }
      }
    });

    // Price tier toggle button (F2)
    this.container.querySelector("#btn-toggle-tier")?.addEventListener("click", () => {
      this.cyclePriceTier();
    });

    // Hold cart button (F4)
    this.container.querySelector("#btn-hold-cart")?.addEventListener("click", () => {
      this.holdActiveCartAndNew();
    });

    // Switch cart tab
    this.container.querySelectorAll("[data-switch-cart]").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        const cartId = tabBtn.getAttribute("data-switch-cart");
        this.activeCartId = cartId;
        this.render(this.container);
      });
    });

    // Clear cart button
    this.container.querySelector("#btn-clear-cart")?.addEventListener("click", () => {
      if (confirm("Kosongkan keranjang faktur ini?")) {
        this.activeCart.items = [];
        this.renderCartView();
      }
    });

    // Open checkout modal (F12)
    this.container.querySelector("#btn-open-checkout")?.addEventListener("click", () => {
      this.openCheckoutModal();
    });
  }

  holdActiveCartAndNew() {
    const newIdx = this.heldCarts.length + 1;
    const newCartId = `cart-${Date.now()}`;
    this.heldCarts.push({
      id: newCartId,
      label: `Faktur #${newIdx}`,
      customer_id: null,
      customer_tier: "retail",
      items: [],
      createdAt: new Date(),
    });
    this.activeCartId = newCartId;
    this.render(this.container);

    // Focus search
    setTimeout(() => {
      this.focusSearch();
    }, 100);
  }

  focusSearch() {
    const searchInp = this.container?.querySelector("#pos-fast-search");
    if (searchInp) {
      searchInp.focus();
      searchInp.select();
    }
  }

  handleKeyDown(e) {
    // Only handle if POS view is active
    if (!this.container || !document.body.contains(this.container)) return;

    if (e.key === "F1") {
      e.preventDefault();
      this.focusSearch();
    } else if (e.key === "F2") {
      e.preventDefault();
      this.cyclePriceTier();
    } else if (e.key === "F4") {
      e.preventDefault();
      this.holdActiveCartAndNew();
    } else if (e.key === "F12") {
      e.preventDefault();
      if (this.activeCart.items.length > 0) {
        this.openCheckoutModal();
      }
    } else if (e.key === "Escape") {
      if (this.isCheckoutModalOpen) {
        this.closeCheckoutModal();
      }
    }
  }

  // ==========================================
  // ==========================================
  // CHECKOUT & DELIVERY MODAL (F12)
  // ==========================================
  openCheckoutModal() {
    const modalContainer = this.container.querySelector("#checkout-modal-container");
    if (!modalContainer) return;

    const items = this.activeCart.items;
    const grandTotal = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);

    // Modal local state
    let customerId = this.activeCart.customer_id;
    let paymentMode = "paid"; // 'paid', 'dp', 'tempo'
    let paymentMethod = "cash"; // 'cash', 'transfer', 'qris', 'edc'
    let deliveryMode = "taken"; // 'taken', 'delivery'
    let isSplitDelivery = false; // true if 'Kirim Sebagian'
    let paidAmount = grandTotal;
    let tenderAmount = grandTotal;

    // Default due date: +30 days
    const defaultDueDateObj = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    let dueDate = defaultDueDateObj.toISOString().split("T")[0];

    // Delivery fields
    let deliveryAddress = "";
    let driverName = "";
    let vehicleInfo = "";
    let deliveryNotes = "";

    // Per-item split states
    const itemSplits = items.map((it) => ({
      item: it,
      takeNow: deliveryMode === "taken" ? it.quantity : 0,
      shipLater: deliveryMode === "taken" ? 0 : it.quantity,
    }));

    const getSelectedCustomer = () => {
      return this.customers.find((c) => c.id === customerId) || null;
    };

    // Initialize delivery address if customer exists
    const initCust = getSelectedCustomer();
    if (initCust && initCust.address) {
      deliveryAddress = initCust.address;
    }

    const renderModal = () => {
      const cust = getSelectedCustomer();
      const creditLimit = cust ? (cust.credit_limit || 0) : 0;
      const currentDebt = cust ? (cust.current_debt || 0) : 0;
      const remainingCredit = cust ? (cust.remaining_credit !== undefined ? cust.remaining_credit : creditLimit - currentDebt) : 0;

      // Calculate new debt
      let newDebt = 0;
      if (paymentMode === "tempo") {
        newDebt = grandTotal;
      } else if (paymentMode === "dp") {
        newDebt = Math.max(0, grandTotal - paidAmount);
      }

      const postRemainingCredit = remainingCredit - newDebt;
      const isCreditExceeded = (paymentMode === "dp" || paymentMode === "tempo") && (creditLimit <= 0 || newDebt > remainingCredit);
      const isCustomerMissing = (paymentMode === "dp" || paymentMode === "tempo") && !cust;

      // Split delivery integrity check
      let isSplitValid = true;
      if (deliveryMode === "delivery" && isSplitDelivery) {
        isSplitValid = itemSplits.every((s) => {
          return s.takeNow >= 0 && s.shipLater >= 0 && (s.takeNow + s.shipLater === s.item.quantity);
        });
      }

      // Checkout submit button disabled condition
      const canSubmit = !isCustomerMissing && !isCreditExceeded && isSplitValid && (paymentMode !== "dp" || (paidAmount > 0 && paidAmount < grandTotal)) && (paymentMode === "paid" ? tenderAmount >= grandTotal : !!dueDate);

      const change = Math.max(0, tenderAmount - grandTotal);

      modalContainer.innerHTML = `
        <div id="checkout-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 select-none">
          <div class="w-full max-w-3xl bg-white rounded-md border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden text-xs max-h-[92vh]">
            <!-- Modal Header -->
            <div class="px-5 py-3 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Checkout Kasir: Pembayaran & Pengiriman [F12]
                </h3>
              </div>
              <button type="button" data-close-checkout class="text-slate-400 hover:text-slate-700 text-base font-bold">
                ✕
              </button>
            </div>

            <!-- Modal Scrollable Content -->
            <div class="p-5 space-y-4 overflow-y-auto flex-1">
              <!-- Billboard: Grand Total & Customer -->
              <div class="p-3.5 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <div class="space-y-1">
                  <div class="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Total Tagihan Nota</div>
                  <div class="flex items-center gap-2">
                    <label class="text-xs text-slate-600 font-medium">Pelanggan:</label>
                    <select id="modal-customer-select" class="h-7 px-2 bg-white border border-[#E2E8F0] rounded text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600">
                      <option value="" ${!customerId ? "selected" : ""}>Umum / Walk-In (Tanpa Piutang)</option>
                      ${this.customers
                        .map(
                          (c) => `
                        <option value="${c.id}" ${customerId === c.id ? "selected" : ""}>
                          ${c.name} (${c.price_tier.toUpperCase()}) - Limit: Rp ${(c.credit_limit || 0).toLocaleString("id-ID")}
                        </option>
                      `
                        )
                        .join("")}
                    </select>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-[10px] text-slate-500 font-mono">${items.length} Item Produk</div>
                  <div class="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    Rp ${grandTotal.toLocaleString("id-ID")}
                  </div>
                </div>
              </div>

              <!-- ============================================== -->
              <!-- SECTION 1: LOGIKA PEMBAYARAN                   -->
              <!-- ============================================== -->
              <div class="p-3.5 rounded-md border border-[#E2E8F0] bg-white space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. Metode & Status Pembayaran</span>
                  </label>
                  <span class="text-[10px] font-mono text-slate-500">Mendukung Lunas, DP, dan Tempo</span>
                </div>

                <!-- Payment Mode Switcher Tabs -->
                <div class="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    data-pay-mode="paid"
                    class="h-9 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      paymentMode === "paid"
                        ? "border border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-sm"
                        : "border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50"
                    }"
                  >
                    <span>Lunas (Full)</span>
                  </button>
                  <button
                    type="button"
                    data-pay-mode="dp"
                    class="h-9 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      paymentMode === "dp"
                        ? "border border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-sm"
                        : "border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50"
                    }"
                  >
                    <span>Uang Muka (DP)</span>
                  </button>
                  <button
                    type="button"
                    data-pay-mode="tempo"
                    class="h-9 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      paymentMode === "tempo"
                        ? "border border-amber-600 bg-amber-50 text-amber-800 font-bold shadow-sm"
                        : "border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50"
                    }"
                  >
                    <span>Tempo (Piutang)</span>
                  </button>
                </div>

                <!-- Detail Panel for Lunas -->
                ${
                  paymentMode === "paid"
                    ? `
                  <div class="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] space-y-2.5">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-slate-600 font-medium">Cara Bayar:</span>
                      <div class="flex items-center gap-1.5">
                        ${["cash", "transfer", "qris", "edc"]
                          .map((m) => {
                            const labels = { cash: "Tunai", transfer: "Transfer Bank", qris: "QRIS", edc: "Kartu Debit/EDC" };
                            const isActive = paymentMethod === m;
                            return `
                            <button
                              type="button"
                              data-pay-method="${m}"
                              class="px-2.5 py-1 text-xs rounded border transition-colors ${
                                isActive ? "bg-slate-900 text-white font-medium border-slate-900" : "bg-white text-slate-700 border-[#E2E8F0] hover:bg-slate-100"
                              }"
                            >
                              ${labels[m]}
                            </button>
                          `;
                          })
                          .join("")}
                      </div>
                    </div>

                    ${
                      paymentMethod === "cash"
                        ? `
                      <div class="space-y-2 pt-1 border-t border-slate-200">
                        <div class="flex items-center justify-between">
                          <label class="text-xs text-slate-700 font-medium">Uang Tunai Diterima:</label>
                          <div class="w-48 font-mono">
                            <input
                              type="text"
                              id="input-cash-tendered"
                              value="${tenderAmount.toLocaleString("id-ID")}"
                              class="w-full h-8 px-2 text-right bg-white border border-[#E2E8F0] rounded font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                            />
                          </div>
                        </div>

                        <!-- Presets -->
                        <div class="flex items-center gap-1.5 justify-end">
                          <button type="button" data-cash-preset="exact" class="px-2 py-0.5 bg-white border border-[#E2E8F0] text-[10px] rounded hover:bg-slate-100">Uang Pas</button>
                          <button type="button" data-cash-preset="50000" class="px-2 py-0.5 bg-white border border-[#E2E8F0] text-[10px] rounded hover:bg-slate-100 font-mono">+50rb</button>
                          <button type="button" data-cash-preset="100000" class="px-2 py-0.5 bg-white border border-[#E2E8F0] text-[10px] rounded hover:bg-slate-100 font-mono">+100rb</button>
                          <button type="button" data-cash-preset="500000" class="px-2 py-0.5 bg-white border border-[#E2E8F0] text-[10px] rounded hover:bg-slate-100 font-mono">+500rb</button>
                        </div>

                        <div class="p-2 rounded bg-white border border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
                          <span class="text-slate-600">Kembalian:</span>
                          <span class="font-bold text-emerald-700 text-sm">Rp ${change.toLocaleString("id-ID")}</span>
                        </div>
                      </div>
                    `
                        : `
                      <div class="p-2 rounded bg-white border border-[#E2E8F0] text-xs text-slate-600">
                        Pembayaran via <strong>${paymentMethod.toUpperCase()}</strong>: Nominal pas sebesar <strong>Rp ${grandTotal.toLocaleString("id-ID")}</strong>
                      </div>
                    `
                    }
                  </div>
                `
                    : ""
                }

                <!-- Detail Panel for DP & Tempo (Customer & Credit Validation) -->
                ${
                  paymentMode === "dp" || paymentMode === "tempo"
                    ? `
                  <div class="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] space-y-3">
                    ${
                      isCustomerMissing
                        ? `
                      <div class="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                        <svg class="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Peringatan: Transaksi DP / Tempo <strong>wajib memilih data Pelanggan/Kontraktor terdaftar</strong> untuk pencatatan piutang. Silakan pilih pelanggan di bagian atas.</span>
                      </div>
                    `
                        : `
                      <!-- Customer Credit Card -->
                      <div class="p-3 bg-white rounded border border-[#E2E8F0] space-y-2">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <div class="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <span>Status Limit Kredit Pelanggan:</span>
                            <span class="text-blue-700">${cust.name}</span>
                          </div>
                          <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">${cust.price_tier}</span>
                        </div>

                        <div class="grid grid-cols-4 gap-2 text-[11px] font-mono">
                          <div>
                            <div class="text-[10px] text-slate-500">Plafon Kredit</div>
                            <div class="font-semibold text-slate-800">Rp ${creditLimit.toLocaleString("id-ID")}</div>
                          </div>
                          <div>
                            <div class="text-[10px] text-slate-500">Piutang Berjalan</div>
                            <div class="font-semibold text-amber-700">Rp ${currentDebt.toLocaleString("id-ID")}</div>
                          </div>
                          <div>
                            <div class="text-[10px] text-slate-500">Sisa Limit Tersedia</div>
                            <div class="font-bold ${remainingCredit > 0 ? "text-emerald-700" : "text-rose-700"}">
                              Rp ${remainingCredit.toLocaleString("id-ID")}
                            </div>
                          </div>
                          <div>
                            <div class="text-[10px] text-slate-500">Hutang Transaksi Ini</div>
                            <div class="font-bold text-blue-700">Rp ${newDebt.toLocaleString("id-ID")}</div>
                          </div>
                        </div>

                        ${
                          isCreditExceeded
                            ? `
                          <div class="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                            <span>⚠️ Limit kredit tidak mencukupi! Plafon terlampaui sebesar Rp ${Math.abs(postRemainingCredit).toLocaleString("id-ID")}. Kurangi hutang dengan menambah DP atau lunasi piutang sebelumnya.</span>
                          </div>
                        `
                            : `
                          <div class="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-600">
                            <span>Proyeksi Sisa Limit Setelah Transaksi:</span>
                            <span class="font-bold text-slate-900">Rp ${postRemainingCredit.toLocaleString("id-ID")}</span>
                          </div>
                        `
                        }
                      </div>
                    `
                    }

                    <!-- Due Date Input (Mandatory for DP & Tempo) -->
                    <div class="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">
                          Tanggal Jatuh Tempo <span class="text-rose-600">*</span>:
                        </label>
                        <input
                          type="date"
                          id="modal-due-date"
                          value="${dueDate}"
                          min="${new Date().toISOString().split("T")[0]}"
                          class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      ${
                        paymentMode === "dp"
                          ? `
                        <div>
                          <label class="block text-xs font-semibold text-slate-700 mb-1">
                            Nominal DP (Uang Muka) <span class="text-rose-600">*</span>:
                          </label>
                          <input
                            type="text"
                            id="input-dp-amount"
                            value="${paidAmount.toLocaleString("id-ID")}"
                            class="w-full h-8 px-2.5 text-right bg-white border border-[#E2E8F0] rounded text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                          <div class="flex items-center gap-1 mt-1 justify-end">
                            <button type="button" data-dp-preset="0.2" class="px-1.5 py-0.5 bg-white border border-[#E2E8F0] text-[10px] rounded hover:bg-slate-100 font-mono">20%</button>
                            <button type="button" data-dp-preset="0.3" class="px-1.5 py-0.5 bg-white border border-[#E2E8F0] text-[10px] rounded hover:bg-slate-100 font-mono">30%</button>
                            <button type="button" data-dp-preset="0.5" class="px-1.5 py-0.5 bg-white border border-[#E2E8F0] text-[10px] rounded hover:bg-slate-100 font-mono">50%</button>
                          </div>
                        </div>
                      `
                          : `
                        <div class="flex items-center">
                          <div class="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 w-full">
                            Tempo Penuh: Pembayaran Rp 0 di awal, total tagihan <strong>Rp ${grandTotal.toLocaleString("id-ID")}</strong> dicatat sebagai piutang jatuh tempo.
                          </div>
                        </div>
                      `
                      }
                    </div>
                  </div>
                `
                    : ""
                }
              </div>

              <!-- ============================================== -->
              <!-- SECTION 2: LOGIKA PENGIRIMAN (DELIVERY MODE)    -->
              <!-- ============================================== -->
              <div class="p-3.5 rounded-md border border-[#E2E8F0] bg-white space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <span>2. Mode Pengiriman Barang</span>
                  </label>
                  <span class="text-[10px] font-mono text-slate-500">Bawa Langsung atau Kirim Armada Toko</span>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-deliv-mode="taken"
                    class="h-9 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      deliveryMode === "taken"
                        ? "border border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-sm"
                        : "border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50"
                    }"
                  >
                    <span>Bawa Langsung (Potong Stok Fisik)</span>
                  </button>
                  <button
                    type="button"
                    data-deliv-mode="delivery"
                    class="h-9 px-3 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      deliveryMode === "delivery"
                        ? "border border-blue-600 bg-blue-50 text-blue-800 font-bold shadow-sm"
                        : "border border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50"
                    }"
                  >
                    <span>Kirim Armada / Ambil Nanti (Reserved Stock)</span>
                  </button>
                </div>

                ${
                  deliveryMode === "delivery"
                    ? `
                  <div class="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] space-y-3">
                    <!-- Delivery Option Switch: All or Partial -->
                    <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span class="text-xs font-semibold text-slate-700">Tipe Pengiriman:</span>
                      <div class="flex items-center gap-3">
                        <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                          <input type="radio" name="split_choice" value="all" ${!isSplitDelivery ? "checked" : ""} class="text-blue-600">
                          <span>Kirim Semua Menyusul (DO Penuh)</span>
                        </label>
                        <label class="inline-flex items-center gap-1.5 cursor-pointer text-xs">
                          <input type="radio" name="split_choice" value="partial" ${isSplitDelivery ? "checked" : ""} class="text-blue-600">
                          <span class="font-semibold text-blue-700">Kirim Sebagian (Bawa Sebagian Sekarang)</span>
                        </label>
                      </div>
                    </div>

                    <!-- Split item table if partial delivery selected -->
                    ${
                      isSplitDelivery
                        ? `
                      <div class="space-y-1.5">
                        <div class="text-[11px] font-bold text-slate-800">Atur Kuantitas Bawa Sekarang vs Kirim Nanti:</div>
                        <table class="w-full text-left border-collapse table-compact bg-white rounded border border-[#E2E8F0]">
                          <thead>
                            <tr>
                              <th>Nama Barang</th>
                              <th class="w-20 text-center">Total Beli</th>
                              <th class="w-28 text-center bg-blue-50/50">Bawa Sekarang</th>
                              <th class="w-28 text-center bg-amber-50/50">Kirim Nanti</th>
                              <th class="w-16 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${itemSplits
                              .map((s, idx) => {
                                const isValidRow = s.takeNow >= 0 && s.shipLater >= 0 && (s.takeNow + s.shipLater === s.item.quantity);
                                return `
                                <tr>
                                  <td>
                                    <div class="font-medium text-slate-900">${s.item.product.name}</div>
                                    <div class="text-[10px] text-slate-500 font-mono">${s.item.product.sku}</div>
                                  </td>
                                  <td class="text-center font-mono font-bold text-slate-800">
                                    ${s.item.quantity} ${s.item.selectedUnit}
                                  </td>
                                  <td class="text-center p-1 bg-blue-50/30">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      max="${s.item.quantity}"
                                      data-split-take-now="${idx}"
                                      value="${s.takeNow}"
                                      class="w-20 h-7 text-center font-mono font-bold border border-[#E2E8F0] rounded bg-white text-blue-700 focus:outline-none focus:border-blue-600"
                                    />
                                  </td>
                                  <td class="text-center p-1 bg-amber-50/30">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      max="${s.item.quantity}"
                                      data-split-ship-later="${idx}"
                                      value="${s.shipLater}"
                                      class="w-20 h-7 text-center font-mono font-bold border border-[#E2E8F0] rounded bg-white text-amber-700 focus:outline-none focus:border-blue-600"
                                    />
                                  </td>
                                  <td class="text-center text-[10px] font-bold ${isValidRow ? "text-emerald-600" : "text-rose-600"}">
                                    ${isValidRow ? "OK" : "Mismatch!"}
                                  </td>
                                </tr>
                              `;
                              })
                              .join("")}
                          </tbody>
                        </table>
                      </div>
                    `
                        : ""
                    }

                    <!-- Dispatch Meta Fields -->
                    <div class="space-y-2 pt-1">
                      <div>
                        <label class="block text-[11px] font-medium text-slate-700 mb-0.5">Alamat Pengiriman (Surat Jalan):</label>
                        <textarea
                          id="modal-delivery-address"
                          rows="2"
                          placeholder="Alamat lengkap proyek / pengantaran barang..."
                          class="w-full p-2 bg-white border border-[#E2E8F0] rounded text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                        >${deliveryAddress}</textarea>
                      </div>

                      <div class="grid grid-cols-2 gap-3">
                        <div>
                          <label class="block text-[11px] font-medium text-slate-700 mb-0.5">Nama Sopir / Pengantar (Opsional):</label>
                          <input
                            type="text"
                            id="modal-driver-name"
                            value="${driverName}"
                            placeholder="Contoh: Pak Joko"
                            class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label class="block text-[11px] font-medium text-slate-700 mb-0.5">No. Polisi / Kendaraan (Opsional):</label>
                          <input
                            type="text"
                            id="modal-vehicle-info"
                            value="${vehicleInfo}"
                            placeholder="Contoh: DK 8901 AB (Engkel)"
                            class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label class="block text-[11px] font-medium text-slate-700 mb-0.5">Catatan Khusus Supir / Lapangan:</label>
                        <input
                          type="text"
                          id="modal-delivery-notes"
                          value="${deliveryNotes}"
                          placeholder="Contoh: Titipkan di satpam proyek, telepon sebelum tiba"
                          class="w-full h-8 px-2.5 bg-white border border-[#E2E8F0] rounded text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-5 py-3 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                data-close-checkout
                class="h-8 px-3.5 border border-[#E2E8F0] rounded-[5px] bg-white text-slate-700 text-xs font-medium hover:bg-slate-100 transition-colors"
              >
                Batal [Esc]
              </button>
              <button
                type="button"
                id="btn-confirm-checkout"
                ${!canSubmit ? "disabled" : ""}
                class="h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:pointer-events-none text-white rounded-[5px] text-xs font-semibold tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>PROSES NOTA & SELESAIKAN [Enter]</span>
              </button>
            </div>
          </div>
        </div>
      `;

      attachModalEvents();
    };

    const attachModalEvents = () => {
      const modalEl = modalContainer.querySelector("#checkout-modal-backdrop");
      if (!modalEl) return;

      // Close handlers
      modalEl.querySelectorAll("[data-close-checkout]").forEach((btn) => {
        btn.addEventListener("click", () => this.closeCheckoutModal());
      });

      // Customer change
      modalEl.querySelector("#modal-customer-select")?.addEventListener("change", (e) => {
        customerId = e.target.value ? parseInt(e.target.value, 10) : null;
        this.activeCart.customer_id = customerId;
        const c = getSelectedCustomer();
        if (c) {
          this.activeCart.customer_tier = c.price_tier || "retail";
          if (c.address && !deliveryAddress) {
            deliveryAddress = c.address;
          }
        }
        renderModal();
      });

      // Payment mode tabs
      modalEl.querySelectorAll("[data-pay-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
          paymentMode = btn.getAttribute("data-pay-mode");
          if (paymentMode === "paid") {
            paidAmount = grandTotal;
            tenderAmount = grandTotal;
          } else if (paymentMode === "dp") {
            paidAmount = Math.round(grandTotal * 0.3); // default 30% DP
            tenderAmount = paidAmount;
          } else {
            paidAmount = 0;
            tenderAmount = 0;
          }
          renderModal();
        });
      });

      // Payment method pills (Cash, Transfer, QRIS, EDC)
      modalEl.querySelectorAll("[data-pay-method]").forEach((btn) => {
        btn.addEventListener("click", () => {
          paymentMethod = btn.getAttribute("data-pay-method");
          renderModal();
        });
      });

      // Cash tendered input
      const cashInp = modalEl.querySelector("#input-cash-tendered");
      cashInp?.addEventListener("input", (e) => {
        const raw = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
        tenderAmount = raw;
        paidAmount = Math.min(raw, grandTotal);
        // update change display real-time
        const changeEl = modalEl.querySelector(".text-emerald-700");
        if (changeEl) {
          const diff = Math.max(0, tenderAmount - grandTotal);
          changeEl.innerText = `Rp ${diff.toLocaleString("id-ID")}`;
        }
      });

      // Cash preset buttons
      modalEl.querySelectorAll("[data-cash-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const preset = btn.getAttribute("data-cash-preset");
          if (preset === "exact") {
            tenderAmount = grandTotal;
          } else {
            tenderAmount = (tenderAmount || grandTotal) + parseInt(preset, 10);
          }
          paidAmount = grandTotal;
          renderModal();
        });
      });

      // Due date input
      modalEl.querySelector("#modal-due-date")?.addEventListener("change", (e) => {
        dueDate = e.target.value;
      });

      // DP amount input & presets
      const dpInp = modalEl.querySelector("#input-dp-amount");
      dpInp?.addEventListener("input", (e) => {
        const raw = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
        paidAmount = raw;
        renderModal();
      });

      modalEl.querySelectorAll("[data-dp-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const factor = parseFloat(btn.getAttribute("data-dp-preset"));
          paidAmount = Math.round(grandTotal * factor);
          renderModal();
        });
      });

      // Delivery mode buttons
      modalEl.querySelectorAll("[data-deliv-mode]").forEach((btn) => {
        btn.addEventListener("click", () => {
          deliveryMode = btn.getAttribute("data-deliv-mode");
          if (deliveryMode === "taken") {
            isSplitDelivery = false;
            itemSplits.forEach((s) => {
              s.takeNow = s.item.quantity;
              s.shipLater = 0;
            });
          } else {
            itemSplits.forEach((s) => {
              s.takeNow = 0;
              s.shipLater = s.item.quantity;
            });
          }
          renderModal();
        });
      });

      // Delivery split radio toggle
      modalEl.querySelectorAll("input[name='split_choice']").forEach((radio) => {
        radio.addEventListener("change", (e) => {
          isSplitDelivery = e.target.value === "partial";
          if (!isSplitDelivery) {
            itemSplits.forEach((s) => {
              s.takeNow = 0;
              s.shipLater = s.item.quantity;
            });
          }
          renderModal();
        });
      });

      // Split item inputs
      modalEl.querySelectorAll("[data-split-take-now]").forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const idx = parseInt(inp.getAttribute("data-split-take-now"), 10);
          const val = parseFloat(e.target.value) || 0;
          const s = itemSplits[idx];
          s.takeNow = Math.min(s.item.quantity, Math.max(0, val));
          s.shipLater = Math.max(0, s.item.quantity - s.takeNow);
          renderModal();
        });
      });

      modalEl.querySelectorAll("[data-split-ship-later]").forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const idx = parseInt(inp.getAttribute("data-split-ship-later"), 10);
          const val = parseFloat(e.target.value) || 0;
          const s = itemSplits[idx];
          s.shipLater = Math.min(s.item.quantity, Math.max(0, val));
          s.takeNow = Math.max(0, s.item.quantity - s.shipLater);
          renderModal();
        });
      });

      // Address, Driver, Vehicle & Notes inputs
      modalEl.querySelector("#modal-delivery-address")?.addEventListener("input", (e) => {
        deliveryAddress = e.target.value;
      });
      modalEl.querySelector("#modal-driver-name")?.addEventListener("input", (e) => {
        driverName = e.target.value;
      });
      modalEl.querySelector("#modal-vehicle-info")?.addEventListener("input", (e) => {
        vehicleInfo = e.target.value;
      });
      modalEl.querySelector("#modal-delivery-notes")?.addEventListener("input", (e) => {
        deliveryNotes = e.target.value;
      });

      // Submit checkout
      modalEl.querySelector("#btn-confirm-checkout")?.addEventListener("click", async () => {
        await executeCheckout();
      });
    };

    const executeCheckout = async () => {
      try {
        const finalDeliveryMode = deliveryMode === "taken" ? "taken" : isSplitDelivery ? "partial" : "pending";
        const payload = {
          customer_id: customerId,
          delivery_mode: finalDeliveryMode,
          payment_mode: paymentMode,
          due_date: paymentMode !== "paid" ? dueDate : null,
          delivery_address: deliveryAddress.trim() || null,
          driver_name: driverName.trim() || null,
          vehicle_info: vehicleInfo.trim() || null,
          delivery_notes: deliveryNotes.trim() || null,
          initial_payment:
            paidAmount > 0
              ? {
                  amount: paidAmount,
                  method: paymentMethod,
                  notes: `Pembayaran Kasir (${paymentMode.toUpperCase()} - ${paymentMethod.toUpperCase()})`,
                }
              : null,
          items: itemSplits.map((s) => {
            const u = s.item.product.units?.find((un) => un.unit_name === s.item.selectedUnit);
            return {
              product_unit_id: u?.id || s.item.product.units[0].id,
              quantity: s.item.quantity,
              take_now_qty: deliveryMode === "taken" ? s.item.quantity : isSplitDelivery ? s.takeNow : 0,
              ship_later_qty: deliveryMode === "taken" ? 0 : isSplitDelivery ? s.shipLater : s.item.quantity,
            };
          }),
        };

        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Transaksi gagal diproses");

        // Close checkout modal
        this.closeCheckoutModal();

        // Clear active cart items
        this.activeCart.items = [];
        this.renderCartView();

        // Trigger parent callback to reload products & customers
        if (this.onCheckoutSuccess) {
          this.onCheckoutSuccess(data);
        }

        // Show Transaction Success & Document Printing Modal
        this.showTransactionSuccessModal(data.detail, data.change_amount);
      } catch (err) {
        alert("Gagal Memproses Transaksi: " + err.message);
      }
    };

    renderModal();
    this.isCheckoutModalOpen = true;
  }

  closeCheckoutModal() {
    const modalContainer = this.container?.querySelector("#checkout-modal-container");
    if (modalContainer) modalContainer.innerHTML = "";
    this.isCheckoutModalOpen = false;
  }

  /**
   * Transaction Success & Print Modal
   * Displays immediate print options for:
   * 1. Struk Thermal (80mm)
   * 2. Faktur Penjualan Continuous Form (Dot Matrix)
   * 3. Surat Jalan Gudang/Supir (Tanpa Harga)
   */
  showTransactionSuccessModal(detail, changeAmount = 0) {
    const modalContainer = this.container.querySelector("#checkout-modal-container");
    if (!modalContainer) return;

    const cust = detail.customer || { name: "Umum / Walk-in", phone: "-", address: "-" };
    const pendingDO = (detail.delivery_orders || []).find((d) => d.status === "pending");

    modalContainer.innerHTML = `
      <div id="success-modal-backdrop" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 select-none">
        <div class="w-full max-w-lg bg-white rounded-md border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden text-xs">
          <!-- Success Header -->
          <div class="p-5 text-center space-y-1 bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <div class="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 class="font-bold text-slate-900 text-sm">TRANSAKSI BERHASIL DIPROSES</h3>
            <div class="text-xs text-slate-500 font-mono">Nomor Faktur: <strong>${detail.invoice_number}</strong></div>
          </div>

          <!-- Transaction Summary Data -->
          <div class="p-5 space-y-3">
            <div class="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 font-mono text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500">Pelanggan:</span>
                <span class="font-bold text-slate-900">${cust.name}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Total Belanja:</span>
                <span class="font-bold text-slate-900">Rp ${detail.total_amount.toLocaleString("id-ID")}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Status Pembayaran:</span>
                <span class="font-bold uppercase ${detail.payment_status === "paid" ? "text-emerald-700" : "text-amber-700"}">
                  ${detail.payment_status} ${detail.due_date ? `(Jatuh Tempo: ${detail.due_date})` : ""}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Status Pengiriman:</span>
                <span class="font-bold uppercase text-blue-700">
                  ${detail.delivery_status === "taken" ? "Bawa Langsung" : detail.delivery_status === "partial" ? "Kirim Sebagian" : "Kirim Armada"}
                </span>
              </div>
              ${
                pendingDO
                  ? `
                <div class="flex justify-between text-blue-800 pt-1 border-t border-slate-200">
                  <span>No. Surat Jalan (DO):</span>
                  <span class="font-bold">${pendingDO.do_number}</span>
                </div>
              `
                  : ""
              }
              ${
                changeAmount > 0
                  ? `
                <div class="flex justify-between text-emerald-800 font-bold pt-1 border-t border-slate-200">
                  <span>Kembalian Uang Tunai:</span>
                  <span>Rp ${changeAmount.toLocaleString("id-ID")}</span>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Print Actions Options -->
            <div class="space-y-2">
              <div class="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Cetak Dokumen:</div>

              <div class="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  id="btn-print-thermal-receipt"
                  class="h-10 px-4 rounded border border-[#E2E8F0] hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between transition-colors shadow-sm"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-base">🖨️</span>
                    <span>Cetak Struk Thermal (80mm)</span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-500">Nota Kasir Standar</span>
                </button>

                <button
                  type="button"
                  id="btn-print-dotmatrix-invoice"
                  class="h-10 px-4 rounded border border-[#E2E8F0] hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between transition-colors shadow-sm"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-base">📄</span>
                    <span>Cetak Faktur Penjualan (Dot Matrix)</span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-500">Continuous Form Half-A4</span>
                </button>

                <button
                  type="button"
                  id="btn-print-dotmatrix-do"
                  class="h-10 px-4 rounded border border-[#E2E8F0] hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between transition-colors shadow-sm"
                >
                  <div class="flex items-center gap-2">
                    <span class="text-base">🚚</span>
                    <span>Cetak Surat Jalan Gudang/Supir (Tanpa Harga)</span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-500">Disembunyikan Harga</span>
                </button>
              </div>

              <div class="pt-1 text-center">
                <button
                  type="button"
                  id="btn-open-full-print-preview"
                  class="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Buka Pratinjau / Preview Lengkap Semua Dokumen
                </button>
              </div>
            </div>
          </div>

          <!-- Success Modal Footer -->
          <div class="p-4 bg-slate-50 border-t border-[#E2E8F0]">
            <button
              type="button"
              id="btn-dismiss-success-modal"
              class="w-full h-10 bg-slate-900 hover:bg-black text-white font-semibold rounded-[5px] text-xs tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>SELESAI / TRANSAKSI BARU [Enter]</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Event attachments for direct printing
    modalContainer.querySelector("#btn-print-thermal-receipt")?.addEventListener("click", () => {
      PrintTemplates.printHtml(PrintTemplates.renderThermalReceipt(detail), "thermal");
    });

    modalContainer.querySelector("#btn-print-dotmatrix-invoice")?.addEventListener("click", () => {
      PrintTemplates.printHtml(PrintTemplates.renderDotMatrixInvoice(detail), "dotmatrix");
    });

    modalContainer.querySelector("#btn-print-dotmatrix-do")?.addEventListener("click", () => {
      PrintTemplates.printHtml(PrintTemplates.renderDotMatrixDeliveryOrder(detail, 0), "dotmatrix");
    });

    modalContainer.querySelector("#btn-open-full-print-preview")?.addEventListener("click", () => {
      PrintTemplates.showPrintPreviewModal(detail, "thermal");
    });

    const closeSuccess = () => {
      modalContainer.innerHTML = "";
      this.focusSearch();
    };

    modalContainer.querySelector("#btn-dismiss-success-modal")?.addEventListener("click", closeSuccess);
  }
}

