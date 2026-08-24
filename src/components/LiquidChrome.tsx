import { useRef, useEffect } from 'react'
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
  /** Lower = brighter, harsher highlights. Guards against strobing. */
  contrastFloor?: number
} & Omit<ComponentPropsWithoutRef<'div'>, 'color'>

export function LiquidChrome({
  baseColor = [0.1, 0.1, 0.1],
  speed = 0.2,
  amplitude = 0.3,
  frequencyX = 3,
  frequencyY = 3,
  interactive = true,
  contrastFloor = 0.12,
  ...props
}: LiquidChromeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Render at the screen's real pixel density. Supersampling a low-res
    // buffer and upscaling it shatters the thin filaments into broken lines;
    // one tap at native density is both sharper AND cheaper than 9 taps at 1x.
    const maxDpr = Math.min(window.devicePixelRatio || 1, 2)
    const superSample = maxDpr >= 1.5 ? 1 : 3

    const renderer = new Renderer({ antialias: true, dpr: maxDpr })
    const gl = renderer.gl
    gl.clearColor(1, 1, 1, 1)

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
      uniform float uContrastFloor;
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

          // The original divides by abs(sin(...)), which tends to zero and blows
          // the highlights to pure white. Flooring the divisor keeps the liquid
          // filaments but bounds the brightness, so the hero can't strobe.
          float divisor = max(abs(sin(uTime - uv.y - uv.x)), uContrastFloor);
          vec3 color = uBaseColor / divisor;
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
        uContrastFloor: { value: contrastFloor },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })

    // Budget in real device pixels. Dropping below native density is what
    // causes visible aliasing, so only back off on genuinely huge canvases.
    const MAX_PIXELS = 5_000_000

    let lastW = 0
    let lastH = 0

    function resize() {
      if (!container) return
      const w = container.offsetWidth
      const h = container.offsetHeight
      if (w === lastW && h === lastH) return
      lastW = w
      lastH = h
      const area = Math.max(w * h, 1)
      const budgeted = Math.sqrt(MAX_PIXELS / area)
      renderer.dpr = Math.max(1, Math.min(maxDpr, budgeted))
      renderer.setSize(w, h)
      const res = program.uniforms.uResolution.value as Float32Array
      res[0] = gl.canvas.width
      res[1] = gl.canvas.height
      res[2] = gl.canvas.width / gl.canvas.height
    }
    window.addEventListener('resize', resize)
    resize()

    function setMouseFromPoint(clientX: number, clientY: number) {
      if (!container) return
      const rect = container.getBoundingClientRect()
      const mouse = program.uniforms.uMouse.value as Float32Array
      mouse[0] = (clientX - rect.left) / rect.width
      mouse[1] = 1 - (clientY - rect.top) / rect.height
    }

    function handleMouseMove(event: MouseEvent) {
      setMouseFromPoint(event.clientX, event.clientY)
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0]
      if (touch) setMouseFromPoint(touch.clientX, touch.clientY)
    }

    if (interactive) {
      container.addEventListener('mousemove', handleMouseMove)
      container.addEventListener('touchmove', handleTouchMove)
    }

    // Pause the render loop when the hero scrolls out of view or the tab is
    // hidden — this shader runs every frame and is costly on phones.
    let animationId = 0
    let running = false
    // Accumulate only the time spent running. Feeding the raw rAF timestamp
    // straight in means that after a pause (hero scrolled offscreen, tab
    // backgrounded) uTime jumps by the whole paused duration and the pattern
    // snaps to a new state — seen as an intermittent flicker.
    let elapsed = 0
    let lastFrame = 0

    function update(t: number) {
      animationId = requestAnimationFrame(update)
      if (lastFrame !== 0) elapsed += t - lastFrame
      lastFrame = t
      program.uniforms.uTime.value = elapsed * 0.001 * speed
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

    // Paint one frame up front so the canvas is never blank while paused.
    renderer.render({ scene: mesh })

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0 },
    )
    observer.observe(container)

    function handleVisibility() {
      if (document.hidden) stop()
      else start()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    container.appendChild(gl.canvas)

    return () => {
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('resize', resize)
      if (interactive) {
        container.removeEventListener('mousemove', handleMouseMove)
        container.removeEventListener('touchmove', handleTouchMove)
      }
      gl.canvas.parentElement?.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive, contrastFloor])

  return <div ref={containerRef} className="liquidChrome-container" {...props} />
}

export default LiquidChrome
