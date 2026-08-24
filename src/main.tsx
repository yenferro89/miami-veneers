import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// TEMP A/B: ?noblur=1 disables backdrop-filter so the same build can be
// compared with and without live backdrop sampling.
if (new URLSearchParams(location.search).has('noblur')) {
  document.documentElement.classList.add('no-blur')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
