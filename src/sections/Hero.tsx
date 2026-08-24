import LiquidChrome from '../components/LiquidChrome'

// #570010 (burnt red) normalised to 0..1 for the shader uniform.
//
// Note this is bright for this shader: it divides baseColor by abs(sin(...)),
// so a channel at 0.341 blows past 1.0 across roughly 22% of the screen. The
// reference default is [0.1, 0.1, 0.1]. Tone mapping keeps that from clipping;
// scaling BASE_COLOR down (hue preserved) would shrink the bright area further
// if the highlights ever read as too hot.
const BASE_COLOR: [number, number, number] = [
  0.3411764705882353, 0, 0.06274509803921569,
]

export function Hero() {
  return (
    <section id="home" className="relative min-h-[100svh] w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {/* uMouse feeds the distortion loop, shifting the field's phase by up
            to PI, so the component damps pointer input rather than applying it
            raw as upstream does. */}
        <LiquidChrome baseColor={BASE_COLOR} speed={0.3} amplitude={0.3} interactive />
      </div>

      {/* Hero content slot — awaiting copy. */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl items-center px-5" />
    </section>
  )
}

export default Hero
