import LiquidChrome from '../components/LiquidChrome'

// #570010 (burnt red) as an RGB array in 0..1, per the baseColor prop.
const BASE_COLOR: [number, number, number] = [
  0.3411764705882353, 0, 0.06274509803921569,
]

export function Hero() {
  return (
    <section id="home" className="relative min-h-[100svh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <LiquidChrome baseColor={BASE_COLOR} speed={0.2} amplitude={0.2} interactive />
      </div>

      {/* Hero content slot — awaiting copy. */}
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[100svh] max-w-6xl items-center px-5" />
    </section>
  )
}

export default Hero
