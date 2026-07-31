import { z } from 'zod';

/**
 * Report section payloads.
 *
 * These are the contracts the language model must satisfy. Anything that fails
 * validation is retried with the validation error fed back to the model; if it
 * still fails, the stage errors rather than persisting a malformed section.
 */

// ── Stage 3: per-chain interpretation ────────────────────────────────────────

export const chainInterpretationSchema = z.object({
  chainSlug: z.string().min(1).max(60),
  rationale: z.string().min(1).max(1600),
  advantages: z.array(z.string().min(1).max(300)).min(1).max(6),
  tradeoffs: z.array(z.string().min(1).max(300)).min(1).max(6),
  unknowns: z.array(z.string().min(1).max(300)).max(6).default([]),
  /** Bounded to ±5 by the engine regardless of what the model returns. */
  adjustment: z.number().min(-5).max(5).default(0),
  adjustmentReason: z.string().max(600).default(''),
});
export type ChainInterpretation = z.infer<typeof chainInterpretationSchema>;

export const chainInterpretationBatchSchema = z.object({
  interpretations: z.array(chainInterpretationSchema).min(1).max(20),
});

// ── Stage 4: expansion sequence ──────────────────────────────────────────────

export const expansionSequenceSchema = z.object({
  primary: z.object({
    chainSlug: z.string().min(1).max(60),
    reason: z.string().min(1).max(1200),
    timing: z.string().min(1).max(300),
  }),
  secondary: z
    .array(
      z.object({
        chainSlug: z.string().min(1).max(60),
        reason: z.string().min(1).max(800),
        timing: z.string().min(1).max(300),
      }),
    )
    .max(4)
    .default([]),
  notRecommended: z
    .array(
      z.object({
        chainSlug: z.string().min(1).max(60),
        reason: z.string().min(1).max(600),
      }),
    )
    .max(12)
    .default([]),
  rolloutOrder: z
    .array(
      z.object({
        step: z.number().int().min(1).max(10),
        chainSlug: z.string().min(1).max(60),
        milestone: z.string().min(1).max(300),
        dependsOn: z.array(z.string().max(60)).max(5).default([]),
      }),
    )
    .min(1)
    .max(8),
  decisionRationale: z.string().min(1).max(2000),
});
export type ExpansionSequence = z.infer<typeof expansionSequenceSchema>;

// ── Executive summary ────────────────────────────────────────────────────────

export const executiveSummarySchema = z.object({
  recommendedChainSlug: z.string().min(1).max(60),
  headline: z.string().min(1).max(220),
  rationale: z.string().min(1).max(1600),
  mainOpportunity: z.string().min(1).max(600),
  mainRisk: z.string().min(1).max(600),
  suggestedTiming: z.string().min(1).max(300),
  confidence: z.number().int().min(0).max(100),
  confidenceReason: z.string().max(600).default(''),
});
export type ExecutiveSummary = z.infer<typeof executiveSummarySchema>;

// ── Stage 5: architecture brief ──────────────────────────────────────────────

export const architectureBriefSchema = z.object({
  summary: z.string().min(1).max(2000),
  deploymentModel: z.object({
    approach: z.string().min(1).max(600),
    reasoning: z.string().min(1).max(1200),
  }),
  components: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        name: z.string().min(1).max(120),
        layer: z.enum(['onchain', 'offchain', 'client', 'data', 'external']),
        chainSlug: z.string().max(60).nullable().default(null),
        description: z.string().min(1).max(600),
      }),
    )
    .min(2)
    .max(16),
  connections: z
    .array(
      z.object({
        from: z.string().min(1).max(60),
        to: z.string().min(1).max(60),
        label: z.string().min(1).max(120),
        kind: z.enum(['message', 'state', 'liquidity', 'data', 'user']),
      }),
    )
    .max(32)
    .default([]),
  tokenModel: z.string().min(1).max(1500),
  messaging: z.string().min(1).max(1500),
  stateSynchronisation: z.string().min(1).max(1500),
  liquidity: z.string().min(1).max(1500),
  frontendAndWallets: z.string().min(1).max(1500),
  indexing: z.string().min(1).max(1500),
  monitoring: z.array(z.string().min(1).max(300)).min(1).max(12),
  assumptions: z.array(z.string().min(1).max(300)).max(12).default([]),
});
export type ArchitectureBrief = z.infer<typeof architectureBriefSchema>;

// ── Stage 6: risk register ───────────────────────────────────────────────────

export const riskCategorySchema = z.enum([
  'security',
  'liquidity',
  'operational',
  'governance',
  'user-experience',
  'compliance',
]);
export type RiskCategory = z.infer<typeof riskCategorySchema>;

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  security: 'Security',
  liquidity: 'Liquidity',
  operational: 'Operational',
  governance: 'Governance',
  'user-experience': 'User experience',
  compliance: 'Compliance',
};

export const riskLevelSchema = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const riskItemSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(200),
  category: riskCategorySchema,
  description: z.string().min(1).max(1200),
  probability: riskLevelSchema,
  impact: riskLevelSchema,
  mitigation: z.string().min(1).max(1200),
  suggestedOwner: z.string().min(1).max(120),
  /** Compliance items are framed as questions for counsel, never as advice. */
  isOpenQuestion: z.boolean().default(false),
});
export type RiskItem = z.infer<typeof riskItemSchema>;

