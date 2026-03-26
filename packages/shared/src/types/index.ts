// Базові типи для LUMARA Academy

// Типи AI агентів
export type AgentType = 'LUNA' | 'ARCAS' | 'NUMI' | 'UMBRA'

// Моделі AI
export type AIModel = 'CLAUDE_CLAUDE_OPUS_4_6' | 'CLAUDE_SONNET_4_6' | 'GPT4'

// Ролі в повідомленнях
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

// Плани підписки
export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO' | 'ELITE'

// Статус підписки
export type SubscriptionStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'TRIALING'

// Платформи для контенту
export type ContentPlatform = 'INSTAGRAM' | 'TELEGRAM' | 'TWITTER' | 'FACEBOOK'

// Статус контенту
export type ContentStatus = 'DRAFT' | 'QUEUED' | 'PUBLISHED' | 'FAILED'

// Інтерфейс відповіді API
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

// Інтерфейс пагінації
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
