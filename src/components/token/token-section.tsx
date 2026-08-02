import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ContractAddress } from './contract-address';
import { OrynthBadge } from '@/components/marketing/orynth-badge';
import { TOKEN, TOKEN_FACTS } from '@/content/token';

/**
 * $RFOLD section.
 *
 * The claims here are limited to what is permanently true on chain and can be
 * confirmed from the explorer link beside them: a fixed supply, a revoked mint
 * authority, a revoked freeze authority. Nothing about price, return, or what
 * the token will be worth — Routefold's whole argument is that you should be
 * able to check its numbers, and that has to hold on this section too.
 */
export function TokenSection() {
  return (
    <section
      id="token"
      className="relative overflow-hidden border-t border-line py-24 md:py-32"
      aria-labelledby="token-heading"
    >
      <div
        className="aurora aurora-ember left-1/2 top-[-20%] h-[40rem] w-[40rem] -translate-x-1/2 opacity-40"
        aria-hidden="true"
      />

      <div className="shell relative flex flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-5">
          <span className="eyebrow text-ember-deep">${TOKEN.symbol} on {TOKEN.chain}</span>
          <h2 id="token-heading" className="max-w-2xl text-headline font-semibold text-ink">
            One contract address. Published in full, everywhere.
          </h2>
          <p className="max-w-2xl text-lede text-ink-dim">
            This is the only mint Routefold will ever publish. Copy it from here or from the
            explorer — never from a DM, a reply, or a search result.
          </p>
        </div>

        <ContractAddress size="lg" className="w-full max-w-3xl text-left" />

        <dl className="grid w-full max-w-3xl gap-3 text-left sm:grid-cols-2">
          {TOKEN_FACTS.map((fact) => (
            <div
              key={fact.label}
              className="flex flex-col gap-1 rounded-[14px] border border-line bg-white/60 p-4 backdrop-blur-md"
            >
              <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.11em] text-ink-ghost">
                {fact.label}
              </dt>
              <dd className="text-[1.0625rem] font-semibold text-ink">{fact.value}</dd>
              <p className="text-xs leading-relaxed text-ink-faint">{fact.note}</p>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {(
            [
              ['Solscan', TOKEN.links.solscan],
              ['Solana Explorer', TOKEN.links.explorer],
              ['DexScreener', TOKEN.links.dexscreener],
              ['Jupiter', TOKEN.links.jupiter],
            ] as const
          ).map(([label, href]) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white/70 px-4 py-2 text-[0.8125rem] text-ink-dim backdrop-blur-md transition-colors hover:border-ember/40 hover:text-ink"
            >
              {label}
              <ArrowUpRight
                className="size-3.5 text-ink-ghost transition-colors group-hover:text-ember"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>

        <OrynthBadge />

        <p className="max-w-2xl text-xs leading-relaxed text-ink-ghost">
          {TOKEN.symbol} is a token on {TOKEN.chain}, launched through {TOKEN.launchpad}. It is not
          an investment, does not represent equity in Routefold, and confers no claim on the
          product or its revenue. Routefold publishes no price target and makes no prediction about
          its value. Nothing here is financial advice.
        </p>
      </div>
    </section>
  );
}
