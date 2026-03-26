import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        lumara: {
          500: '#c040f0',
          600: '#a21fce',
          950: '#3d0a4e',
        },
      },
    },
  },
  plugins: [],
}

export default config
