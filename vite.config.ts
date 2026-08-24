import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so the build works on GitHub Pages project sites
  // (and anywhere else) without hardcoding the repo name.
  base: './',
})
