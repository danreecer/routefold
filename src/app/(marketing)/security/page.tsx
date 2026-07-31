import type { Metadata } from 'next';
import { LegalList, LegalPage, LegalSection } from '@/components/marketing/legal-page';
import { Panel, PanelBody } from '@/components/ui/panel';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How Routefold handles untrusted URLs, prompt injection, authorisation, and secrets.',
  alternates: { canonical: '/security' },
};

export const dynamic = 'force-static';

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Security"
      title="Security posture"
      intro="Routefold fetches URLs that users supply and feeds the result to a language model. Both are hostile inputs by definition. This page describes what is done about that."
      updated="July 2026"
    >
      <Panel className="border-caution/30 bg-caution/[0.05]">
        <PanelBody>
          <p className="text-[0.875rem] leading-relaxed text-ink-dim">
            This page describes implemented controls. It is not a claim of certification,
            accreditation, or a completed third-party security assessment, and Routefold does not
            claim any. Routefold is in private beta.
          </p>
        </PanelBody>
      </Panel>

      <LegalSection title="Server-side request forgery">
        <p>
          Fetching a user-supplied URL from a server is a server-side request forgery primitive
          unless it is constrained. Routefold applies these controls to every retrieval:
        </p>
        <LegalList
          items={[
            'Only http and https are accepted. Every other scheme is refused before any network access.',
            'URLs containing embedded credentials are refused.',
            'Only ports 80, 443, 8080 and 8443 are permitted.',
            'Loopback, RFC 1918 private ranges, link-local addresses including the cloud metadata endpoint, carrier-grade NAT space and every reserved IPv4 block are refused.',
            'IPv6 loopback, link-local, unique-local, multicast and NAT64 addresses are refused, including IPv4-mapped forms such as ::ffff:127.0.0.1.',
            'Decimal, octal and hexadecimal integer encodings of an IPv4 address are refused.',
            'Internal hostnames and internal-only suffixes such as .local, .internal and .cluster.local are refused, as is any single-label hostname.',
            'The hostname is resolved and every returned address is re-checked, so a public hostname with a private A record is refused.',
            'Redirects are followed manually and every hop is validated from scratch, up to a strict limit.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Retrieval limits">
        <LegalList
          items={[
            'A strict wall-clock timeout with abort, so a slow endpoint cannot hold a connection open.',
            'A hard byte ceiling enforced while streaming rather than after buffering, so an unbounded response is cut off mid-stream.',
            'A content-type allow-list. Binary and unsupported types are refused rather than parsed.',
            'Per-user rate limits on retrieval and on analysis creation.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Handling retrieved content">
        <p>
          Retrieved HTML is never turned into a DOM and nothing in it is ever executed. Scripts,
          styles, iframes, embedded objects, forms and navigation chrome are stripped, remaining
          markup is removed, and the output is plain text. Nothing retrieved is rendered back as
          HTML anywhere in the product.
        </p>
      </LegalSection>

      <LegalSection title="Prompt injection">
        <p>
          A page that Routefold fetches can contain text designed to look like an instruction. Every
          retrieved document is wrapped in explicit delimiters that mark it as untrusted data, and
          every system prompt states that instructions found inside those delimiters must be ignored
          and never followed.
        </p>
        <p>
          The structural defence matters more than the instruction: the model cannot write a score.
          Scores are produced by a deterministic engine that never sees retrieved text as anything
          other than input to a fixed function, and the model&rsquo;s only numeric influence is an
          adjustment clamped to ±5 points that requires a written justification and is displayed
          separately. Injected text cannot move a recommendation beyond that bound.
        </p>
      </LegalSection>

      <LegalSection title="Authorisation">
        <p>
          An entity identifier from a URL or a request body is never sufficient to reach a row. Every
          read and every write resolves the authenticated subject first and then filters by the
          owning user. There is no code path that loads a project or report by identifier alone on
          behalf of a signed-in user, which is what prevents one account reaching another&rsquo;s data
          by guessing or substituting an identifier.
        </p>
        <p>
          Public access is possible only through an active share token or the built-in example. The
          share read path selects fields explicitly rather than returning a whole row, so owner
          identity, other projects and internal logs are structurally unreachable through it.
        </p>
      </LegalSection>

      <LegalSection title="Model output">
        <p>
          Every model response is a structured generation validated against a schema before it is
          used or stored. A response that fails validation is retried with the specific validation
          error fed back; if it still fails, the stage reports an error rather than persisting
          malformed data. Stored sections are re-validated on read, so a schema change cannot render
          incorrect data as if it were current.
        </p>
      </LegalSection>

      <LegalSection title="Secrets and transport">
        <LegalList
          items={[
            'Server-only modules are marked as such, so importing one into a client component is a build failure rather than a leaked secret.',
            'API keys and the database URL exist only in the server environment and are never sent to the browser.',
            'Internal errors are logged server-side; the browser receives a typed error code and a plain-language message with no stack trace or upstream detail.',
            'A Content-Security-Policy, frame-ancestors denial, nosniff, strict referrer policy and HSTS are applied to every response.',
            'Mutating endpoints require POST or DELETE with a same-origin JSON content type, so a cross-site form post cannot trigger one.',
          ]}
        />
      </LegalSection>

      <LegalSection title="Honest operating modes">
        <p>
          Routefold runs in one of two modes and never blurs them. In production mode, analysis uses
          the configured model. In local fixture mode, a deterministic pipeline produces the report
          and every surface labels it as fixture output.
        </p>
        <p>
          Fixture output is never substituted for a failed live call. If a live model call fails, the
          analysis reports the failure — it does not quietly return templated content that looks like
          a real analysis.
        </p>
      </LegalSection>

      <LegalSection title="Reporting an issue">
        <p>
          If you find a security issue, please report it privately rather than disclosing it publicly,
          and allow time for a fix before disclosure.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
