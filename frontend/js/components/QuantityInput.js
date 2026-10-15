/**
 * QuantityInput Component — Compact quantity stepper with decimal support
 * and real-time base-unit conversion indicator.
 */

export class QuantityInput {
  /**
   * Render HTML for the QuantityInput component.
   * @param {Object} options
   * @param {string} options.id - Input ID
   * @param {number|string} [options.value=1] - Current quantity
   * @param {number} [options.min=0] - Minimum quantity
   * @param {number} [options.max] - Max available quantity (stok tersedia)
   * @param {number} [options.step=1] - Stepper step
   * @param {string} [options.unitName='Unit'] - Current selling unit (e.g. Dus, Truk, Sak)
   * @param {number} [options.conversionFactor=1] - Factor to base unit
   * @param {string} [options.baseUnit=''] - Product base unit name (e.g. Sak, Kubik)
   * @param {string} [options.size='md'] - 'sm' or 'md'
   * @returns {string} HTML string
   */
  static render({
    id,
    value = 1,
    min = 0,
    max = 999999,
    step = 1,
    unitName = "Unit",
    conversionFactor = 1,
    baseUnit = "",
    size = "md",
  }) {
    const isMultiUnit = conversionFactor > 1 && baseUnit && baseUnit !== unitName;
    const baseQty = (parseFloat(value) * conversionFactor).toFixed(2).replace(/\.00$/, "");
    const heightClass = size === "sm" ? "h-7 text-xs" : "h-8 text-sm";
    const btnSize = size === "sm" ? "w-6 h-7" : "w-7 h-8";

    return `
      <div class="inline-flex flex-col gap-0.5" data-quantity-input-id="${id}">
        <div class="inline-flex items-center rounded-md border border-[#E2E8F0] bg-white transition-colors focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
          <button
            type="button"
            data-qty-action="dec"
            class="${btnSize} flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-l-[5px] border-r border-[#E2E8F0] transition-colors focus:outline-none"
            title="Kurangi kuantitas"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          
          <input
            type="number"
            id="${id}"
            value="${value}"
            min="${min}"
            max="${max}"
            step="${step}"
            data-conversion="${conversionFactor}"
            data-base-unit="${baseUnit}"
            class="${heightClass} w-16 bg-transparent px-1.5 text-center font-mono text-slate-900 tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            type="button"
            data-qty-action="inc"
            class="${btnSize} flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-r-[5px] border-l border-[#E2E8F0] transition-colors focus:outline-none"
            title="Tambah kuantitas"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        ${
          isMultiUnit
            ? `
          <div class="text-[10px] text-slate-500 font-mono tabular-nums text-center" data-qty-conversion-label="${id}">
            = <span class="font-medium text-slate-700">${baseQty}</span> ${baseUnit}
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  /**
   * Attach interactive listeners to QuantityInput container.
   * @param {HTMLElement|string} wrapperSelector - Wrapper container or selector
   * @param {Function} [onChange] - Callback (qty, qtyInBase)
   */
  static attach(wrapperSelector, onChange) {
    const wrapper = typeof wrapperSelector === "string" ? document.querySelector(wrapperSelector) : wrapperSelector;
    if (!wrapper) return;

    const input = wrapper.querySelector("input[type='number']");
    const decBtn = wrapper.querySelector("[data-qty-action='dec']");
    const incBtn = wrapper.querySelector("[data-qty-action='inc']");
    const conversionLabel = wrapper.querySelector("[data-qty-conversion-label]");

    if (!input) return;

    const factor = parseFloat(input.getAttribute("data-conversion") || "1");
    const baseUnit = input.getAttribute("data-base-unit") || "";

    const updateLabel = (val) => {
      if (conversionLabel && baseUnit) {
        const baseQty = (val * factor).toFixed(2).replace(/\.00$/, "");
        conversionLabel.innerHTML = `= <span class="font-medium text-slate-700">${baseQty}</span> ${baseUnit}`;
      }
      if (onChange) {
        onChange(val, val * factor);
      }
    };

    decBtn?.addEventListener("click", () => {
      const step = parseFloat(input.step) || 1;
      const min = parseFloat(input.min) || 0;
      let current = parseFloat(input.value) || 0;
      if (current - step >= min) {
        current = Math.round((current - step) * 1000) / 1000;
        input.value = current;
        updateLabel(current);
      }
    });

    incBtn?.addEventListener("click", () => {
      const step = parseFloat(input.step) || 1;
      const max = parseFloat(input.max) || 999999;
      let current = parseFloat(input.value) || 0;
      if (current + step <= max) {
        current = Math.round((current + step) * 1000) / 1000;
        input.value = current;
        updateLabel(current);
      }
    });

    input.addEventListener("input", () => {
      const val = parseFloat(input.value) || 0;
      updateLabel(val);
    });
  }
}
