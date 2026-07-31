import type { ReportModel } from '@/lib/report-model';
import { SCORING_VERSION } from '@/lib/scoring';
import {
  EXAMPLE_ARCHITECTURE,
  EXAMPLE_PLAN,
  EXAMPLE_RISKS,
  EXAMPLE_SEQUENCE,
  EXAMPLE_TECHNICAL_BRIEF,
  buildExampleScores,
  buildExampleSources,
  buildExampleSummary,
  exampleOverallConfidence,
} from './report';
import { EXAMPLE_PROJECT_NAME, EXAMPLE_TWIN } from './twin';

export * from './twin';
export * from './report';

/**
 * Assembles the public example into the same view model a real report uses, so
 * /example exercises exactly the same rendering path as a live report — if the
 * example looks right, the product looks right.
 */
export function buildExampleReport(): ReportModel {
  const scores = buildExampleScores();

  return {
    id: 'example',
    title: 'Meridian Reserve — multichain expansion blueprint',
    projectName: EXAMPLE_PROJECT_NAME,
    websiteUrl: 'https://meridian-reserve.example/',
    docsUrl: 'https://docs.meridian-reserve.example/protocol',
    currentChains: EXAMPLE_TWIN.currentChains,
    confidence: exampleOverallConfidence(),
    recommendedChain: EXAMPLE_SEQUENCE.primary.chainSlug,
    completedAt: '2026-07-14T09:26:00.000Z',
    createdAt: '2026-07-14T09:11:00.000Z',
    scoringVersion: SCORING_VERSION,
    modelName: 'illustrative — hand-authored narrative, engine-computed scores',
    generationMode: 'live',
    isExample: true,
    isPublicView: true,

    twin: EXAMPLE_TWIN,
    twinAssumptions: EXAMPLE_TWIN.assumptions,
    twinMissingData: EXAMPLE_TWIN.missingData,
    twinFieldSources: {
      productName: 'user',
      productCategory: 'user',
      oneLineDescription: 'source',
      'architecture.summary': 'source',
      'architecture.contractComplexity': 'inferred',
      'architecture.upgradeability': 'source',
      currentChains: 'user',
      vmRequirement: 'user',
      contractLanguages: 'source',
      'users.primaryProfile': 'user',
      'users.estimatedSophistication': 'inferred',
      'liquidity.requiresDeepLiquidity': 'inferred',
      'liquidity.stablecoinDependency': 'inferred',
      'transactions.profile': 'inferred',
      'transactions.latencySensitivity': 'inferred',
      'transactions.costSensitivity': 'inferred',
      'transactions.finalityRequirement': 'inferred',
      'security.sensitivity': 'user',
      'security.valueAtRisk': 'inferred',
      'security.auditStatus': 'source',
      orientation: 'inferred',
      targetGeographies: 'user',
      'constraints.timeHorizon': 'user',
      'constraints.teamCapacity': 'user',
      'constraints.budgetSensitivity': 'user',
      'constraints.excludedEcosystems': 'user',
      'constraints.requiredVm': 'user',
      objectives: 'user',
      developmentStage: 'user',
      hasToken: 'user',
    },

    scores,
    summary: buildExampleSummary(),
    sequence: EXAMPLE_SEQUENCE,
    architecture: EXAMPLE_ARCHITECTURE,
    risks: EXAMPLE_RISKS,
    plan: EXAMPLE_PLAN,
    technicalBrief: EXAMPLE_TECHNICAL_BRIEF,
    sources: buildExampleSources(),
  };
}
