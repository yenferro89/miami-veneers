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
  contrastFloor = 0.28,
  ...props
}: LiquidChromeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new Renderer({ antialias: true })
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
          // Single tap. The clamped divisor makes the field smooth enough that
          // 3x3 supersampling (9x the shader cost) buys nothing visible.
          gl_FragColor = renderImage(vUv);
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

    // Cap the drawing buffer. This shader runs a 10-iteration loop per pixel,
    // so cost scales directly with pixel count.
    const MAX_PIXELS = 1_100_000

    function resize() {
      if (!container) return
      const w = container.offsetWidth
      const h = container.offsetHeight
      const scale = Math.min(1, Math.sqrt(MAX_PIXELS / Math.max(w * h, 1)))
      renderer.dpr = scale
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

    function update(t: number) {
      animationId = requestAnimationFrame(update)
      program.uniforms.uTime.value = t * 0.001 * speed
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
      animationId = requestAnimationFrame(update)
    }

    function stop() {
      if (!running) return
      running = false
      cancelAnimationFrame(animationId)
    }

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
