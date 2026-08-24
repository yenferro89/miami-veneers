import { useRef, useEffect, useState } from 'react'
import './GooeyNav.css'

export type GooeyNavItem = {
  label: string
  href: string
}

type GooeyNavProps = {
  items: GooeyNavItem[]
  animationTime?: number
  particleCount?: number
  particleDistances?: [number, number]
  particleR?: number
  timeVariance?: number
  colors?: number[]
  initialActiveIndex?: number
}

type Particle = {
  start: [number, number]
  end: [number, number]
  time: number
  scale: number
  color: number
  rotate: number
}

const noise = (n = 1) => n / 2 - Math.random() * n

const getXY = (
  distance: number,
  pointIndex: number,
  totalPoints: number,
): [number, number] => {
  const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180)
  return [distance * Math.cos(angle), distance * Math.sin(angle)]
}

const createParticle = (
  i: number,
  t: number,
  d: [number, number],
  r: number,
  particleCount: number,
  colors: number[],
): Particle => {
  const rotate = noise(r / 10)
  return {
    start: getXY(d[0], particleCount - i, particleCount),
    end: getXY(d[1] + noise(7), particleCount - i, particleCount),
    time: t,
    scale: 1 + noise(0.2),
    color: colors[Math.floor(Math.random() * colors.length)],
    rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
  }
}

export function GooeyNav({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
}: GooeyNavProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLUListElement>(null)
  const filterRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex)

  const makeParticles = (element: HTMLElement) => {
    const d = particleDistances
    const r = particleR
    const bubbleTime = animationTime * 2 + timeVariance
    element.style.setProperty('--time', `${bubbleTime}ms`)

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2)
      const p = createParticle(i, t, d, r, particleCount, colors)
      element.classList.remove('active')

      setTimeout(() => {
        const particle = document.createElement('span')
        const point = document.createElement('span')
        particle.classList.add('particle')
        particle.style.setProperty('--start-x', `${p.start[0]}px`)
        particle.style.setProperty('--start-y', `${p.start[1]}px`)
        particle.style.setProperty('--end-x', `${p.end[0]}px`)
        particle.style.setProperty('--end-y', `${p.end[1]}px`)
        particle.style.setProperty('--time', `${p.time}ms`)
        particle.style.setProperty('--scale', `${p.scale}`)
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`)
        particle.style.setProperty('--rotate', `${p.rotate}deg`)

        point.classList.add('point')
        particle.appendChild(point)
        element.appendChild(particle)
        requestAnimationFrame(() => element.classList.add('active'))

        setTimeout(() => {
          try {
            element.removeChild(particle)
          } catch {
            // particle already cleared by a newer click
          }
        }, t)
      }, 30)
    }
  }

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const pos = element.getBoundingClientRect()

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    }
    Object.assign(filterRef.current.style, styles)
    Object.assign(textRef.current.style, styles)
    textRef.current.innerText = element.innerText
  }

  const activate = (liEl: HTMLElement, index: number) => {
    if (activeIndex === index) return

    setActiveIndex(index)
    updateEffectPosition(liEl)

    if (filterRef.current) {
      filterRef.current
        .querySelectorAll('.particle')
        .forEach((p) => p.remove())
    }

    if (textRef.current) {
      textRef.current.classList.remove('active')
      void textRef.current.offsetWidth
      textRef.current.classList.add('active')
    }

    if (filterRef.current) makeParticles(filterRef.current)
  }

  const handleClick = (e: React.MouseEvent<HTMLLIElement>, index: number) => {
    activate(e.currentTarget, index)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    const liEl = e.currentTarget.parentElement
    if (liEl) activate(liEl, index)
  }

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex]
    if (activeLi) {
      updateEffectPosition(activeLi as HTMLElement)
      textRef.current?.classList.add('active')
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex]
      if (currentActiveLi) updateEffectPosition(currentActiveLi as HTMLElement)
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [activeIndex])

  return (
    <div className="gooey-nav-container" ref={containerRef}>
      <nav>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li
              key={item.href}
              className={activeIndex === index ? 'active' : ''}
              onClick={(e) => handleClick(e, index)}
            >
              <a href={item.href} onKeyDown={(e) => handleKeyDown(e, index)}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {/* Alpha-channel goo: blur, then push alpha through a steep ramp so
          nearby blobs fuse. Works over transparency, unlike blur+contrast. */}
      <svg aria-hidden="true" focusable="false" width="0" height="0"
        style={{ position: 'absolute' }}>
        <defs>
          <filter id="gooey-nav-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            />
          </filter>
        </defs>
      </svg>
      <span className="effect filter" ref={filterRef} />
      <span className="effect text" ref={textRef} />
    </div>
  )
}

export default GooeyNav
