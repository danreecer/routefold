import { CHAIN_KNOWLEDGE_BASE } from '@/lib/chains/knowledge-base';
import { registerChainFamilies } from './engine';

// Register the family lookup once, at module load, before any scoring runs.
registerChainFamilies(CHAIN_KNOWLEDGE_BASE);

export * from './engine';
export * from './types';
