import { cn } from '@/lib/utils';

/**
 * Product Hunt featured badge.
 *
 * Deliberately a plain <img> rather than next/image: the badge is a remote SVG
 * at a fixed 250×54, and routing a remote SVG through the image optimiser would
 * require `dangerouslyAllowSVG`, which relaxes a real protection for no benefit
 * here. The host is allow-listed in the CSP's img-src.
 *
 * Width and height are set so the badge reserves its space before the image
 * loads and does not shift the hero.
 */
export function ProductHuntBadge({ className }: { className?: string }) {
  return (
    <a
      href="https://www.producthunt.com/products/routefold?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-routefold"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-block rounded-[10px] transition-opacity hover:opacity-85',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1211800&theme=light&t=1785521946095"
        alt="Routefold - AI expansion blueprints for onchain products. | Product Hunt"
        width={250}
        height={54}
        loading="lazy"
        decoding="async"
      />
    </a>
  );
}
