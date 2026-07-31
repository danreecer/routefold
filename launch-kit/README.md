# Launch kit

Submission assets for Routefold.

```
assets/
  icon-mark.svg          Icon only, light backgrounds
  icon-mark-dark.svg     Icon only, dark backgrounds
  wordmark.svg           Full lockup, light backgrounds
  wordmark-dark.svg      Full lockup, dark backgrounds
  app-icon-512.svg       Square application icon
  favicon.svg            Browser tab icon
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

**Mark** — one route entering from the lower left, striking a decision vertex,
and folding outward into three divergent planes. One line becoming many.

**Colour** — ember `#E2570B` is the single accent. Apricot `#FFB27A` and amber
`#F2A516` support it in ambient gradients. Marine `#2A4D73` is reserved for
contrast and live state. Type is charcoal `#1C1815` on warm paper `#FDFAF6`.

**Type** — Inter for UI and headlines, JetBrains Mono for scores, identifiers and
technical metadata.

Do not recolour the mark outside the palette above, and do not place the light
variant on a dark ground — use `-dark` for that.
