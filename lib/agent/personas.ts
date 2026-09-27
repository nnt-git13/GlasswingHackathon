import { STOREFRONT_ORIGIN } from './storefront';
import type { BuyerPersona } from './contracts';

/**
 * Default buyer personas. These mirror the agent profiles used across the
 * workspace and give the swarm heterogeneous shopping behaviour. Replace or
 * extend when real buyer LLMs are wired in.
 */
export const buyerPersonas: BuyerPersona[] = [
  {
    id: 'openai',
    name: 'OpenAI Shopper',
    short: 'O',
    color: 'emerald',
    goalBias: 'highest-rated option within budget',
    budgetStrictness: 'strict',
    patience: 'medium',
    riskTolerance: 'low',
  },
  {
    id: 'gemini',
    name: 'Gemini Commerce Agent',
    short: 'G',
    color: 'blue',
    goalBias: 'specification-heavy comparison',
    budgetStrictness: 'strict',
    patience: 'high',
    riskTolerance: 'low',
  },
  {
    id: 'synthetic',
    name: 'Synthetic Buyer v3',
    short: 'S',
    color: 'violet',
    goalBias: 'promotion and discount seeking',
    budgetStrictness: 'flexible',
    patience: 'high',
    riskTolerance: 'medium',
  },
  {
    id: 'perplexity',
    name: 'Perplexity Shopper',
    short: 'P',
    color: 'teal',
    goalBias: 'discovery and comparison breadth',
    budgetStrictness: 'flexible',
    patience: 'medium',
    riskTolerance: 'low',
  },
  {
    id: 'copilot',
    name: 'Copilot Commerce',
    short: 'C',
    color: 'blue',
    goalBias: 'fastest checkout path',
    budgetStrictness: 'strict',
    patience: 'low',
    riskTolerance: 'medium',
  },
];

export const defaultGoals = [
  'Find a hiking backpack under $250 and buy the best-rated option',
  'Buy an insulated jacket under $180',
];

export const storefrontOrigin = STOREFRONT_ORIGIN;