import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Stamp each build so the running page can be identified. GitHub Pages
  // caches index.html for 600s behind a CDN, so a browser can easily be
  // running an older bundle than the one just deployed.
  define: {
    __BUILD_ID__: JSON.stringify(
      new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z',
    ),
  },
  plugins: [react(), tailwindcss()],
  // Relative base so the build works on GitHub Pages project sites
  // (and anywhere else) without hardcoding the repo name.
  base: './',
})
