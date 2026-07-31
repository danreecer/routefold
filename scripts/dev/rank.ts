import { buildExampleScores } from '@/lib/example/report';
import { computeWeights } from '@/lib/scoring';
import { EXAMPLE_TWIN } from '@/lib/example/twin';
const w = computeWeights(EXAMPLE_TWIN.objectives, EXAMPLE_TWIN.objectives[0]);
console.log('WEIGHTS', JSON.stringify(w));
for (const s of buildExampleScores()) {
  console.log(
    String(s.rank).padStart(2),
    s.chainName.padEnd(22),
    'base', s.deterministicScore.toFixed(1).padStart(5),
    'adj', s.aiAdjustment.toFixed(1).padStart(4),
    'final', s.finalScore.toFixed(1).padStart(5),
    'conf', String(s.confidence).padStart(3),
    s.recommendation.padEnd(16),
    (s.blockers[0] ?? '').slice(0, 60)
  );
}
