import { heroui } from '@heroui/react'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,mjs}',
    './node_modules/@heroui/react/dist/**/*.{js,mjs}',
    './node_modules/@heroui/react/node_modules/@heroui/theme/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [heroui()]
}
