import LiquidChrome from '../components/LiquidChrome'

// #570010 (burnt red) normalised to 0..1 for the shader uniform.
const BASE_COLOR: [number, number, number] = [
  0.3411764705882353, 0, 0.06274509803921569,
]

export function Hero() {
  return (
    <section id="home" className="relative min-h-[100svh] w-full overflow-hidden">
      <div className="absolute inset-0">
        {/* interactive={false}: uMouse feeds the distortion loop and shifts the
            whole field's phase by up to PI, so pointer motion visibly reshuffles
            the background. Off, the field evolves on time alone. */}
        <LiquidChrome
          baseColor={BASE_COLOR}
          speed={0.3}
          amplitude={0.4}
          interactive={false}
        />
      </div>

      {/* Hero content slot — awaiting copy. */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl items-center px-5" />
    </section>
  )
}

export default Hero
