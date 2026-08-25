import { useEffect, useRef, useState } from 'react'
import LiquidChrome from './components/LiquidChrome'
import LiquidBackground from './components/LiquidBackground'

const SIZES = [
  { label: '400px', height: '400px' },
  { label: '600px', height: '600px' },
  { label: 'Full viewport', height: '100vh' },
]

function Fps() {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  const t0 = useRef(0)

  useEffect(() => {
    let id = 0
    t0.current = performance.now()
    const tick = () => {
      frames.current++
      const now = performance.now()
      if (now - t0.current >= 500) {
        setFps(Math.round((frames.current * 1000) / (now - t0.current)))
        frames.current = 0
        t0.current = now
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  const colour = fps >= 50 ? '#0a7' : fps >= 30 ? '#c80' : '#c00'
  return <span style={{ color: colour, fontWeight: 700, fontSize: 20 }}>{fps} fps</span>
}

const btn = (on: boolean, accent: string) => ({
  padding: '7px 12px',
  fontFamily: 'monospace',
  fontSize: 13,
  cursor: 'pointer',
  border: `2px solid ${accent}`,
  background: on ? accent : '#fff',
  color: on ? '#fff' : accent,
})

export default function App() {
  const [size, setSize] = useState(SIZES[2])
  const [which, setWhich] = useState<'ours' | 'chrome'>('ours')
  const [buffer, setBuffer] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      const cv = document.querySelector('canvas') as HTMLCanvasElement | null
      setBuffer(
        cv ? `${cv.width} x ${cv.height} = ${((cv.width * cv.height) / 1e6).toFixed(2)} MP` : 'none',
      )
    }, 700)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: 14, color: '#111' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setWhich('ours')} style={btn(which === 'ours', '#570010')}>
          Ours (custom)
        </button>
        <button onClick={() => setWhich('chrome')} style={btn(which === 'chrome', '#17607a')}>
          LiquidChrome (react-bits)
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        {SIZES.map((s) => (
          <button key={s.label} onClick={() => setSize(s)} style={btn(size.label === s.label, '#555')}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 8, fontSize: 13 }}>
        <Fps />
        <span style={{ color: '#666', marginLeft: 14 }}>buffer {buffer}</span>
      </div>

      <div style={{ width: '100%', height: size.height, position: 'relative', outline: '2px solid #570010' }}>
        {which === 'ours' ? (
          <LiquidBackground key={`ours-${size.label}`} />
        ) : (
          <LiquidChrome
            key={`chrome-${size.label}`}
            baseColor={[0.1, 0.1, 0.1]}
            speed={0.3}
            amplitude={0.3}
            interactive
          />
        )}
      </div>
    </div>
  )
}
