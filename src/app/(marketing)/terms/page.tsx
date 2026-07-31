import type { Metadata } from 'next';
import { LegalList, LegalPage, LegalSection } from '@/components/marketing/legal-page';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'Terms of use for the Routefold private beta.',
  alternates: { canonical: '/terms' },
};

export const dynamic = 'force-static';

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of use"
      intro="Routefold is provided free during private beta. These terms describe what it is, what it is not, and what you are responsible for."
      updated="July 2026"
    >
      <LegalSection title="What Routefold is">
        <p>
          Routefold is a decision-support tool. It produces a structured argument about where a
          blockchain product might expand, built from information you supply, public information it
          can retrieve, and a documented scoring methodology.
        </p>
        <p className="border-l-2 border-caution pl-4 text-ink">
          Routefold provides technical and strategic decision support. Outputs may contain incomplete
          assumptions and do not constitute financial, legal, compliance, security-audit, or
          investment advice.
        </p>
      </LegalSection>

      <LegalSection title="What Routefold is not">
        <LegalList
          items={[
            'It is not a smart-contract audit and is not a substitute for one.',
            'It is not financial, investment, legal, tax or compliance advice.',
            'It does not read your codebase, your analytics, or any private system.',
            'It does not guarantee any outcome, and no output should be read as a guarantee.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Your responsibilities">
        <LegalList
          items={[
            'Submit only URLs you are permitted to have retrieved, and only content you have the right to submit.',
            'Do not use Routefold to attempt to reach private, internal or unauthorised systems. Requests to private network ranges are refused, and attempting to bypass that is a misuse of the service.',
            'Verify anything material before acting on it. The reports list their own assumptions and missing data for exactly this reason.',
            'Obtain your own professional advice on security, legal and compliance matters.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Beta status and availability">
        <p>
          Routefold is in private beta. Features may change, reports generated under one methodology
          version may differ from those generated under another, and the service is provided without
          any availability commitment. Each account receives a limited number of report generations
          during the beta; the remaining balance is shown in your settings.
        </p>
        <p>
          The methodology version and model used are recorded on every report, so a report always
          carries the context in which it was produced.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You retain ownership of everything you submit and of the reports generated for you. You may
          export any report as JSON or PDF at any time. Routefold does not claim rights over your
          product information.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          Routefold is provided on an &ldquo;as is&rdquo; basis during private beta, without
          warranties of any kind. To the maximum extent permitted by law, Routefold is not liable for
          any loss arising from decisions made on the basis of its output. The reports are an input to
          your judgement, not a replacement for it.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          You may stop using Routefold and delete your data at any time. Access may be withdrawn for
          misuse, including attempts to circumvent the retrieval restrictions or the usage quota.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
