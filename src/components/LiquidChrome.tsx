import { useRef, useEffect, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'

import './LiquidChrome.css'

type LiquidChromeProps = {
  baseColor?: [number, number, number]
  speed?: number
  amplitude?: number
  frequencyX?: number
  frequencyY?: number
  interactive?: boolean
  /** Overall brightness before tone mapping. Higher = brighter mids. */
  exposure?: number
} & Omit<ComponentPropsWithoutRef<'div'>, 'color'>

export function LiquidChrome({
  baseColor = [0.1, 0.1, 0.1],
  speed = 0.2,
  amplitude = 0.3,
  frequencyX = 3,
  frequencyY = 3,
  interactive = true,
  exposure = 1,
  ...props
}: LiquidChromeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Bumped when the WebGL context is lost, to rebuild everything from scratch.
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Density drives sharpness: supersampling a low-res buffer then upscaling
    // shatters the thin filaments into broken lines, while one tap at high
    // density is both sharper and cheaper than nine taps at 1x. Key the tap
    // count off the density we actually start at, not the display's maximum.
    const maxDpr = Math.min(window.devicePixelRatio || 1, 2)
    const startDpr = Math.min(maxDpr, 1.25)
    const superSample = startDpr >= 1.25 ? 1 : 3

    // antialias: false — MSAA multiplies framebuffer memory (roughly 4x) on a
    // buffer this large, and it is redundant: the shader does its own sampling
    // and its output is smooth. The extra allocation risks GPU memory pressure
    // and context loss.
    const renderer = new Renderer({ antialias: false, dpr: maxDpr })
    const gl = renderer.gl

    // Clear to the base colour, not white. The mesh covers the viewport so the
    // clear is normally invisible, but any frame that presents the clear
    // without the draw — buffer reallocation, a dropped frame, context
    // recovery — flashes that colour. Upstream clears to white, which on a dark
    // page is a bright strobe. Clearing to the base colour makes it invisible.
    gl.clearColor(baseColor[0], baseColor[1], baseColor[2], 1)

    const vertexShader = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec3 uResolution;
      uniform vec3 uBaseColor;
      uniform float uAmplitude;
      uniform float uFrequencyX;
      uniform float uFrequencyY;
      uniform vec2 uMouse;
      uniform float uExposure;
      varying vec2 vUv;

      vec4 renderImage(vec2 uvCoord) {
          vec2 fragCoord = uvCoord * uResolution.xy;
          vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

          for (float i = 1.0; i < 10.0; i++){
              uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
              uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
          }

          vec2 diff = (uvCoord - uMouse);
          float dist = length(diff);
          float falloff = exp(-dist * 20.0);
          float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
          uv += (diff / (dist + 0.0001)) * ripple * falloff;

          // uBaseColor / abs(sin(...)) exceeds 1.0 wherever abs(sin) drops below
          // a channel's value — about 22% of the screen for this palette — so
          // those areas clamped to flat, detail-free blocks whose moving edges
          // read as flicker. A hard floor only relocates the flat region.
          // Reinhard compresses the highlights instead: smooth everywhere,
          // asymptotic to 1.0, so nothing ever clips or goes flat.
          vec3 raw = uBaseColor * uExposure / max(abs(sin(uTime - uv.y - uv.x)), 1e-3);
          vec3 color = raw / (1.0 + raw);
          return vec4(color, 1.0);
      }

      void main() {
          ${
            superSample === 1
              ? 'gl_FragColor = renderImage(vUv);'
              : `vec4 col = vec4(0.0);
          for (int i = -1; i <= 1; i++){
              for (int j = -1; j <= 1; j++){
                  vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y));
                  col += renderImage(vUv + offset);
              }
          }
          gl_FragColor = col / 9.0;`
          }
      }
    `

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Float32Array([
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height,
          ]),
        },
        uBaseColor: { value: new Float32Array(baseColor) },
        uAmplitude: { value: amplitude },
        uFrequencyX: { value: frequencyX },
        uFrequencyY: { value: frequencyY },
        uMouse: { value: new Float32Array([0, 0]) },
        uExposure: { value: exposure },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })

    // Budget in real device pixels. Dropping below native density is what
    // causes visible aliasing, so only back off on genuinely huge canvases.
    const MAX_PIXELS = 2_600_000

    let lastW = 0
    let lastH = 0

    // Resolution ladder. This shader costs ~10 loop iterations per pixel, so a
    // full-screen hero at native retina is roughly 4x the pixels of the
    // upstream demo box. Rather than guess a fixed density, the render loop
    // measures real frame times below and steps down this ladder until the
    // GPU keeps up.
    const DPR_STEPS = [2, 1.75, 1.5, 1.25, 1, 0.85]
    let stepIndex = DPR_STEPS.findIndex((d) => d <= startDpr)
    if (stepIndex < 0) stepIndex = DPR_STEPS.length - 1

    function resize(force = false) {
      if (!container) return
      const w = container.offsetWidth
      const h = container.offsetHeight
      if (!force && w === lastW && h === lastH) return
      lastW = w
      lastH = h
      const area = Math.max(w * h, 1)
      const budgeted = Math.sqrt(MAX_PIXELS / area)
      renderer.dpr = Math.max(0.85, Math.min(DPR_STEPS[stepIndex], budgeted))
      renderer.setSize(w, h)
      const res = program.uniforms.uResolution.value as Float32Array
      res[0] = gl.canvas.width
      res[1] = gl.canvas.height
      res[2] = gl.canvas.width / gl.canvas.height
    }
    const handleResize = () => resize()
    window.addEventListener('resize', handleResize)
    resize()

    // uMouse feeds the distortion loop, not just the ripple, shifting the whole
    // field's phase by up to PI. Assigning it straight from the event (as
    // upstream does) makes any cursor jump snap the background to a different
    // state. Track a target and ease toward it instead.
    const mouseTarget = new Float32Array([0, 0])

    function setMouseFromPoint(clientX: number, clientY: number) {
      if (!container) return
      const rect = container.getBoundingClientRect()
      mouseTarget[0] = (clientX - rect.left) / rect.width
      mouseTarget[1] = 1 - (clientY - rect.top) / rect.height
    }

    function handleMouseMove(event: MouseEvent) {
      setMouseFromPoint(event.clientX, event.clientY)
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0]
      if (touch) setMouseFromPoint(touch.clientX, touch.clientY)
    }

    // Listen on window rather than the container. Upstream binds to the
    // container, so the uniform freezes while the cursor is over the nav and
    // then jumps when it re-enters — a discontinuity in the field. Window-level
    // tracking stays continuous, and needs no hit-testing, so the background
    // can keep pointer-events: none.
    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('touchmove', handleTouchMove)
    }

    let animationId = 0
    let running = false
    // Accumulate rendered time rather than reading the raw rAF timestamp, so
    // that a stop/start (context loss and recovery) resumes where it left off
    // instead of jumping the field forward by the whole gap.
    let elapsed = 0
    let lastFrame = 0

    // Frame-time sampling: step the resolution down until we hold ~60fps.
    const TARGET_MS = 20
    let samples: number[] = []
    let tuned = false

    function tune(dt: number) {
      if (tuned || dt <= 0) return
      // A long gap means the tab was backgrounded, not that the GPU is slow.
      // Discard what we had so resume noise can't trigger a resolution drop
      // (each drop reallocates the drawing buffer, which itself flashes).
      if (dt > 200) {
        samples = []
        return
      }
      samples.push(dt)
      if (samples.length < 24) return
      samples.sort((a, b) => a - b)
      const median = samples[Math.floor(samples.length / 2)]
      samples = []
      if (median > TARGET_MS && stepIndex < DPR_STEPS.length - 1) {
        stepIndex++
        resize(true)
      } else {
        tuned = true
      }
    }

    function update(t: number) {
      animationId = requestAnimationFrame(update)
      const dt = lastFrame !== 0 ? t - lastFrame : 0
      // Cap the step fed to uTime. The distortion loop is chaotic, so a long
      // frame advances the field far enough to look like a jump rather than
      // motion. Capping means a slow GPU animates slower, never strobes.
      if (lastFrame !== 0) elapsed += Math.min(dt, 24)
      lastFrame = t
      tune(dt)
      program.uniforms.uTime.value = elapsed * 0.001 * speed

      const mouse = program.uniforms.uMouse.value as Float32Array
      mouse[0] += (mouseTarget[0] - mouse[0]) * 0.04
      mouse[1] += (mouseTarget[1] - mouse[1]) * 0.04

      renderer.render({ scene: mesh })
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function start() {
      if (running) return
      running = true
      if (reduceMotion) {
        renderer.render({ scene: mesh })
        return
      }
      lastFrame = 0
      animationId = requestAnimationFrame(update)
    }

    function stop() {
      if (!running) return
      running = false
      cancelAnimationFrame(animationId)
    }

    // Started unconditionally. Browsers already throttle rAF in hidden tabs,
    // so gating on IntersectionObserver/visibilitychange bought nothing while
    // every pause/resume risked a visible discontinuity.
    start()

    // Backgrounding the window lets the GPU reclaim the context. A restored
    // context invalidates every resource created on the old one — program,
    // buffers, geometry — so resuming the loop would render through a dead
    // program and produce garbage. Rebuild the whole effect instead.
    function handleContextLost(e: Event) {
      e.preventDefault()
      stop()
      console.warn('[LiquidChrome] WebGL context lost — rebuilding on restore')
    }
    function handleContextRestored() {
      console.warn('[LiquidChrome] WebGL context restored — rebuilding')
      setGeneration((g) => g + 1)
    }
    gl.canvas.addEventListener('webglcontextlost', handleContextLost)
    gl.canvas.addEventListener('webglcontextrestored', handleContextRestored)

    container.appendChild(gl.canvas)

    return () => {
      stop()
      window.removeEventListener('resize', handleResize)
      gl.canvas.removeEventListener('webglcontextlost', handleContextLost)
      gl.canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('touchmove', handleTouchMove)
      }
      gl.canvas.parentElement?.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive, exposure, generation])

  return <div ref={containerRef} className="liquidChrome-container" {...props} />
}

export default LiquidChrome
