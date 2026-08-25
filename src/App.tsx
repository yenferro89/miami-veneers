import { useEffect, useRef, useState } from 'react'
import LiquidChrome from './components/LiquidChrome'

const SIZES = [
  { label: '400px', height: '400px' },
  { label: '600px (docs)', height: '600px' },
  { label: 'Full viewport', height: '100vh' },
]

function Fps() {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  const t0 = useRef(performance.now())

  useEffect(() => {
    let id = 0
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
  return (
    <span style={{ color: colour, fontWeight: 700, fontSize: 22 }}>{fps} fps</span>
  )
}

export default function App() {
  const [size, setSize] = useState(SIZES[0])
  const [buffer, setBuffer] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      const cv = document.querySelector(
        '.liquidChrome-container canvas',
      ) as HTMLCanvasElement | null
      setBuffer(cv ? `${cv.width} x ${cv.height} = ${(cv.width * cv.height / 1e6).toFixed(2)} MP` : 'none')
    }, 700)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ fontFamily: 'monospace', padding: 16, color: '#111' }}>
      <h1 style={{ fontSize: 17, margin: '0 0 10px' }}>
        Frame-rate test — Intel Iris Plus 640
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {SIZES.map((s) => (
          <button
            key={s.label}
            onClick={() => setSize(s)}
            style={{
              padding: '7px 12px',
              fontFamily: 'monospace',
              fontSize: 13,
              cursor: 'pointer',
              border: '2px solid #570010',
              background: size.label === s.label ? '#570010' : '#fff',
              color: size.label === s.label ? '#fff' : '#570010',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 10, fontSize: 13 }}>
        <Fps />
        <span style={{ color: '#666', marginLeft: 14 }}>buffer {buffer}</span>
      </div>

      <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px', maxWidth: 640 }}>
        Click each size and note the fps. Green = smooth, amber = borderline, red
        = the animation is stepping and will look like flashing. This tells us the
        largest size this shader can hold on this GPU.
      </p>

      <div style={{ width: '100%', height: size.height, position: 'relative', outline: '2px solid #570010' }}>
        <LiquidChrome
          key={size.label}
          baseColor={[0.1, 0.1, 0.1]}
          speed={0.3}
          amplitude={0.3}
          interactive
        />
      </div>
    </div>
  )
}
