import { buildExampleReport } from '@/lib/example';
const r = buildExampleReport();
const top = r.scores.find((s) => s.recommendation !== 'current');
console.log('engine #1         :', top?.chainSlug, top?.finalScore);
console.log('sequence.primary  :', r.sequence?.primary.chainSlug);
console.log('summary.recommend :', r.summary?.recommendedChainSlug);
console.log('report.recommended:', r.recommendedChain);
console.log('brief.targetChain :', r.technicalBrief?.targetChain);
const ok =
  top?.chainSlug === r.sequence?.primary.chainSlug &&
  top?.chainSlug === r.summary?.recommendedChainSlug &&
  top?.chainSlug === r.recommendedChain;
console.log('CONSISTENT        :', ok);
process.exit(ok ? 0 : 1);
