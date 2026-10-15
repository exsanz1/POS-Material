/**
 * DataTable Component — High-density, compact table built for rapid scanning of thousands of SKUs.
 * Strict White Minimalist style: hairline borders, zero bulky shadows, sticky header, tabular numbers.
 */

export class DataTable {
  /**
   * @param {Object} options
   * @param {HTMLElement|string} options.container - DOM container element or selector
   * @param {Array<Object>} options.columns - Column definitions:
   *   [
   *     { key: 'sku', label: 'SKU', align: 'left', width: '120px' },
   *     { key: 'name', label: 'Nama Produk', align: 'left' },
   *     { key: 'price', label: 'Harga Eceran', align: 'right', isNumber: true, render: (val) => ... },
   *   ]
   * @param {Array<Object>} options.data - Array of row objects
   * @param {number} [options.pageSize=25] - Rows per page
   * @param {boolean} [options.searchable=true] - Include fast search filter
   */
  constructor({ container, columns = [], data = [], pageSize = 25, searchable = true }) {
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    this.columns = columns;
    this.rawData = data;
    this.filteredData = [...data];
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.sortKey = null;
    this.sortDir = "asc";
    this.searchQuery = "";

    this.render();
  }

  setData(newData) {
    this.rawData = newData;
    this.applyFilter();
  }

  applyFilter() {
    if (!this.searchQuery) {
      this.filteredData = [...this.rawData];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredData = this.rawData.filter((row) =>
        Object.values(row).some((val) => String(val || "").toLowerCase().includes(q))
      );
    }
    this.currentPage = 1;
    this.renderBody();
  }

  handleSort(key) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
    } else {
      this.sortKey = key;
      this.sortDir = "asc";
    }

    this.filteredData.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      if (valA === valB) return 0;
      if (typeof valA === "number" && typeof valB === "number") {
        return this.sortDir === "asc" ? valA - valB : valB - valA;
      }
      const cmp = String(valA || "").localeCompare(String(valB || ""));
      return this.sortDir === "asc" ? cmp : -cmp;
    });

    this.renderBody();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="flex flex-col h-full bg-white rounded-md border border-[#E2E8F0] overflow-hidden">
        <!-- Table Toolbar: Search and Summary -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-[#E2E8F0] bg-slate-50/60">
          <div class="flex items-center gap-2 flex-1 max-w-sm">
            <div class="relative w-full">
              <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                data-dt-search
                placeholder="Cari SKU, nama produk, kategori..."
                class="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#E2E8F0] rounded-[5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
              />
            </div>
          </div>
          <div class="text-[11px] text-slate-500 tabular-nums" data-dt-summary>
            Total: <span class="font-semibold text-slate-800">${this.rawData.length.toLocaleString("id-ID")}</span> SKU
          </div>
        </div>

        <!-- Scrollable Table Body with Sticky Header -->
        <div class="flex-1 overflow-auto max-h-[600px] relative">
          <table class="w-full text-left border-collapse table-compact">
            <thead class="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-[2px]">
              <tr>
                ${this.columns
                  .map((col) => {
                    const alignClass =
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left";
                    const widthStyle = col.width ? `style="width: ${col.width}"` : "";
                    return `
                      <th data-sort-col="${col.key}" ${widthStyle} class="${alignClass} cursor-pointer select-none hover:bg-slate-100 transition-colors">
                        <div class="inline-flex items-center gap-1 ${col.align === "right" ? "justify-end w-full" : ""}">
                          <span>${col.label}</span>
                          <span class="text-slate-400 text-[10px]" data-sort-icon="${col.key}">↕</span>
                        </div>
                      </th>
                    `;
                  })
                  .join("")}
              </tr>
            </thead>
            <tbody data-dt-tbody class="divide-y divide-[#E2E8F0] bg-white">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>

        <!-- Table Footer / Pagination -->
        <div class="flex items-center justify-between px-3 py-2 border-t border-[#E2E8F0] bg-slate-50 text-[11px] text-slate-600">
          <div data-dt-page-info class="tabular-nums">
            Menampilkan 0 - 0 dari 0 baris
          </div>
          <div class="flex items-center gap-1">
            <button
              data-dt-prev
              class="px-2 py-1 bg-white border border-[#E2E8F0] rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Sebelumnya
            </button>
            <span class="px-2 font-mono tabular-nums text-slate-800" data-dt-current-page>1</span>
            <button
              data-dt-next
              class="px-2 py-1 bg-white border border-[#E2E8F0] rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach search listener
    const searchInput = this.container.querySelector("[data-dt-search]");
    searchInput?.addEventListener("input", (e) => {
      this.searchQuery = e.target.value;
      this.applyFilter();
    });

    // Attach sort listeners
    this.container.querySelectorAll("[data-sort-col]").forEach((th) => {
      th.addEventListener("click", () => {
        const colKey = th.getAttribute("data-sort-col");
        this.handleSort(colKey);
      });
    });

    // Pagination listeners
    this.container.querySelector("[data-dt-prev]")?.addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderBody();
      }
    });

    this.container.querySelector("[data-dt-next]")?.addEventListener("click", () => {
      const maxPages = Math.ceil(this.filteredData.length / this.pageSize);
      if (this.currentPage < maxPages) {
        this.currentPage++;
        this.renderBody();
      }
    });

    this.renderBody();
  }

  renderBody() {
    const tbody = this.container.querySelector("[data-dt-tbody]");
    if (!tbody) return;

    const total = this.filteredData.length;
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, total);
    const pageRows = this.filteredData.slice(startIdx, endIdx);

    // Update summary and pagination display
    const pageInfo = this.container.querySelector("[data-dt-page-info]");
    if (pageInfo) {
      pageInfo.innerText = total === 0
        ? "Tidak ada data yang cocok"
        : `Menampilkan ${startIdx + 1} - ${endIdx} dari ${total.toLocaleString("id-ID")} baris`;
    }

    const curPageEl = this.container.querySelector("[data-dt-current-page]");
    if (curPageEl) {
      curPageEl.innerText = `${this.currentPage}`;
    }

    const prevBtn = this.container.querySelector("[data-dt-prev]");
    const nextBtn = this.container.querySelector("[data-dt-next]");
    if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = endIdx >= total;

    if (pageRows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${this.columns.length}" class="py-8 text-center text-slate-400 text-xs italic">
            Tidak ada data yang ditemukan
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pageRows
      .map((row, idx) => {
        return `
          <tr class="hover:bg-slate-50/70 transition-colors">
            ${this.columns
              .map((col) => {
                const alignClass =
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left";
                const tabularClass = col.isNumber ? "tabular-nums font-mono" : "";
                const cellValue = col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-");
                return `<td class="${alignClass} ${tabularClass}">${cellValue}</td>`;
              })
              .join("")}
          </tr>
        `;
      })
      .join("");
  }
}
