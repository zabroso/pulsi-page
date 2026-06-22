# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at localhost:4321
npm run build     # build to dist/
npm run preview   # preview the build locally
```

No lint or test commands are configured.

## Deployment

Push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`), which builds and deploys to Firebase Hosting (project `pulsi-2e80d`). The `dist/` folder is what Firebase serves.

The `base` path in `astro.config.mjs` is set to `/pulsi-page` only when running in GitHub Actions (`GITHUB_ACTIONS` env var). Locally, `base` is `undefined`, so all links and asset paths work without a prefix.

## Architecture

Single-page Astro landing site. No routing beyond `src/pages/index.astro`, which assembles all sections in order:

```
BaseLayout (HTML shell, global styles, scroll + IntersectionObserver animations)
└── index.astro
    ├── Navbar
    ├── Hero
    ├── ValueSection
    ├── ProblemSection
    ├── SolutionsSection
    ├── FAQ
    ├── CTASection
    └── Footer
```

Each section is a self-contained `.astro` component in `src/components/`.

**`BaseLayout.astro`** is the only place with global CSS (`.glass-nav`, `.bento-card`, `.primary-gradient`, `.text-gradient`, `.pulse-line`, `.macbook-*`) and the only `<script>` block — navbar shrink on scroll + section fade-in via IntersectionObserver. Keep global side-effects here, not in individual components.

## Design System

Tailwind is extended with a full Material Design 3 color token set (see `tailwind.config.mjs`). The canonical brand colors are:

- Primary: `#004ac6` (`primary`)
- Secondary / accent: `#712ae2` (`secondary`)
- Gradient: `linear-gradient(135deg, #004ac6, #712ae2)` — use `.primary-gradient` or `.text-gradient`

Typography uses Inter (loaded via Google Fonts). Font scale tokens (`body-md`, `headline-xl`, `display-lg`, etc.) are defined as Tailwind `fontSize` entries — prefer these over raw `text-*` sizes.

Icons use **Material Symbols Outlined** (Google Fonts CDN), not an icon package.

## Static Assets

Images live in `public/images/`. Reference them as `/images/<file>` in markup — Astro serves `public/` at the site root. The `assets/` folder and `index.html` at the project root are legacy pre-Astro files; do not use or modify them.
