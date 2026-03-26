// Реекспорт промптів та типів агентів
export { default as LUNA_PROMPT } from '../prompts/luna'
export { default as ARCAS_PROMPT } from '../prompts/arcas'
export { default as NUMI_PROMPT } from '../prompts/numi'
export { default as UMBRA_PROMPT } from '../prompts/umbra'

export type AgentType = 'LUNA' | 'ARCAS' | 'NUMI' | 'UMBRA'

// Маппінг агентів до їх промптів
export const AGENT_PROMPTS: Record<AgentType, string> = {
  LUNA: require('../prompts/luna').LUNA_SYSTEM_PROMPT,
  ARCAS: require('../prompts/arcas').ARCAS_SYSTEM_PROMPT,
  NUMI: require('../prompts/numi').NUMI_SYSTEM_PROMPT,
  UMBRA: require('../prompts/umbra').UMBRA_SYSTEM_PROMPT,
}

// Маппінг агентів до їх моделей
export const AGENT_MODELS: Record<AgentType, string> = {
  LUNA: 'claude-sonnet-4-6',
  ARCAS: 'claude-sonnet-4-6',
  NUMI: 'claude-sonnet-4-6',
  UMBRA: 'gpt-4',
}

// Ліміти токенів для агентів
export const AGENT_TOKEN_LIMITS: Record<AgentType, number> = {
  LUNA: 4000,
  ARCAS: 4000,
  NUMI: 4000,
  UMBRA: 3000,
}
