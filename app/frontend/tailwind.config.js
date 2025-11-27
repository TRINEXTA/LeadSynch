/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Safelist pour garantir la génération des classes dynamiques
  safelist: [
    // Backgrounds
    { pattern: /^bg-(gray|blue|purple|green|red|orange|yellow|amber|pink|indigo|emerald|teal|cyan|rose)-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Text colors
    { pattern: /^text-(gray|blue|purple|green|red|orange|yellow|amber|pink|indigo|emerald|teal|cyan|rose)-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Border colors
    { pattern: /^border-(gray|blue|purple|green|red|orange|yellow|amber|pink|indigo|emerald|teal|cyan|rose)-(50|100|200|300|400|500|600|700|800|900)$/ },
    // Ring colors
    { pattern: /^ring-(gray|blue|purple|green|red|orange|yellow|amber|pink|indigo|emerald|teal|cyan|rose)-(50|100|200|300|400|500|600|700|800|900)$/ },
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
}
