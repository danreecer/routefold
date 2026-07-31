import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RouteField } from '@/components/marketing/route-field';
import { FounderSection } from '@/components/marketing/founder-section';
import { ProductHuntBadge } from '@/components/marketing/product-hunt-badge';
import {
  CoverageStrip,
  DigitalTwinSection,
  ExpansionMapSection,
  FinalCta,
  InputToOutput,
  MethodologySection,
  ScorecardPreview,
  StrategyToExecution,
} from '@/components/marketing/landing-sections';
import { CHAIN_KNOWLEDGE_BASE } from '@/lib/chains/knowledge-base';

export const metadata: Metadata = {
  title: 'Routefold — Model the next chain before you move.',
  description:
    'AI multichain expansion intelligence for onchain products. Paste your product and receive a transparent expansion blueprint covering ecosystem fit, architecture, risks, and execution.',
  alternates: { canonical: '/' },
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <CoverageStrip chains={CHAIN_KNOWLEDGE_BASE} />
      <InputToOutput />
      <DigitalTwinSection />
      <ScorecardPreview />
      <ExpansionMapSection />
      <StrategyToExecution />
      <FounderSection />
      <MethodologySection />
      <FinalCta />
    </>
  );
}

/**
 * Hero.
 *
 * A full-bleed warm gradient field with a contained, frosted frame on top of it.
 * The frame is what makes the composition read as a designed object rather than
 * as a page with a background image — the gradient runs past its edges, so the
 * frame appears to float on a larger light source.
 */
function Hero() {
  return (
    <section className="relative px-3 pb-6 pt-3 md:px-5 md:pb-10 md:pt-4">
      <div className="sunset-field relative overflow-hidden rounded-[26px] md:rounded-[34px]">
        {/* Ambient light sources, drifting slowly. */}
        <div
          className="aurora aurora-ember animate-drift left-[-12%] top-[-24%] h-[42rem] w-[42rem] opacity-70"
          aria-hidden="true"
        />
        <div
          className="aurora aurora-amber left-[38%] top-[62%] h-[34rem] w-[34rem] opacity-40"
          aria-hidden="true"
        />
        <div
          className="aurora aurora-marine bottom-[-18%] right-[-8%] h-[30rem] w-[30rem] opacity-45"
          aria-hidden="true"
        />

        {/* Inner hairline frame, inset from the gradient edge. */}
        <div
          className="pointer-events-none absolute inset-3 rounded-[20px] border border-white/45 md:inset-5 md:rounded-[26px]"
          aria-hidden="true"
        />

        <div className="relative px-6 pb-16 pt-10 md:px-14 md:pb-24 md:pt-14 lg:px-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
            <div className="flex flex-col gap-7">
              <span className="eyebrow animate-fold-in text-ember-deep">
                AI multichain expansion intelligence
              </span>

              <h1
                className="text-display font-semibold text-ink animate-fold-in"
                style={{ animationDelay: '70ms' }}
              >
                Model the next chain
                <br />
                <span className="text-gradient-ember">before you move.</span>
              </h1>

              <p
                className="max-w-xl text-lede text-ink-dim animate-fold-in"
                style={{ animationDelay: '140ms' }}
              >
                Paste your product and receive a transparent expansion blueprint covering ecosystem
                fit, architecture, risks, and execution.
              </p>

              <div
                className="flex flex-col gap-3 sm:flex-row animate-fold-in"
                style={{ animationDelay: '210ms' }}
              >
                <Button asChild size="lg" variant="accent">
                  <Link href="/app/new">
                    Analyze a product
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/docs">
                    <FileText />
                    Explore example
                  </Link>
                </Button>
              </div>

              <div className="animate-fold-in" style={{ animationDelay: '280ms' }}>
                <ProductHuntBadge />
              </div>

              <div
                className="flex flex-wrap items-center gap-x-6 gap-y-2 animate-fold-in"
                style={{ animationDelay: '340ms' }}
              >
                {['Free during private beta', 'Deterministic scoring', 'Published methodology'].map(
                  (label) => (
                    <span
                      key={label}
                      className="font-mono text-[0.625rem] uppercase tracking-[0.1em] text-ink-faint"
                    >
                      {label}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="relative -mx-2 md:mx-0">
              <RouteField className="aspect-[860/560] min-h-[19rem] w-full lg:min-h-[27rem]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
