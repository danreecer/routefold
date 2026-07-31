/**
 * Founder profile shown on the homepage.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EDITORIAL RULE FOR THIS FILE
 *
 * This section names a real person on a public marketing page. Nothing in it may
 * be inferred, guessed, or assembled from third-party sources. Every claim has
 * to come from that person or from someone authorised to publish on their
 * behalf.
 *
 * What is populated below is limited to: the name and role supplied directly by
 * the project owner, the link they supplied, and a first-person thesis about
 * *the product* — its design decisions, which are verifiable by reading the
 * methodology and the source. There are deliberately no biographical claims:
 * no employer, no title elsewhere, no track record, no affiliation, and no
 * implied endorsement by any company.
 *
 * `highlights` is left empty for exactly that reason. Fill it in with verified
 * facts and it renders automatically; leave it and the section omits the block
 * rather than showing an empty shell.
 *
 * `portrait` is likewise unset. Add a path under /public only for an image you
 * hold the rights to publish; until then the section renders a monogram.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type FounderLink = {
  /** e.g. "X", "LinkedIn", "GitHub", "Website" */
  label: string;
  href: string;
};

export type FounderHighlight = {
  /** A short, checkable fact. e.g. "Previously" / "Focus" / "Writing" */
  label: string;
  value: string;
};

export type Founder = {
  name: string;
  /** e.g. "Founder" or "Founder & engineer" */
  role: string;
  /** One sentence. Shown large, directly under the name. */
  headline: string;
  /** Two to four paragraphs, first person. */
  story: string[];
  /** A single pulled quote rendered as the section's closing statement. */
  quote?: string;
  /** Short verifiable facts rendered as a definition list. */
  highlights?: FounderHighlight[];
  links?: FounderLink[];
  /**
   * Path under /public, e.g. "/brand/founder.jpg". Only set this for an image
   * you have the right to publish. Omit it and the section renders a monogram.
   */
  portrait?: string;
};

export const FOUNDER: Founder | null = {
  name: 'Dan Reecer',
  role: 'Founder',
  headline: 'Built from a multichain operator’s lens.',
  story: [
    'Routefold exists because the question "which chain next?" is one of the most consequential decisions an onchain team makes, and one of the worst-tooled. It is usually settled by whichever ecosystem made the most compelling offer, or by where the engineers already have context — not by whether the chain actually fits the product.',
    'Every design decision here follows from that. The score is produced by a deterministic function, not by a language model, so it can be published, argued with and reproduced. The model is confined to explaining that function\'s output and may move a score by at most five points, with a written reason, shown separately. Confidence is reported as its own number and is bounded by how much Routefold actually knows about your product.',
    'The parts most products would hide are the parts this one leads with: what it could not read, what it had to assume, where two candidates are too close to separate. A recommendation you cannot interrogate is not decision support — it is just a more confident guess.',
  ],
  quote:
    'The goal was never to be believed. It was to be checkable.',
  // Intentionally empty — see the editorial rule at the top of this file.
  // Add verified facts here (e.g. { label: 'Previously', value: '…' }) and the
  // block renders automatically.
  highlights: [],
  links: [{ label: 'X', href: 'https://x.com/danreecer_' }],
  portrait: '/founder.jpg',
};
