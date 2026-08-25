import { useEffect, useState } from 'react'
import LiquidChrome from './components/LiquidChrome'

type Diag = Record<string, string>

function probe(): Diag {
  const out: Diag = {}
  out['devicePixelRatio'] = String(window.devicePixelRatio)
  out['viewport'] = `${window.innerWidth} x ${window.innerHeight}`

  let gl: WebGLRenderingContext | null = null
  try {
    const c = document.createElement('canvas')
    gl = (c.getContext('webgl') ||
      c.getContext('experimental-webgl')) as WebGLRenderingContext | null
  } catch (e) {
    out['contextError'] = String(e)
  }

  if (!gl) {
    out['WebGL'] = 'UNAVAILABLE — cannot create a context'
    return out
  }

  out['WebGL'] = 'available'
  out['contextLost'] = String(gl.isContextLost())
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    if (dbg) {
      out['GPU vendor'] = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL))
      out['GPU renderer'] = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
    }
  } catch {
    /* extension unavailable */
  }
  out['maxTextureSize'] = String(gl.getParameter(gl.MAX_TEXTURE_SIZE))

  // How many more contexts can this page create before the browser refuses?
  const held: WebGLRenderingContext[] = []
  for (let i = 0; i < 20; i++) {
    const g = document.createElement('canvas').getContext('webgl')
    if (!g || g.isContextLost()) break
    held.push(g as WebGLRenderingContext)
  }
  out['spare contexts'] = `${held.length} of 20`
  held.forEach((g) => g.getExtension('WEBGL_lose_context')?.loseContext())
  gl.getExtension('WEBGL_lose_context')?.loseContext()

  return out
}

export default function App() {
  const [diag, setDiag] = useState<Diag>({})
  const [canvasInfo, setCanvasInfo] = useState('checking…')

  useEffect(() => {
    setDiag(probe())
    const t = setTimeout(() => {
      const cv = document.querySelector('.liquidChrome-container canvas')
      setCanvasInfo(
        cv
          ? `canvas present — buffer ${(cv as HTMLCanvasElement).width} x ${(cv as HTMLCanvasElement).height}`
          : 'NO CANVAS — the component never appended one',
      )
    }, 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: 16, color: '#111' }}>
      <h1 style={{ fontSize: 18, margin: '0 0 12px' }}>LiquidChrome diagnostics</h1>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
        <tbody>
          {Object.entries(diag).map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '3px 14px 3px 0', color: '#666' }}>{k}</td>
              <td style={{ padding: '3px 0', fontWeight: 700 }}>{v}</td>
            </tr>
          ))}
          <tr>
            <td style={{ padding: '3px 14px 3px 0', color: '#666' }}>canvas</td>
            <td style={{ padding: '3px 0', fontWeight: 700 }}>{canvasInfo}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>
        Below is the component, in a 400px box. If this area is blank/white, WebGL
        is failing on this machine — the numbers above say why.
      </p>

      <div
        style={{
          width: '100%',
          height: '400px',
          position: 'relative',
          outline: '2px solid #570010',
        }}
      >
        <LiquidChrome
          baseColor={[0.1, 0.1, 0.1]}
          speed={0.3}
          amplitude={0.3}
          interactive
        />
      </div>
    </div>
  )
}
