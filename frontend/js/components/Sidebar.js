/**
 * Sidebar Component — Collapsible minimalist sidebar with thin monochrome icons.
 * Follows Strict White Minimalist: Slate surface background, hairline border-r, deep charcoal text.
 */

export const NavModules = [
  {
    id: "pos",
    label: "Kasir (POS)",
    badge: null,
    icon: `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"></rect>
      <line x1="2" y1="10" x2="22" y2="10"></line>
      <line x1="6" y1="15" x2="10" y2="15"></line>
      <line x1="14" y1="15" x2="18" y2="15"></line>
    </svg>`,
  },
  {
    id: "inventory",
    label: "Master Barang & Stok",
    badge: null,
    icon: `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
      <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>`,
  },
  {
    id: "delivery",
    label: "Surat Jalan (Pengiriman)",
    badge: "2",
    icon: `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="15" height="13"></rect>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
      <circle cx="5.5" cy="18.5" r="2.5"></circle>
      <circle cx="18.5" cy="18.5" r="2.5"></circle>
    </svg>`,
  },
  {
    id: "receivables",
    label: "Piutang & Tempo",
    badge: "3",
    icon: `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>`,
  },
  {
    id: "reports",
    label: "Laporan & Rekap",
    badge: null,
    icon: `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"></line>
      <line x1="12" y1="20" x2="12" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="14"></line>
    </svg>`,
  },
];

export class Sidebar {
  constructor({ container, activeModule = "pos", onModuleSelect }) {
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    this.activeModule = activeModule;
    this.onModuleSelect = onModuleSelect;
    this.isCollapsed = false;

    this.render();
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.render();
  }

  setActiveModule(moduleId) {
    this.activeModule = moduleId;
    this.render();
    if (this.onModuleSelect) {
      this.onModuleSelect(moduleId);
    }
  }

  render() {
    if (!this.container) return;

    const widthClass = this.isCollapsed ? "w-16" : "w-60";

    this.container.innerHTML = `
      <aside class="${widthClass} transition-all duration-200 ease-in-out h-screen bg-[#F8FAFC] border-r border-[#E2E8F0] flex flex-col justify-between shrink-0 select-none">
        <!-- Top: Brand Header -->
        <div>
          <div class="h-14 px-4 flex items-center justify-between border-b border-[#E2E8F0]">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 tracking-wider">
                TB
              </div>
              ${
                !this.isCollapsed
                  ? `
                <div class="truncate">
                  <div class="font-semibold text-xs text-slate-900 tracking-tight truncate">TOKO MATERIAL</div>
                  <div class="text-[10px] text-slate-500 font-mono">v1.0 • POS System</div>
                </div>
              `
                  : ""
              }
            </div>
          </div>

          <!-- Nav Items List -->
          <nav class="p-2 space-y-1">
            ${NavModules.map((item) => {
              const isActive = this.activeModule === item.id;
              const activeClass = isActive
                ? "bg-white text-slate-900 font-medium border border-[#E2E8F0] shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent";

              return `
                <button
                  type="button"
                  data-nav-id="${item.id}"
                  title="${item.label}"
                  class="w-full flex items-center ${
                    this.isCollapsed ? "justify-center px-0" : "justify-between px-3"
                  } py-2 rounded-md text-xs transition-colors ${activeClass}"
                >
                  <div class="flex items-center gap-2.5 truncate">
                    <span class="${isActive ? "text-blue-600" : "text-slate-500"}">${item.icon}</span>
                    ${!this.isCollapsed ? `<span class="truncate">${item.label}</span>` : ""}
                  </div>

                  ${
                    !this.isCollapsed && item.badge
                      ? `
                    <span class="ml-auto text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      ${item.badge}
                    </span>
                  `
                      : ""
                  }
                </button>
              `;
            }).join("")}
          </nav>
        </div>

        <!-- Bottom: User & Collapse Toggle Button -->
        <div class="p-2 border-t border-[#E2E8F0] bg-slate-50 space-y-2">
          ${
            !this.isCollapsed
              ? `
            <div class="flex items-center gap-2 px-2 py-1.5">
              <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-semibold">
                K1
              </div>
              <div class="truncate text-[11px]">
                <div class="font-medium text-slate-800 leading-tight">Kasir Utama</div>
                <div class="text-slate-500 text-[10px]">Online • Shift Pagi</div>
              </div>
            </div>
          `
              : ""
          }

          <button
            type="button"
            data-sidebar-toggle
            class="w-full flex items-center ${
              this.isCollapsed ? "justify-center" : "justify-between px-3"
            } py-1.5 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded transition-colors"
            title="${this.isCollapsed ? 'Perlebar Sidebar' : 'Ciutkan Sidebar'}"
          >
            ${
              !this.isCollapsed
                ? `
              <span class="text-[11px]">Ciutkan Menu</span>
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            `
                : `
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            `
            }
          </button>
        </div>
      </aside>
    `;

    // Bind nav clicks
    this.container.querySelectorAll("[data-nav-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modId = btn.getAttribute("data-nav-id");
        this.setActiveModule(modId);
      });
    });

    // Bind toggle collapse
    this.container.querySelector("[data-sidebar-toggle]")?.addEventListener("click", () => {
      this.toggleCollapse();
    });
  }
}
