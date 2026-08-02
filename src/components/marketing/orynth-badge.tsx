import { cn } from '@/lib/utils';

/**
 * Orynth featured badge.
 *
 * Plain <img> for the same reason as the Product Hunt badge: it is a remote
 * asset at a fixed size, and routing it through the image optimiser would mean
 * enabling `dangerouslyAllowSVG` for no gain. `orynth.dev` is allow-listed in
 * the CSP's img-src, and the intrinsic size is declared so the badge reserves
 * its space and does not shift the layout on load.
 */
export function OrynthBadge({ className }: { className?: string }) {
  return (
    <a
      href="https://orynth.dev/projects/routefold"
      target="_blank"
      rel="noopener"
      className={cn(
        'inline-block rounded-[12px] transition-opacity hover:opacity-85',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        // `www.` explicitly: the apex redirects here, and skipping the hop keeps
        // the badge off the critical path of a CSP redirect check.
        src="https://www.orynth.dev/api/badge/routefold?theme=light&style=default"
        alt="Featured on Orynth"
        width={260}
        height={80}
        loading="lazy"
        decoding="async"
      />
    </a>
  );
}
