import { ArrowUpRight } from 'lucide-react';
import { Panel, PanelBody } from '@/components/ui/panel';
import { AppMockup } from './app-mockup';
import { ProductHuntBadge } from './product-hunt-badge';

/**
 * Backing and launch section.
 *
 * Sits between the product story and the methodology. Everything asserted here
 * is checkable: the backer, the launch, the beta terms and the published
 * methodology. No user counts, no testimonials, no logos of companies that have
 * not agreed to appear — Routefold is pre-launch and claiming otherwise would
 * contradict the transparency the product is built on.
 */
export function BackedByZefi() {
  return (
    <section
      id="backing"
      className="relative overflow-hidden border-t border-line py-24 md:py-32"
      aria-labelledby="backing-heading"
    >
      <div
        className="aurora aurora-ember right-[-10%] top-[-10%] h-[36rem] w-[36rem] opacity-30"
        aria-hidden="true"
      />
      <div
        className="aurora aurora-marine bottom-[-25%] left-[-8%] h-[30rem] w-[30rem] opacity-35"
        aria-hidden="true"
      />

      <div className="shell relative">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          <div className="flex flex-col gap-7">
            <span className="eyebrow text-ember-deep">Backed by ZeFi</span>

            <h2 id="backing-heading" className="max-w-xl text-headline font-semibold text-ink">
              Built and backed for the long build.
            </h2>

            <p className="max-w-xl text-lede text-ink-dim">
              Routefold is backed by{' '}
              <a
                href="https://www.zefi.ae"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ink underline decoration-ember/40 underline-offset-4 transition-colors hover:text-ember-deep"
              >
                ZeFi
              </a>
              . That backing is why the product can take the harder path — publishing the scoring
              function, reporting its own uncertainty, and refusing to manufacture a winner when two
              chains are genuinely tied.
            </p>

            <div className="flex flex-col gap-4">
              <a
                href="https://www.zefi.ae"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-fit items-center gap-3 rounded-full border border-line-strong bg-white/70 py-2 pl-3 pr-4 backdrop-blur-md transition-colors hover:border-ember/40 hover:bg-white"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[0.8125rem] font-bold text-paper">
                  Z
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-mono text-[0.5625rem] uppercase tracking-[0.11em] text-ink-ghost">
                    Backed by
                  </span>
                  <span className="text-[0.9375rem] font-semibold text-ink">ZeFi</span>
                </span>
                <ArrowUpRight
                  className="size-3.5 text-ink-ghost transition-colors group-hover:text-ember"
                  aria-hidden="true"
                />
              </a>

              <ProductHuntBadge />
            </div>

            <Panel tone="quiet" className="w-fit rounded-full">
              <PanelBody className="px-4 py-2">
                <p className="text-xs text-ink-faint">
                  Free during private beta · five reports · no card required
                </p>
              </PanelBody>
            </Panel>
          </div>

          <div className="relative">
            <AppMockup className="rotate-[0.6deg]" />
          </div>
        </div>
      </div>
    </section>
  );
}
