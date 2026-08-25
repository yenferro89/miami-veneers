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

// No StrictMode. It double-invokes effects in development, and LiquidChrome
// creates a WebGL context per effect run. Combined with HMR remounting on
// every save, that exhausts the browser's context limit (~16) until context
// creation fails outright — a white canvas showing only the clear colour.
// react-bits does not use StrictMode on its own site either.
createRoot(document.getElementById('root')!).render(<App />)
