import type { RegeneratableSection } from '@/lib/schemas/report';

/**
 * Section display names, kept in a client-safe module.
 *
 * `regenerate.ts` is server-only (it imports Prisma and the Anthropic client), so
 * the label lookup lives here where a client component can import it without
 * pulling the server graph into the browser bundle.
 */
export function sectionDisplayName(sectionType: RegeneratableSection): string {
  switch (sectionType) {
    case 'EXECUTIVE_SUMMARY':
      return 'Executive summary';
    case 'EXPANSION_MAP':
      return 'Expansion sequence';
    case 'ARCHITECTURE':
      return 'Architecture brief';
    case 'RISK_REGISTER':
      return 'Risk register';
    case 'EXECUTION_PLAN':
      return '30-day plan';
    case 'TECHNICAL_BRIEF':
      return 'Technical brief';
    default:
      return sectionType;
  }
}
