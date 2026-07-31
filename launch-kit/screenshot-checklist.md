# Screenshot checklist

Capture at **1512 × 950** in a light environment. Use `localhost`, not
`127.0.0.1` — Next's dev server blocks cross-origin `/_next` requests and the
page will not hydrate.

Before capturing, sign in and generate one report so the authenticated shots have
real content. Nothing in the product ships with demo data.

| # | Shot | Route | Notes |
| --- | --- | --- | --- |
| 1 | Landing hero | `/` | Top of page. Wait ~1s for the route trace to finish. |
| 2 | Founder spotlight | `/#founder` | Scroll so the portrait block and pulled quote are both in frame. |
| 3 | Ecosystem coverage | `/` | The grid below the hero. |
| 4 | Chain scorecard | `/app/reports/<id>` | Expand the top-ranked row so the factor table is visible — that is the product's core claim. |
| 5 | Multichain Digital Twin | `/app/reports/<id>#twin` | Frame two field groups showing provenance tags. |
| 6 | Expansion map | `/app/reports/<id>#map` | Let the graph settle; keep the legend in frame. |
| 7 | Architecture | `/app/reports/<id>#architecture` | The component diagram, not the prose panels. |
| 8 | 30-day plan | `/app/reports/<id>#plan` | Week 1 expanded with acceptance criteria visible. |
| 9 | Dashboard | `/app` | After at least one report exists. |
| 10 | Analysis wizard | `/app/new` | Step 1 with the URL check result showing. |
| 11 | Methodology | `/methodology` | The 100-point allocation section. |
| 12 | Mobile landing | `/` at 390 × 844 | Hero and CTA. |

## Rules

- No browser chrome or fake device frames inside the product itself.
- Do not capture the Next.js dev indicator (bottom-left) — use a production
  build (`pnpm build && pnpm start`) for final shots.
- The example report at `/app/example` is fictional and labelled as such. If you
  use it, keep the "Example analysis — fictional project" banner in frame.
- Do not crop out disclaimers from report screenshots.
