import { cn } from '@/lib/utils';

/**
 * "Powered by ZeFi" attribution.
 *
 * One component so the wording, link target and rel attributes stay identical
 * on every surface it appears — marketing footer, auth screens, the app shell,
 * and public share pages.
 */
export function PoweredByZefi({
  className,
  tone = 'quiet',
}: {
  className?: string;
  /** `quiet` for chrome, `standard` where it should hold a little more weight. */
  tone?: 'quiet' | 'standard';
}) {
  return (
    <a
      href="https://www.zefi.ae"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group inline-flex items-center gap-1.5 transition-colors',
        tone === 'quiet'
          ? 'text-xs text-ink-ghost hover:text-ink-faint'
          : 'text-[0.8125rem] text-ink-faint hover:text-ink-dim',
        className,
      )}
    >
      <span>Powered by</span>
      <span
        className={cn(
          'font-semibold tracking-[-0.01em] transition-colors',
          tone === 'quiet'
            ? 'text-ink-faint group-hover:text-ember'
            : 'text-ink-dim group-hover:text-ember',
        )}
      >
        ZeFi
      </span>
    </a>
  );
}
