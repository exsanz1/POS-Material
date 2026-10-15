/**
 * Layout Component — Main Shell tying Sidebar, Header, and Module Workspace together.
 * Adheres strictly to CONTEXT.md White Minimalist Design System.
 */

import { Sidebar } from "./Sidebar.js";

export class Layout {
  /**
   * @param {Object} options
   * @param {HTMLElement|string} options.container - Root container
   * @param {Function} options.onModuleChange - Callback when user switches module
   */
  constructor({ container, onModuleChange }) {
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    this.onModuleChange = onModuleChange;
    this.currentModule = "pos";
    this.sidebar = null;

    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="flex h-screen w-screen overflow-hidden bg-[#F8FAFC]">
        <!-- Collapsible Sidebar Container -->
        <div id="sidebar-container" class="shrink-0 h-full"></div>

        <!-- Main Content Area -->
        <div class="flex flex-col flex-1 h-full min-w-0 bg-[#FFFFFF] border-l border-[#E2E8F0]">
          <!-- App Header -->
          <header class="h-14 px-6 flex items-center justify-between border-b border-[#E2E8F0] bg-[#FFFFFF] shrink-0 select-none">
            <!-- Breadcrumbs / Module Title -->
            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-400 font-medium">Aplikasi</span>
              <span class="text-slate-300">/</span>
              <span id="header-module-title" class="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                KASIR (POS)
              </span>
            </div>

            <!-- Header Quick Stats & Actions -->
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2 px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] font-mono tabular-nums text-slate-700">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Database Terhubung</span>
              </div>

              <div class="h-4 w-[1px] bg-[#E2E8F0]"></div>

              <div class="text-[11px] text-slate-500 font-mono tabular-nums" id="live-clock">
                --:--:-- WIB
              </div>
            </div>
          </header>

          <!-- Dynamic Workspace Canvas -->
          <main id="workspace-canvas" class="flex-1 overflow-auto bg-[#FFFFFF] p-5">
            <!-- Module content rendered dynamically -->
          </main>
        </div>
      </div>
    `;

    // Initialize Sidebar
    const sidebarEl = this.container.querySelector("#sidebar-container");
    this.sidebar = new Sidebar({
      container: sidebarEl,
      activeModule: this.currentModule,
      onModuleSelect: (modId) => {
        this.currentModule = modId;
        this.updateHeaderTitle(modId);
        if (this.onModuleChange) {
          this.onModuleChange(modId);
        }
      },
    });

    this.startClock();
  }

  updateHeaderTitle(modId) {
    const titleMap = {
      pos: "KASIR (POINT OF SALE)",
      inventory: "MASTER BARANG & STOK (DUAL-STATE INVENTORY)",
      delivery: "SURAT JALAN & PENGIRIMAN PARSIAL",
      receivables: "BUKU PIUTANG & TEMPO JATUH TEMPO",
      reports: "LAPORAN PENJUALAN & REKAP STOK",
    };
    const titleEl = this.container.querySelector("#header-module-title");
    if (titleEl) {
      titleEl.innerText = titleMap[modId] || modId.toUpperCase();
    }
  }

  startClock() {
    const clockEl = this.container.querySelector("#live-clock");
    const update = () => {
      if (!clockEl) return;
      const now = new Date();
      clockEl.innerText = now.toLocaleTimeString("id-ID", { hour12: false }) + " WIB";
    };
    update();
    setInterval(update, 1000);
  }

  getWorkspaceElement() {
    return this.container.querySelector("#workspace-canvas");
  }
}