export const riskRegisterSchema = z.object({
  summary: z.string().min(1).max(1200),
  risks: z.array(riskItemSchema).min(3).max(24),
  complianceQuestions: z.array(z.string().min(1).max(400)).max(12).default([]),
});
export type RiskRegister = z.infer<typeof riskRegisterSchema>;

// ── Stage 7: execution plan ──────────────────────────────────────────────────

export const planTaskSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(200),
  track: z.enum(['engineering', 'product', 'ecosystem', 'operations']),
  description: z.string().min(1).max(800),
  owner: z.string().min(1).max(120),
  dependsOn: z.array(z.string().max(40)).max(6).default([]),
  acceptanceCriteria: z.array(z.string().min(1).max(300)).min(1).max(6),
  effort: z.enum(['S', 'M', 'L']),
});
export type PlanTask = z.infer<typeof planTaskSchema>;

export const executionPlanSchema = z.object({
  summary: z.string().min(1).max(1200),
  weeks: z
    .array(
      z.object({
        week: z.number().int().min(1).max(4),
        theme: z.string().min(1).max(160),
        milestone: z.string().min(1).max(300),
        taskIds: z.array(z.string().max(40)).min(1).max(12),
      }),
    )
    .length(4),
  tasks: z.array(planTaskSchema).min(6).max(40),
  launchDependencies: z.array(z.string().min(1).max(300)).max(12).default([]),
});
export type ExecutionPlan = z.infer<typeof executionPlanSchema>;

// ── Technical brief ──────────────────────────────────────────────────────────

export const technicalBriefSchema = z.object({
  overview: z.string().min(1).max(2000),
  targetChain: z.string().min(1).max(60),
  contractWork: z.array(z.string().min(1).max(400)).min(1).max(16),
  infrastructureWork: z.array(z.string().min(1).max(400)).min(1).max(16),
  frontendWork: z.array(z.string().min(1).max(400)).min(1).max(16),
  testingStrategy: z.array(z.string().min(1).max(400)).min(1).max(12),
  openQuestions: z.array(z.string().min(1).max(400)).max(12).default([]),
});
export type TechnicalBrief = z.infer<typeof technicalBriefSchema>;

// ── Sources & assumptions ────────────────────────────────────────────────────

export const sourcesAssumptionsSchema = z.object({
  submittedSources: z.array(
    z.object({
      url: z.string().max(2048),
      kind: z.string().max(40),
      status: z.string().max(40),
      retrievedAt: z.string().max(40).nullable(),
      wordCount: z.number().int().min(0).nullable(),
      failureReason: z.string().max(300).nullable(),
    }),
  ),
  userAssumptions: z.array(z.string().max(300)).default([]),
  modelAssumptions: z.array(z.string().max(300)).default([]),
  missingData: z.array(z.string().max(300)).default([]),
  chainDataSource: z.object({
    knowledgeBaseVersion: z.string().max(40),
    reviewedAt: z.string().max(40),
    liveDataStatus: z.string().max(40),
    liveDataFetchedAt: z.string().max(60).nullable(),
  }),
  methodologyVersion: z.string().max(40),
  generationMode: z.enum(['live', 'fixture']),
  modelName: z.string().max(120),
});
export type SourcesAssumptions = z.infer<typeof sourcesAssumptionsSchema>;

// ── Section registry ─────────────────────────────────────────────────────────

export const REPORT_SECTION_SCHEMAS = {
  EXECUTIVE_SUMMARY: executiveSummarySchema,
  EXPANSION_MAP: expansionSequenceSchema,
  ARCHITECTURE: architectureBriefSchema,
  RISK_REGISTER: riskRegisterSchema,
  EXECUTION_PLAN: executionPlanSchema,
  TECHNICAL_BRIEF: technicalBriefSchema,
  SOURCES_ASSUMPTIONS: sourcesAssumptionsSchema,
} as const;

/**
 * Sections a user can regenerate individually. Sources & assumptions is derived
 * from the run rather than generated, so it is excluded here — regenerating it
 * would mean rewriting the provenance record, which must stay factual.
 */
export type RegeneratableSection = Exclude<
  keyof typeof REPORT_SECTION_SCHEMAS,
  'SOURCES_ASSUMPTIONS'
>;

export const REGENERATABLE_SECTIONS: RegeneratableSection[] = [
  'EXECUTIVE_SUMMARY',
  'EXPANSION_MAP',
  'ARCHITECTURE',
  'RISK_REGISTER',
  'EXECUTION_PLAN',
  'TECHNICAL_BRIEF',
];

export const SECTION_LABELS: Record<string, string> = {
  EXECUTIVE_SUMMARY: 'Executive summary',
  DIGITAL_TWIN: 'Multichain Digital Twin',
  EXPANSION_MAP: 'Expansion map',
  CHAIN_SCORECARD: 'Chain scorecard',
  ARCHITECTURE: 'Architecture brief',
  RISK_REGISTER: 'Risk register',
  EXECUTION_PLAN: '30-day plan',
  TECHNICAL_BRIEF: 'Technical brief',
  SOURCES_ASSUMPTIONS: 'Sources & assumptions',
};
