import { useRef, useEffect } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { Renderer, Program, Mesh, Triangle } from 'ogl'

import './LiquidBackground.css'

type RGB = [number, number, number]

type LiquidBackgroundProps = {
  /** Deepest tone, the body of the field. */
  shadow?: RGB
  /** Mid tone the field mostly reads as. */
  base?: RGB
  /** Highlight running through the crests. */
  highlight?: RGB
  speed?: number
  /** Turbulence of the domain warp. Higher = more folded. */
  warp?: number
  scale?: number
  interactive?: boolean
} & Omit<ComponentPropsWithoutRef<'div'>, 'color'>

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
]

export function LiquidBackground({
  shadow = hex('#1A0006'),
  base = hex('#570010'),
  highlight = hex('#C4485E'),
  speed = 0.08,
  warp = 1.1,
  scale = 1.6,
  interactive = true,
  ...props
}: LiquidBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Render at real display density. This shader is cheap enough to afford it,
    // which is what keeps the gradients smooth rather than upscaled and blocky.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const renderer = new Renderer({ antialias: false, dpr, alpha: false })
    const gl = renderer.gl
    gl.clearColor(shadow[0], shadow[1], shadow[2], 1)

    const vertex = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `

    // Domain-warped value noise. Every output is a mix() or smoothstep(), so
    // the result is bounded to [0,1] by construction — it cannot blow out into
    // flat saturated bands the way a divide-by-near-zero does, and there are no
    // sub-pixel features to alias. Four octaves, three evaluations: roughly
    // fifty times cheaper than a 10-iteration loop sampled nine times.
    const fragment = `
      precision highp float;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec3 uShadow;
      uniform vec3 uBase;
      uniform vec3 uHighlight;
      uniform float uWarp;
      uniform float uScale;

      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        vec2 p = vec2(uv.x * (uResolution.x / uResolution.y), uv.y) * uScale;

        // Pointer nudges the field gently rather than shifting its phase.
        p += (uMouse - 0.5) * 0.25;

        float t = uTime;

        // Two-stage domain warp gives the slow folding, liquid motion.
        vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t * 0.8));
        vec2 r = vec2(
          fbm(p + uWarp * q + vec2(1.7, 9.2) + t * 0.6),
          fbm(p + uWarp * q + vec2(8.3, 2.8) - t * 0.5)
        );
        float v = fbm(p + uWarp * r);

        // Bounded ramps — no division, nothing unbounded.
        float body = smoothstep(0.15, 0.85, v);
        float crest = smoothstep(0.62, 0.98, v);

        vec3 color = mix(uShadow, uBase, body);
        color = mix(color, uHighlight, crest * 0.85);

        // Soft sheen along the crests, still bounded.
        color += uHighlight * pow(crest, 3.0) * 0.18;

        // Sub-LSB dither: 8-bit quantisation bands visibly in dark gradients.
        color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

        gl_FragColor = vec4(color, 1.0);
      }
    `

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Float32Array([1, 1]) },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uShadow: { value: new Float32Array(shadow) },
        uBase: { value: new Float32Array(base) },
        uHighlight: { value: new Float32Array(highlight) },
        uWarp: { value: warp },
        uScale: { value: scale },
      },
    })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

    // Track the container itself, so the canvas stays correct when the element
    // resizes for reasons that never fire a window resize — a mobile URL bar
    // hiding, fonts settling, a layout change elsewhere on the page.
    function resize() {
      const w = container!.offsetWidth
      const h = container!.offsetHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      const res = program.uniforms.uResolution.value as Float32Array
      res[0] = gl.canvas.width
      res[1] = gl.canvas.height
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()

    const target = new Float32Array([0.5, 0.5])
    function onPointer(clientX: number, clientY: number) {
      const rect = container!.getBoundingClientRect()
      target[0] = (clientX - rect.left) / rect.width
      target[1] = 1 - (clientY - rect.top) / rect.height
    }
    const onMouse = (e: MouseEvent) => onPointer(e.clientX, e.clientY)
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) onPointer(t.clientX, t.clientY)
    }
    if (interactive) {
      window.addEventListener('mousemove', onMouse, { passive: true })
      window.addEventListener('touchmove', onTouch, { passive: true })
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let elapsed = 0
    let last = 0

    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      // Cap the step so a stalled frame advances the field a little, never far.
      elapsed += last ? Math.min(now - last, 32) : 0
      last = now

      program.uniforms.uTime.value = elapsed * 0.001 * speed

      const m = program.uniforms.uMouse.value as Float32Array
      m[0] += (target[0] - m[0]) * 0.03
      m[1] += (target[1] - m[1]) * 0.03

      renderer.render({ scene: mesh })
    }

    container.appendChild(gl.canvas)
    if (reduceMotion) renderer.render({ scene: mesh })
    else raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      if (interactive) {
        window.removeEventListener('mousemove', onMouse)
        window.removeEventListener('touchmove', onTouch)
      }
      gl.canvas.parentElement?.removeChild(gl.canvas)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [shadow, base, highlight, speed, warp, scale, interactive])

  return <div ref={containerRef} className="liquidBackground-container" {...props} />
}

export default LiquidBackground
