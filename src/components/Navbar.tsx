import { useState } from 'react'
import GooeyNav, { type GooeyNavItem } from './GooeyNav'
import logo from '../assets/logo-burnt-red.png'

const NAV_ITEMS: GooeyNavItem[] = [
  { label: 'Home', href: '#home' },
  { label: 'Smile Gallery', href: '#smile-gallery' },
  { label: 'Services', href: '#services' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

const PHONE_DISPLAY = '(305) 627-3980'
const PHONE_HREF = 'tel:+13056273980'

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  )
}

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto max-w-6xl">
        {/* Glass pill. The blurred surface is a sibling layer behind the
            content, not its ancestor: with the GooeyNav nested inside a
            backdrop-filter element, every particle frame forced Chrome to
            re-read and re-blur the live WebGL canvas behind it, which flickered
            the hero on each click. */}
        <div className="relative isolate flex items-center justify-between gap-3 rounded-full px-2 py-2 sm:px-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 rounded-full border border-vintage/25 bg-vintage/10 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl"
          />
          {/* Circular logo */}
          <a href="#home" className="shrink-0" aria-label="Miami Veneers — home">
            <span className="grid size-11 place-items-center overflow-hidden rounded-full bg-vintage ring-1 ring-vintage/60 sm:size-12">
              <img src={logo} alt="Miami Veneers & Modern Dentistry"
                className="size-[78%] object-contain" />
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:block">
            <GooeyNav items={NAV_ITEMS} />
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 md:flex">
            <a href={PHONE_HREF}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-vintage transition-colors hover:bg-vintage/15">
              <PhoneIcon className="size-4" />
              {PHONE_DISPLAY}
            </a>
            <a href="#contact"
              className="rounded-full bg-vintage px-4 py-2 text-sm font-semibold text-burnt transition-opacity hover:opacity-85">
              Make Appointment
            </a>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-1.5 md:hidden">
            <a href={PHONE_HREF} aria-label={`Call ${PHONE_DISPLAY}`}
              className="grid size-10 place-items-center rounded-full text-vintage transition-colors hover:bg-vintage/15">
              <PhoneIcon className="size-[18px]" />
            </a>
            <button type="button" onClick={() => setOpen((v) => !v)}
              aria-expanded={open} aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="grid size-10 place-items-center rounded-full text-vintage transition-colors hover:bg-vintage/15">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" className="size-5" aria-hidden="true">
                {open ? (
                  <>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </>
                ) : (
                  <>
                    <path d="M3 12h18" />
                    <path d="M3 6h18" />
                    <path d="M3 18h18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div id="mobile-menu"
          className={`grid overflow-hidden transition-all duration-300 ease-out md:hidden ${
            open ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}>
          <div className="min-h-0">
            <nav className="relative isolate rounded-3xl p-2">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 rounded-3xl border border-vintage/25 bg-vintage/10 backdrop-blur-xl"
              />
              <ul>
                {NAV_ITEMS.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} onClick={() => setOpen(false)}
                      className="block rounded-2xl px-4 py-3 text-[15px] font-medium text-vintage transition-colors hover:bg-vintage/15">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <a href="#contact" onClick={() => setOpen(false)}
                className="mt-2 block rounded-2xl bg-vintage px-4 py-3 text-center text-[15px] font-semibold text-burnt">
                Make Appointment
              </a>
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
