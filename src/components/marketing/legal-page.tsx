import { Badge } from '@/components/ui/primitives';

/** Shared layout for the policy pages so they stay visually consistent. */
export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-24">
      <header className="border-b border-line">
        <div className="shell-narrow py-14 md:py-20">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="mt-5 text-headline font-medium text-ink">{title}</h1>
          <p className="mt-5 text-lede text-ink-dim">{intro}</p>
          <div className="mt-6">
            <Badge tone="ghost">Last updated {updated}</Badge>
          </div>
        </div>
      </header>
      <div className="shell-narrow flex flex-col gap-10 py-14">{children}</div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[1.125rem] font-medium tracking-[-0.02em] text-ink">{title}</h2>
      <div className="flex flex-col gap-4 text-[0.9375rem] leading-relaxed text-ink-dim">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-[0.5rem] size-1 shrink-0 bg-ink-ghost" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
