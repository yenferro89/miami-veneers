import LiquidChrome from './components/LiquidChrome'

export default function App() {
  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <LiquidChrome
        baseColor={[0.1, 0.1, 0.1]}
        speed={0.3}
        amplitude={0.3}
        interactive
      />
    </div>
  )
}
