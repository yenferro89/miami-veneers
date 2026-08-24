# Miami Veneers

Static React mockup built as a pitch for Miami Veneers & Modern Dentistry
(currently on WordPress/Elementor at miamiveneers.com).

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- oxlint
- Deployed to GitHub Pages via `.github/workflows/deploy.yml`

## Commands

```bash
npm install     # install dependencies
npm run dev     # local dev server
npm run build   # production build to dist/
npm run preview # serve the production build
npm run lint    # oxlint
```

## Notes

- `vite.config.ts` uses `base: './'` so the build is path-independent.
- Brand assets live in `images/`.
- Brevo (email notifications + WhatsApp) is planned but not yet wired; it
  will need a server-side endpoint since the API key can't ship to the client.
