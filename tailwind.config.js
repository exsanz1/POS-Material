/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.{html,js}",
    "./templates/**/*.{html,js}",
    "./app/**/*.{py,html,js}",
  ],
  theme: {
    extend: {
      colors: {
        // Strict White Minimalist Design System
        canvas: "#FFFFFF",        // Area kerja aktif
        surface: "#F8FAFC",       // Area sekunder / katalog / tabel header
        charcoal: "#0F172A",      // Teks utama
        muted: "#64748B",         // Label sekunder
        hairline: "#E2E8F0",      // Border tipis 1px
        
        // Semantic Action & Status Colors
        primary: {
          DEFAULT: "#2563EB",     // Primary action blue
          hover: "#1D4ED8",
          subtle: "#EFF6FF",
          border: "#BFDBFE",
        },
        success: {
          DEFAULT: "#10B981",     // Lunas / Stok Aman
          subtle: "#ECFDF5",
          border: "#A7F3D0",
          text: "#065F46",
        },
        warning: {
          DEFAULT: "#D97706",     // Tempo / Piutang
          subtle: "#FFFBEB",
          border: "#FDE68A",
          text: "#92400E",
        },
        danger: {
          DEFAULT: "#EF4444",      // Stok Habis / Jatuh Tempo
          subtle: "#FEF2F2",
          border: "#FECACA",
          text: "#991B1B",
        },
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      borderWidth: {
        hairline: "1px",
      },
    },
  },
  plugins: [],
};
