# Launch kit

Submission assets for Routefold.

```
assets/
  icon-mark.png          The Routefold mark (supplied artwork, unmodified)
  app-icon-512.png       Square application icon — same artwork
  favicon.png            Browser tab icon — same artwork
  wordmark.svg           Full lockup, light backgrounds
  wordmark-dark.svg      Full lockup, dark backgrounds
  og-1200x630.svg        Open Graph composition
tagline.txt              One line
description.txt          Product description
features.txt             Feature summary
screenshot-checklist.md  What to capture and how
```

The live Open Graph image is generated at build time by
`src/app/opengraph-image.tsx` and is served at `/opengraph-image`. The SVG here
is the same composition for use where a static file is required; rasterise to PNG
at 1200 × 630 if the destination will not accept SVG.

## Brand

**Mark** — the supplied artwork: a decision node on the left branching into three
routes, one of which resolves. Used exactly as provided; do not recolour, crop or
redraw it. The source of truth is `public/logo.png` in the repository.

**Colour** — ember `#E2570B` is the single accent. Apricot `#FFB27A` and amber
`#F2A516` support it in ambient gradients. Marine `#2A4D73` is reserved for
contrast and live state. Type is charcoal `#1C1815` on warm paper `#FDFAF6`.

**Type** — Inter for UI and headlines, JetBrains Mono for scores, identifiers and
technical metadata.

Do not recolour or alter the mark. The wordmark lockup has a `-dark` variant for
dark grounds; the mark itself carries its own warm background and works on both.

**Attribution** — Routefold is powered by [ZeFi](https://www.zefi.ae). The
attribution appears in the site footer, on the authentication screens, in the
application shell and on public share pages.
