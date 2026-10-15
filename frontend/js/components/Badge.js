/**
 * Badge Component — Strict Minimalist Status Badges
 * Uses subtle pastel backgrounds with hairline matching borders (1px)
 * No loud/garish colors, keeping within design system rules.
 */

export const BadgeVariants = {
  // Payment Statuses
  paid: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    defaultLabel: "Lunas",
  },
  dp: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    defaultLabel: "Uang Muka (DP)",
  },
  tempo: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    defaultLabel: "Tempo / Kasbon",
  },
  overdue: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
    defaultLabel: "Jatuh Tempo",
  },

  // Delivery Statuses
  taken: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    defaultLabel: "Bawa Langsung",
  },
  partial: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    defaultLabel: "Kirim Sebagian",
  },
  pending: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
    defaultLabel: "Menunggu Kirim",
  },

  // Stock Statuses
  "stock-safe": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    defaultLabel: "Stok Aman",
  },
  "stock-low": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    defaultLabel: "Stok Menipis",
  },
  "stock-empty": {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
    defaultLabel: "Stok Habis",
  },

  // Generic Variants
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    defaultLabel: "Sukses",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    defaultLabel: "Peringatan",
  },
  danger: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-500",
    defaultLabel: "Bahaya",
  },
  neutral: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    dot: "bg-slate-400",
    defaultLabel: "Netral",
  },
};

export class Badge {
  /**
   * Render HTML string for a minimalist status badge.
   * @param {Object} options
   * @param {string} options.variant - key from BadgeVariants
   * @param {string} [options.label] - custom label text
   * @param {boolean} [options.withDot=true] - include small status dot
   * @param {string} [options.className=''] - additional CSS classes
   * @returns {string} HTML string
   */
  static render({ variant = "neutral", label, withDot = true, className = "" } = {}) {
    const style = BadgeVariants[variant] || BadgeVariants.neutral;
    const textLabel = label || style.defaultLabel;

    return `
      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[11px] font-medium leading-none ${style.bg} ${style.text} ${style.border} ${className}">
        ${withDot ? `<span class="w-1.5 h-1.5 rounded-full ${style.dot}"></span>` : ""}
        <span>${textLabel}</span>
      </span>
    `;
  }
}
