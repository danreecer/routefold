import type { Metadata } from 'next';
import { LegalList, LegalPage, LegalSection } from '@/components/marketing/legal-page';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What Routefold stores, why it stores it, and how to remove it.',
  alternates: { canonical: '/privacy' },
};

export const dynamic = 'force-static';

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="What Routefold stores"
      intro="Routefold is a private-beta product. This page describes what data it holds, why, and how to remove it."
      updated="July 2026"
    >
      <LegalSection title="Account data">
        <p>
          Authentication is handled by Clerk. Routefold stores a Clerk user identifier, and — if your
          Clerk profile provides them — an email address and display name, so reports can be
          attributed to you and the private-beta usage quota can be enforced. Passwords and
          authentication factors are held by Clerk and are never seen by Routefold.
        </p>
      </LegalSection>

      <LegalSection title="Content you submit">
        <p>Creating an analysis stores the following against your account:</p>
        <LegalList
          items={[
            'The product name, URLs and answers you enter in the analysis wizard.',
            'Readable text retrieved from the public URLs you submit, together with the retrieval timestamp, the final URL after redirects, and a content hash.',
            'The Multichain Digital Twin, including any edits you make to it.',
            'Chain scores, factor breakdowns, and every generated report section.',
            'An activity log of actions taken on your own projects and reports.',
          ]}
        />
        <p>
          Routefold retrieves only URLs you explicitly submit. It does not crawl beyond them, does
          not authenticate to anything, and refuses any URL that resolves to a private, loopback or
          link-local address.
        </p>
      </LegalSection>

      <LegalSection title="Processing by a third-party model provider">
        <p>
          Analysis is performed using the Anthropic API. The content of your wizard answers and the
          text retrieved from your submitted URLs is sent to that API in order to generate a report.
          Routefold does not send your email address, your Clerk identifier, or any other account
          identifier as part of that request.
        </p>
        <p>
          If a deployment is running in the local fixture mode, no external model call is made at
          all, and every report produced is labelled as fixture output.
        </p>
      </LegalSection>

      <LegalSection title="External data">
        <p>
          The chain knowledge base may be enriched with public data from DeFiLlama. That request
          contains no information about you or your product — it fetches a public list of chain
          metrics and is cached. Live figures always display their source, timestamp, and whether
          they are live, cached or seeded.
        </p>
      </LegalSection>

      <LegalSection title="Sharing">
        <p>
          Reports are private by default. Creating a share link generates a token with 256 bits of
          entropy that grants read-only access to that one report. Share pages never expose your
          email address, your Clerk identifier, your other projects, or any internal logs. You can
          revoke a share link at any time from the report, which takes effect immediately.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Routefold sets only the session cookies required by Clerk for authentication. There is no
          advertising, no cross-site tracking, and no third-party analytics script.
        </p>
      </LegalSection>

      <LegalSection title="Retention and deletion">
        <p>
          Deleting a report removes it, its Digital Twin, its chain scores, its report sections and
          its share links. Deleting a project removes everything belonging to it, including retrieved
          source text. Deletions are immediate and cascade at the database level.
        </p>
        <p>
          To remove your account and all associated data, delete your projects and then delete your
          account through Clerk from the settings page.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Routefold is in private beta and this policy will change as the product develops. Material
          changes will be reflected in the date at the top of this page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
