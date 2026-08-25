import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// GitHub Pages caches index.html for 600s, so a browser can run an older
// bundle than the one just deployed. Log the build to make that visible.
console.info(
  `%c[miami-veneers] build ${__BUILD_ID__}`,
  'color:#dad9d2;background:#570010;padding:2px 6px;border-radius:3px',
)
;(window as unknown as Record<string, unknown>).__build = __BUILD_ID__

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
