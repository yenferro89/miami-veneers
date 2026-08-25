import LiquidChrome from './components/LiquidChrome'

// ISOLATION TEST — not the real page.
// Verbatim component, reference default props from the docs usage example,
// nothing overlaying it. If this still shows stripes or flashing, the cause is
// environmental (GPU/driver/display), not our colour or our integration.
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <LiquidChrome
        baseColor={[0.1, 0.1, 0.1]}
        speed={1}
        amplitude={0.6}
        interactive={true}
      />
    </div>
  )
}
