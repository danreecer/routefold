import { z } from 'zod';
import {
  budgetSensitivitySchema,
  developmentStageSchema,
  objectiveSchema,
  productCategorySchema,
  sensitivitySchema,
  teamCapacitySchema,
  timeHorizonSchema,
  userProfileSchema,
  vmRequirementSchema,
} from './twin';

/**
 * Wizard input. This is user-supplied data crossing a trust boundary, so it is
 * validated on the client for UX and re-validated on the server for safety.
 */

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (value.length === 0) return true;
      try {
        const url = new URL(value.startsWith('http') ? value : `https://${value}`);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Enter a valid http(s) URL.' },
  )
  .transform((value) => {
    if (value.length === 0) return '';
    return value.startsWith('http') ? value : `https://${value}`;
  });

export const wizardStepSourceSchema = z.object({
  productName: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters.')
    .max(120, 'Product name is too long.'),
  websiteUrl: optionalUrl,
  docsUrl: optionalUrl,
  /** Used when retrieval fails and the user describes the product by hand. */
  manualDescription: z.string().trim().max(8000).default(''),
});

export const wizardStepCurrentStateSchema = z.object({
  currentChains: z.array(z.string().min(1).max(60)).max(20).default([]),
  category: productCategorySchema,
  vmEnvironment: vmRequirementSchema.default('any'),
  contractLanguages: z.array(z.string().min(1).max(40)).max(10).default([]),
  hasToken: z.enum(['yes', 'no', 'planned']).default('no'),
  developmentStage: developmentStageSchema,
});

export const wizardStepObjectivesSchema = z.object({
  objectives: z
    .array(objectiveSchema)
    .min(1, 'Select at least one expansion objective.')
    .max(8),
  primaryObjective: objectiveSchema,
  objectiveNotes: z.string().trim().max(1000).default(''),
  primaryUsers: userProfileSchema,
  targetGeographies: z.array(z.string().min(1).max(60)).max(10).default([]),
});

export const wizardStepConstraintsSchema = z.object({
  timeHorizon: timeHorizonSchema,
  teamCapacity: teamCapacitySchema,
  budgetSensitivity: budgetSensitivitySchema,
  securitySensitivity: sensitivitySchema,
  requiredVm: vmRequirementSchema.nullable().default(null),
  excludedEcosystems: z.array(z.string().min(1).max(60)).max(20).default([]),
  preferredEcosystems: z.array(z.string().min(1).max(60)).max(20).default([]),
  additionalContext: z.string().trim().max(4000).default(''),
});

export const wizardInputSchema = wizardStepSourceSchema
  .and(wizardStepCurrentStateSchema)
  .and(wizardStepObjectivesSchema)
  .and(wizardStepConstraintsSchema);

export type WizardStepSource = z.infer<typeof wizardStepSourceSchema>;
export type WizardStepCurrentState = z.infer<typeof wizardStepCurrentStateSchema>;
export type WizardStepObjectives = z.infer<typeof wizardStepObjectivesSchema>;
export type WizardStepConstraints = z.infer<typeof wizardStepConstraintsSchema>;
export type WizardInput = z.infer<typeof wizardInputSchema>;

/** Ensures the wizard's own cross-field invariants hold. */
export const wizardInputStrictSchema = wizardInputSchema.superRefine((value, ctx) => {
  if (!value.objectives.includes(value.primaryObjective)) {
    ctx.addIssue({
      code: 'custom',
      path: ['primaryObjective'],
      message: 'The primary objective must be one of the selected objectives.',
    });
  }
  const overlap = value.excludedEcosystems.filter((slug) => value.preferredEcosystems.includes(slug));
  if (overlap.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['excludedEcosystems'],
      message: `An ecosystem cannot be both preferred and excluded: ${overlap.join(', ')}.`,
    });
  }
  const hasSource = value.websiteUrl.length > 0 || value.docsUrl.length > 0;
  if (!hasSource && value.manualDescription.trim().length < 40) {
    ctx.addIssue({
      code: 'custom',
      path: ['websiteUrl'],
      message:
        'Provide a website or documentation URL, or describe the product in at least 40 characters.',
    });
  }
});

export const createAnalysisRequestSchema = z.object({
  input: wizardInputStrictSchema,
  /** Client-generated UUID that makes analysis creation idempotent. */
  idempotencyKey: z.string().uuid(),
  /** Reuse an existing project instead of creating a new one. */
  projectId: z.string().cuid().optional(),
});
export type CreateAnalysisRequest = z.infer<typeof createAnalysisRequestSchema>;

export const DEFAULT_WIZARD_INPUT: WizardInput = {
  productName: '',
  websiteUrl: '',
  docsUrl: '',
  manualDescription: '',
  currentChains: [],
  category: 'defi-lending',
  vmEnvironment: 'EVM',
  contractLanguages: [],
  hasToken: 'no',
  developmentStage: 'mainnet-early',
  objectives: ['user-growth'],
  primaryObjective: 'user-growth',
  objectiveNotes: '',
  primaryUsers: 'crypto-native',
  targetGeographies: [],
  timeHorizon: 'one-quarter',
  teamCapacity: 'small',
  budgetSensitivity: 'moderate',
  securitySensitivity: 'high',
  requiredVm: null,
  excludedEcosystems: [],
  preferredEcosystems: [],
  additionalContext: '',
};
