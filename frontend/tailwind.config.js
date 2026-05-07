/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LabGUI Dark Theme (Catppuccin Mocha inspired)
        lab: {
          base: '#1e1e2e',
          mantle: '#181825',
          crust: '#11111b',
          surface0: '#313244',
          surface1: '#45475a',
          surface2: '#585b70',
          overlay0: '#6c7086',
          text: '#cdd6f4',
          subtext1: '#bac2de',
          subtext0: '#a6adc8',
          blue: '#89b4fa',
          blueLight: '#b4befe',
          green: '#a6e3a1',
          yellow: '#f9e2af',
          red: '#f38ba8',
          pink: '#f5c2e7',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
