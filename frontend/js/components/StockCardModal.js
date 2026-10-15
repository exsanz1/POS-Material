/**
 * StockCardModal Component — Chronological Stock Movement Ledger (Kartu Stok).
 * Strict White Minimalist layout with Dual-State balance tracking (Physical, Reserved, Available).
 */

import { Badge } from "./Badge.js";

export class StockCardModal {
  /**
   * @param {Object} options
   * @param {Object} options.product - Product summary
   * @param {Array<Object>} options.mutations - Chronological mutation records
   * @param {Function} [options.onClose] - Close handler
   */
  constructor({ product, mutations = [], onClose }) {
    this.product = product;
    this.mutations = mutations;
    this.onClose = onClose;

    this.render();
  }

  render() {
    const existing = document.getElementById("stock-card-modal");
    if (existing) existing.remove();

    const p = this.product;
    const modal = document.createElement("div");
    modal.id = "stock-card-modal";
    modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px] p-4";

    modal.innerHTML = `
      <div class="w-full max-w-5xl bg-white rounded-md border border-[#E2E8F0] shadow-sm flex flex-col max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="px-5 py-3.5 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between select-none">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              KS
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  KARTU STOK: ${p.name}
                </h3>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E2E8F0] text-slate-700">
                  SKU: ${p.sku}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 font-sans">
                Riwayat mutasi keluar-masuk barang kronologis dalam satuan dasar: <strong class="text-slate-700">${p.base_unit}</strong>
              </p>
            </div>
          </div>
          <button type="button" data-close-btn class="text-slate-400 hover:text-slate-700 text-lg font-bold p-1">
            ✕
          </button>
        </div>

        <!-- Product Summary & Stock Metrics Bar -->
        <div class="px-5 py-3 border-b border-[#E2E8F0] bg-white grid grid-cols-5 gap-3 text-xs select-none">
          <div class="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Lokasi Rak / Gudang</div>
            <div class="font-semibold text-slate-900 mt-0.5 truncate">${p.rack_location || "Gudang Utama"}</div>
          </div>
          <div class="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Stok Fisik Gudang</div>
            <div class="font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              ${p.physical_stock.toLocaleString("id-ID")} <span class="text-[10px] font-normal text-slate-500">${p.base_unit}</span>
            </div>
          </div>
          <div class="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-[10px] text-amber-700 uppercase tracking-wider font-medium">Stok Dipesan (Reserved)</div>
            <div class="font-bold text-amber-700 font-mono tabular-nums mt-0.5">
              ${p.reserved_stock.toLocaleString("id-ID")} <span class="text-[10px] font-normal text-amber-600">${p.base_unit}</span>
            </div>
          </div>
          <div class="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-[10px] text-emerald-700 uppercase tracking-wider font-medium">Stok Bersih Tersedia</div>
            <div class="font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
              ${p.available_stock.toLocaleString("id-ID")} <span class="text-[10px] font-normal text-emerald-600">${p.base_unit}</span>
            </div>
          </div>
          <div class="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
            <div class="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Batas Minimum Alert</div>
            <div class="font-semibold text-slate-700 font-mono tabular-nums mt-0.5">
              ${p.low_stock_threshold.toLocaleString("id-ID")} <span class="text-[10px] font-normal text-slate-500">${p.base_unit}</span>
            </div>
          </div>
        </div>

        <!-- Ledger Table of Mutations -->
        <div class="flex-1 overflow-auto p-5">
          <div class="border border-[#E2E8F0] rounded-md overflow-hidden bg-white">
            <table class="w-full border-collapse table-compact text-left">
              <thead class="sticky top-0 z-10 bg-slate-50/95 border-b border-[#E2E8F0]">
                <tr>
                  <th class="w-12 text-center">No</th>
                  <th class="w-36">Waktu Mutasi</th>
                  <th class="w-36">Tipe Mutasi</th>
                  <th class="w-36">No. Referensi</th>
                  <th class="w-24 text-right">Masuk (+)</th>
                  <th class="w-24 text-right">Keluar (-)</th>
                  <th class="w-24 text-right">Sisa Fisik</th>
                  <th class="w-24 text-right">Reserved</th>
                  <th class="w-28 text-right font-bold">Tersedia</th>
                  <th>Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E2E8F0] bg-white text-xs">
                ${
                  this.mutations.length === 0
                    ? `
                  <tr>
                    <td colspan="10" class="py-10 text-center text-slate-400 italic text-xs">
                      Belum ada riwayat mutasi untuk barang ini
                    </td>
                  </tr>
                `
                    : this.mutations
                        .map((m, idx) => {
                          const isPlus = m.qty_in > 0;
                          const isMinus = m.qty_out > 0;
                          const badgeVariant =
                            m.mutation_type === "IN_PURCHASE"
                              ? "success"
                              : m.mutation_type === "OUT_DELIVERY"
                              ? "warning"
                              : m.mutation_type === "OUT_DIRECT_SALE"
                              ? "neutral"
                              : "neutral";

                          const mutationLabels = {
                            IN_PURCHASE: "Masuk (PO)",
                            OUT_DELIVERY: "Kirim Surat Jalan",
                            OUT_DIRECT_SALE: "Bawa Langsung",
                            INITIAL: "Saldo Awal",
                            ADJUSTMENT_PLUS: "Koreksi (+)",
                            ADJUSTMENT_MINUS: "Koreksi (-)",
                          };

                          return `
                        <tr class="hover:bg-slate-50/60 transition-colors">
                          <td class="text-center font-mono text-[11px] text-slate-400">${idx + 1}</td>
                          <td class="font-mono text-[11px] text-slate-600 whitespace-nowrap">${m.created_at}</td>
                          <td>
                            ${Badge.render({
                              variant: badgeVariant,
                              label: mutationLabels[m.mutation_type] || m.mutation_type,
                              withDot: true,
                            })}
                          </td>
                          <td class="font-mono font-medium text-slate-800 text-[11px]">
                            ${m.reference_number || "-"}
                          </td>
                          <td class="text-right font-mono tabular-nums ${isPlus ? "text-emerald-700 font-semibold" : "text-slate-300"}">
                            ${isPlus ? `+${m.qty_in.toLocaleString("id-ID")}` : "-"}
                          </td>
                          <td class="text-right font-mono tabular-nums ${isMinus ? "text-rose-700 font-semibold" : "text-slate-300"}">
                            ${isMinus ? `-${m.qty_out.toLocaleString("id-ID")}` : "-"}
                          </td>
                          <td class="text-right font-mono tabular-nums text-slate-700">
                            ${m.balance_physical.toLocaleString("id-ID")}
                          </td>
                          <td class="text-right font-mono tabular-nums text-amber-700">
                            ${m.balance_reserved.toLocaleString("id-ID")}
                          </td>
                          <td class="text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50/50">
                            ${m.balance_available.toLocaleString("id-ID")}
                          </td>
                          <td class="text-slate-600 text-[11px] truncate max-w-xs" title="${m.notes}">
                            ${m.notes}
                          </td>
                        </tr>
                      `;
                        })
                        .join("")
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
          <div class="text-[11px] text-slate-500">
            Total tercatat: <span class="font-mono font-semibold text-slate-800">${this.mutations.length}</span> mutasi
          </div>
          <button
            type="button"
            data-close-btn
            class="h-8 px-4 bg-white border border-[#E2E8F0] hover:bg-slate-100 text-slate-700 rounded-[5px] text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;

    // Attach close listener
    modal.querySelectorAll("[data-close-btn]").forEach((btn) => {
      btn.addEventListener("click", () => this.close());
    });
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
