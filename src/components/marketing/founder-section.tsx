import Image from 'next/image';
import { ArrowUpRight, Quote } from 'lucide-react';
import { Panel, PanelBody } from '@/components/ui/panel';
import { FOUNDER } from '@/content/founder';
import { initials } from '@/lib/utils';

/**
 * Founder spotlight.
 *
 * Renders nothing when `FOUNDER` is null. That is deliberate: a section naming a
 * real person either has verified content or it is absent — there is no
 * placeholder state that could ship looking like a real biography. Optional
 * blocks (highlights, portrait, quote) each render only when populated, so the
 * layout stays composed at any level of detail.
 */
export function FounderSection() {
  const founder = FOUNDER;
  if (!founder) return null;

  const hasHighlights = Boolean(founder.highlights && founder.highlights.length > 0);

  return (
    <section
      id="founder"
      className="relative overflow-hidden border-t border-line bg-shell py-24 md:py-32"
      aria-labelledby="founder-heading"
    >
      <div
        className="aurora aurora-ember left-[-6%] top-[6%] h-[34rem] w-[34rem] opacity-35"
        aria-hidden="true"
      />
      <div
        className="aurora aurora-amber bottom-[-16%] right-[4%] h-[26rem] w-[26rem] opacity-30"
        aria-hidden="true"
      />

      <div className="shell relative">
        <span className="eyebrow text-ember-deep">Behind Routefold</span>

        <div className="mt-10 grid gap-12 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-16 xl:gap-20">
          {/* ── Identity ── */}
          <div className="flex flex-col gap-6">
            <Panel corners tone="lifted" className="overflow-hidden rounded-[20px]">
              {founder.portrait ? (
                <Image
                  src={founder.portrait}
                  alt={founder.name}
                  width={760}
                  height={760}
                  className="aspect-square w-full object-cover"
                  sizes="(min-width: 1024px) 19rem, 100vw"
                />
              ) : (
                <div
                  className="relative flex aspect-square w-full items-center justify-center"
                  aria-hidden="true"
                >
                  <div
                    className="aurora aurora-ember left-1/2 top-1/2 h-[16rem] w-[16rem] -translate-x-1/2 -translate-y-1/2 opacity-45"
                  />
                  <span
                    data-numeric
                    className="relative text-[4rem] font-semibold tracking-[-0.05em] text-ember-deep"
                  >
                    {initials(founder.name)}
                  </span>
                </div>
              )}
            </Panel>

            <div className="flex flex-col gap-2">
              <h2 id="founder-heading" className="text-title font-semibold text-ink">
                {founder.name}
              </h2>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ember-deep">
                {founder.role}
              </p>
            </div>

            {founder.links && founder.links.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {founder.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer me"
                      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white/70 px-3.5 py-1.5 text-xs text-ink-dim backdrop-blur-md transition-colors hover:border-ember/40 hover:bg-ember-wash hover:text-ember-deep"
                    >
                      {link.label}
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* ── Story ── */}
          <div className="flex flex-col gap-8">
            <p className="max-w-3xl text-headline font-semibold text-ink">{founder.headline}</p>

            <div className="rule-fade" aria-hidden="true" />

            <div className="flex max-w-3xl flex-col gap-5">
              {founder.story.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-[1.0625rem] leading-relaxed text-ink-dim"
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {founder.quote ? (
              <Panel tone="accent" className="rounded-[18px]">
                <PanelBody className="flex gap-4 px-6 py-6">
                  <Quote className="mt-1 size-5 shrink-0 text-ember" aria-hidden="true" />
                  <p className="text-[1.25rem] font-medium leading-snug tracking-[-0.02em] text-ink">
                    {founder.quote}
                  </p>
                </PanelBody>
              </Panel>
            ) : null}

            {hasHighlights ? (
              <Panel tone="quiet" className="rounded-[18px]">
                <PanelBody>
                  <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                    {founder.highlights?.map((highlight) => (
                      <div key={highlight.label} className="flex flex-col gap-1.5">
                        <dt className="eyebrow">{highlight.label}</dt>
                        <dd className="text-[0.875rem] leading-relaxed text-ink-dim">
                          {highlight.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </PanelBody>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
