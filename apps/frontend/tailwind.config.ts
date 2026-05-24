import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#185FA5',
        success: '#3B6D11',
        warning: '#854F0B',
        danger: '#A32D2D',
      },
    },
  },
  plugins: [],
}
export default config
