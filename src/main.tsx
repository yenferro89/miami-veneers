import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// TEMP A/B: ?noblur=1 disables backdrop-filter so the same build can be
// compared with and without live backdrop sampling.
if (new URLSearchParams(location.search).has('noblur')) {
  document.documentElement.classList.add('no-blur')
}

console.info(`%c[miami-veneers] build ${__BUILD_ID__}`, 'color:#dad9d2;background:#570010;padding:2px 6px;border-radius:3px')
;(window as unknown as Record<string, unknown>).__build = __BUILD_ID__

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
