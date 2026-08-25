import LiquidChrome from '../components/LiquidChrome'

// #570010 (burnt red) as RGB in 0..1.
const BRAND: [number, number, number] = [
  0.3411764705882353, 0, 0.06274509803921569,
]

// The shader computes baseColor / abs(sin(...)), so the base colour's peak
// channel decides how much of the screen saturates. Wherever abs(sin) falls
// below a channel value the result clamps to 1.0, and because sin varies
// smoothly that region is a band around every zero crossing — flat, blown-out
// stripes that sweep as the animation runs.
//
// The reference default peaks at 0.1. #570010 peaks at 0.341, which saturates
// ~23% of the screen; at 0.1 it is ~7%, i.e. thin veins instead of slabs.
// Scaling all channels equally preserves the hue exactly.
//
// Raise PEAK for a brighter, hotter hero — at the cost of wider bands.
const PEAK = 0.1
const scale = PEAK / Math.max(...BRAND)
const BASE_COLOR = BRAND.map((c) => c * scale) as [number, number, number]

export function Hero() {
  return (
    <section id="home" className="relative min-h-[100svh] w-full overflow-hidden">
      <div className="absolute inset-0">
        <LiquidChrome baseColor={BASE_COLOR} speed={0.3} amplitude={0.3} interactive />
      </div>

      {/* Hero content slot — awaiting copy. */}
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-[100svh] max-w-6xl items-center px-5" />
    </section>
  )
}

export default Hero
