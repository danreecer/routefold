import Link from 'next/link';
import { RoutefoldWordmark } from '@/components/brand/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="grid-field field-mask absolute inset-0 opacity-60" aria-hidden="true" />

      <header className="relative border-b border-line">
        <div className="shell flex h-16 items-center">
          <Link href="/" className="transition-opacity hover:opacity-80" aria-label="Routefold home">
            <RoutefoldWordmark />
          </Link>
        </div>
      </header>

      <main id="main" className="relative flex flex-1 items-center justify-center px-5 py-14">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="relative border-t border-line">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-5">
          <p className="text-xs text-ink-ghost">
            Free during private beta · Five report generations per account
          </p>
          <nav className="flex gap-5" aria-label="Legal">
            <Link href="/privacy" className="text-xs text-ink-ghost transition-colors hover:text-ink-faint">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-ink-ghost transition-colors hover:text-ink-faint">
              Terms
            </Link>
            <Link href="/security" className="text-xs text-ink-ghost transition-colors hover:text-ink-faint">
              Security
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
