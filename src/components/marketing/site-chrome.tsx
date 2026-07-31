'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { RoutefoldMark, RoutefoldWordmark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/docs', label: 'Docs' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/whitepaper', label: 'Whitepaper' },
  { href: '/security', label: 'Security' },
];

export function SiteHeader({ isSignedIn = false }: { isSignedIn?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    // Guarded so the initial read is a no-op when the page loads at the top,
    // which keeps this effect a subscription rather than a render trigger.
    const onScroll = () => {
      const next = window.scrollY > 8;
      setScrolled((current) => (current === next ? current : next));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      data-app-nav
      className={cn(
        'sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300',
        'border-b backdrop-blur-2xl backdrop-saturate-150',
        scrolled || open
          ? 'border-line bg-white/72 shadow-[var(--frost-shadow)]'
          : 'border-transparent bg-white/0',
      )}
    >
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="rounded-[2px] transition-opacity hover:opacity-80"
          aria-label="Routefold home"
        >
          <RoutefoldWordmark />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-[0.8125rem] transition-colors',
                pathname === link.href
                  ? 'bg-white/80 text-ink shadow-[var(--frost-shadow)]'
                  : 'text-ink-dim hover:bg-white/55 hover:text-ink',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <Button asChild size="sm" variant="primary">
              <Link href="/app">Launch App</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link href="/app/new">Launch App</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="-mr-2 rounded-[2px] p-2 text-ink-dim transition-colors hover:text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-line bg-white/88 backdrop-blur-2xl md:hidden">
          <nav className="shell flex flex-col py-2" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-line-faint py-3.5 text-sm text-ink-dim transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-2 py-4" onClick={() => setOpen(false)}>
              {isSignedIn ? (
                <Button asChild variant="primary">
                  <Link href="/app">Open dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="primary">
                    <Link href="/app/new">Analyze a product</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/sign-in">Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [
      { href: '/docs', label: 'Documentation' },
      { href: '/methodology', label: 'Methodology' },
      { href: '/whitepaper', label: 'Whitepaper' },
      { href: '/app/new', label: 'Analyze a product' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { href: '/security', label: 'Security' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer data-print="hide" className="relative overflow-hidden border-t border-line bg-shell">
      <div
        className="aurora aurora-ember bottom-[-60%] left-[-6%] h-[32rem] w-[32rem] opacity-25"
        aria-hidden="true"
      />
      <div className="shell relative py-16">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="max-w-sm">
            <RoutefoldWordmark />
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-faint">
              Multichain expansion intelligence for onchain products. Transparent scoring,
              documented methodology, and outputs an engineering team can act on.
            </p>
            <p className="eyebrow mt-6">Free during private beta</p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="eyebrow">{group.title}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.8125rem] text-ink-faint transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-6">
          <p className="max-w-4xl text-xs leading-relaxed text-ink-ghost">
            Routefold provides technical and strategic decision support. Outputs may contain
            incomplete assumptions and do not constitute financial, legal, compliance,
            security-audit, or investment advice.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-ink-ghost">
              <RoutefoldMark className="size-4" accent={false} />
              <span>© {new Date().getFullYear()} Routefold</span>
            </div>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.09em] text-ink-ghost">
              Model the next chain before you move
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
