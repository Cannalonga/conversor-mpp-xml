/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CannaConvert Brand Colors
        primary: {
          50: '#e6fafb',
          100: '#ccf5f7',
          200: '#99ebef',
          300: '#66e1e7',
          400: '#33d7df',
          500: '#0AC9D2',  // Main brand color
          600: '#08a8b0',
          700: '#006B7F',  // Secondary
          800: '#054f5c',
          900: '#033339',
        },
        accent: {
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9cfd7',
          300: '#f4a7b5',
          400: '#ed6f85',
          500: '#C41E3A',  // Ruby accent
          600: '#a31830',
          700: '#821326',
          800: '#610e1d',
          900: '#410913',
        },
        dark: {
          800: '#1a1a2e',
          900: '#0f3460',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
