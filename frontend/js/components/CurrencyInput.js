/**
 * CurrencyInput Component — Indonesian Rupiah formatter with live tabular-nums input.
 * Strict White Minimalist styling with hairline border and zero bulky shadows.
 */

export class CurrencyInput {
  /**
   * Format a numeric string/number to Indonesian Rupiah representation (without 'Rp').
   * e.g. 1500000 -> "1.500.000"
   */
  static formatRupiah(value) {
    if (value === null || value === undefined || value === "") return "";
    const cleanNumber = String(value).replace(/[^0-9]/g, "");
    if (!cleanNumber) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(cleanNumber, 10));
  }

  /**
   * Parse formatted string back to raw number.
   * e.g. "1.500.000" -> 1500000
   */
  static parseRaw(formattedStr) {
    if (!formattedStr) return 0;
    const clean = String(formattedStr).replace(/[^0-9]/g, "");
    return clean ? parseInt(clean, 10) : 0;
  }

  /**
   * Render HTML template for the CurrencyInput field.
   * @param {Object} options
   * @param {string} options.id - Input DOM ID
   * @param {string} [options.name] - Form field name
   * @param {number|string} [options.value=0] - Initial value
   * @param {string} [options.label] - Field label
   * @param {string} [options.placeholder='0'] - Placeholder
   * @param {boolean} [options.readOnly=false] - Readonly flag
   * @param {string} [options.size='md'] - 'sm' (compact) or 'md'
   * @returns {string} HTML string
   */
  static render({
    id,
    name = "",
    value = "",
    label = "",
    placeholder = "0",
    readOnly = false,
    size = "md",
  }) {
    const formatted = CurrencyInput.formatRupiah(value);
    const heightClass = size === "sm" ? "h-8 text-xs" : "h-9 text-sm";

    return `
      <div class="flex flex-col gap-1 w-full" data-currency-input-wrapper="${id}">
        ${label ? `<label for="${id}" class="text-[12px] font-medium text-slate-600">${label}</label>` : ""}
        <div class="relative flex items-center rounded-md border border-[#E2E8F0] bg-white transition-colors focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
          <span class="pl-2.5 pr-1 text-slate-400 text-xs font-semibold select-none pointer-events-none">Rp</span>
          <input
            type="text"
            id="${id}"
            name="${name || id}"
            data-raw-value="${CurrencyInput.parseRaw(value)}"
            value="${formatted}"
            placeholder="${placeholder}"
            ${readOnly ? "readonly" : ""}
            class="w-full ${heightClass} bg-transparent px-2.5 text-right font-mono text-slate-900 tabular-nums focus:outline-none select-all"
            inputmode="numeric"
            autocomplete="off"
          />
        </div>
      </div>
    `;
  }

  /**
   * Bind event listeners to an existing CurrencyInput element in DOM.
   * @param {HTMLInputElement|string} target - Input element or selector
   * @param {Function} [onChange] - Callback receiving (rawValue, formattedValue)
   */
  static attach(target, onChange) {
    const input = typeof target === "string" ? document.querySelector(target) : target;
    if (!input) return;

    input.addEventListener("input", (e) => {
      const cursorPosition = input.selectionStart;
      const raw = CurrencyInput.parseRaw(input.value);
      const formatted = raw > 0 ? CurrencyInput.formatRupiah(raw) : "";

      input.setAttribute("data-raw-value", raw);
      input.value = formatted;

      if (onChange) {
        onChange(raw, formatted);
      }
    });

    input.addEventListener("keydown", (e) => {
      // Allow navigation and modification keys
      const allowedKeys = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End", "Enter"];
      if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
        return;
      }
      // Block non-digits
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    });
  }

  /**
   * Helper to set value programmatically.
   */
  static setValue(inputEl, numericValue) {
    const raw = parseInt(numericValue, 10) || 0;
    inputEl.setAttribute("data-raw-value", raw);
    inputEl.value = raw > 0 ? CurrencyInput.formatRupiah(raw) : "";
    inputEl.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /**
   * Helper to get raw numeric value.
   */
  static getValue(inputEl) {
    return parseInt(inputEl.getAttribute("data-raw-value") || "0", 10);
  }
}
