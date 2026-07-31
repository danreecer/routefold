import Link from 'next/link';
import { RoutefoldMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-20">
      <div className="grid-field field-mask absolute inset-0 opacity-60" aria-hidden="true" />

      <div className="relative flex max-w-lg flex-col items-center gap-8 text-center">
        <RoutefoldMark className="size-10" />

        <div className="flex flex-col gap-3">
          <span className="eyebrow">404 · Route not found</span>
          <h1 className="text-headline font-medium text-ink">This page does not exist</h1>
          <p className="text-[0.9375rem] leading-relaxed text-ink-dim">
            The address may be mistyped, or the report may have been deleted or unshared.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary">
            <Link href="/">Back to Routefold</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/example">See the example report</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
