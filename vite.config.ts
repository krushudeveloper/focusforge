import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base keeps the build portable for GitHub Pages project sites.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
