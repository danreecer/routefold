import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Routefold brand marks.
 *
 * The mark is the supplied artwork at `public/logo.png`, used exactly as
 * provided — no recolouring, cropping or redrawing. `next/image` resizes it for
 * each rendered size, which changes only the delivered resolution, never the
 * artwork itself.
 */

type MarkProps = {
  className?: string;
  /** Accessible label. Omit for decorative use alongside the wordmark. */
  title?: string;
  /** Intrinsic size hint; drives the srcset next/image generates. */
  size?: number;
  priority?: boolean;
};

export function RoutefoldMark({ className, title, size = 64, priority = false }: MarkProps) {
  return (
    <Image
      src="/logo.png"
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 select-none object-contain', className)}
    />
  );
}

export function RoutefoldWordmark({
  className,
  markClassName,
  priority = false,
}: {
  className?: string;
  markClassName?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <RoutefoldMark className={cn('h-8 w-8', markClassName)} priority={priority} />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.035em] text-ink">Routefold</span>
    </span>
  );
}

/** Full lockup used in the footer, share pages and the launch kit. */
export function RoutefoldLockup({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col gap-1.5', className)}>
      <RoutefoldWordmark />
      <span className="eyebrow pl-[2.5rem]">Multichain expansion intelligence</span>
    </span>
  );
}
