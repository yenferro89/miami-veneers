# Miami Veneers

Static React mockup built as a pitch for Miami Veneers & Modern Dentistry
(currently on WordPress/Elementor at miamiveneers.com).

**Live:** https://yenferro89.github.io/miami-veneers/

## Stack

- React 19 + TypeScript
- Vite 8 (`base: './'`, so the build is path-independent)
- Tailwind CSS v4
- oxlint
- Deployed to GitHub Pages on every push to `main`

## Commands

```bash
npm install     # install dependencies
npm run dev     # dev server, exposed on the local network
npm run build   # production build to dist/
npm run preview # serve the production build
npm run lint    # oxlint
```

## Brand

| Token | Value |
| --- | --- |
| `--color-burnt` | `#570010` |
| `--color-vintage` | `#dad9d2` |
| `--font-sans` | Inter (self-hosted via `@fontsource`) |
| `--font-serif` | Times |

Logo assets live in `images/`; the one the app bundles is copied to
`src/assets/`.

## Structure

```
src/
  components/
    LiquidChrome.tsx   WebGL hero background (adapted from react-bits)
    GooeyNav.tsx       Particle nav effect (adapted from react-bits)
    Navbar.tsx         Glass pill nav — mobile menu, desktop GooeyNav
  sections/
    Hero.tsx           Full-viewport hero. Content slot is intentionally empty.
```

## Notes on the react-bits components

Both are adapted rather than copied verbatim. The upstream versions assume a
small demo box on an opaque background; this site runs one full-screen and the
other on translucent glass. The deviations that matter:

**GooeyNav** — upstream fakes its goo with a black backdrop plus
`mix-blend-mode: lighten`, which needs an opaque backdrop in the same blend
group. Inside a `backdrop-filter` element (the glass pill) the blend group is
isolated and that black box renders literally. Replaced with an SVG
alpha-channel filter, which needs no backing. Upstream also passes
`href: null`; the nav here handles its own scrolling instead.

**LiquidChrome** — four changes, all measured:

1. *Tone mapping.* `baseColor / abs(sin(...))` exceeds 1.0 wherever `abs(sin)`
   drops below a channel value. `#570010` has `r = 0.341` against the reference
   default of `0.1`, so ~22% of the screen clamped to flat, detail-free blocks
   whose moving edges read as flicker. Reinhard compresses the highlights
   instead — measured flat area fell from 23% to 0.3% with peak red at 0.997,
   so the palette is unchanged.
2. *Adaptive resolution.* Fixed density fails in both directions: too low
   aliases the filaments into broken lines, too high starves the frame rate.
   The loop samples frame times and steps down a dpr ladder until the median
   frame is under 20ms.
3. *Capped time step.* `uTime` advances with real time, and the distortion loop
   is chaotic, so a long frame jumps the field rather than moving it. Capped at
   24ms, a slow GPU animates slower instead of strobing.
4. *Clear colour and MSAA.* Upstream clears to white each frame, which flashes
   on a dark page if any frame presents the clear without the draw. Clears to
   the base colour now. `antialias` is off — MSAA multiplies framebuffer memory
   on a buffer this size and is redundant against a shader that samples
   internally.

Pointer input is damped and tracked on `window` rather than the container, so
the field is dragged rather than teleported and does not freeze while the
cursor is over the nav.

## Caching gotcha

GitHub Pages serves `index.html` with `cache-control: max-age=600` behind a
CDN, and that file names the hashed JS bundle — so for up to ten minutes after
a deploy a browser can still be running the previous build. Every build logs
its stamp:

```
[miami-veneers] build 2026-08-24 23:57:21Z
```

Check the console (or `window.__build`) before concluding a change did not
land. Append a changing query string (`?cb=2`) to force a fresh load.

## Not yet built

- Hero copy — the content slot in `Hero.tsx` is deliberately empty
- Every section below the hero
- Brevo (email notifications + WhatsApp). It needs a server-side endpoint,
  since the API key cannot ship in a static bundle.
