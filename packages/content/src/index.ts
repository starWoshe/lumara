// Контент-генератор для соцмереж LUMARA Academy
// Використовується для автоматичного створення постів для Instagram, Telegram тощо

export type { ContentPlatform, ContentStatus } from '@lumara/shared'

// Типи контенту для генерації
export type ContentTopic =
  | 'daily_horoscope'      // Щоденний гороскоп
  | 'tarot_card_of_day'    // Карта дня
  | 'numerology_date'      // Нумерологія дати
  | 'lunar_phase'          // Місячна фаза
  | 'agent_wisdom'         // Мудрість від агента
  | 'course_promo'         // Промо курсу

export interface ContentGenerationRequest {
  topic: ContentTopic
  platform: 'INSTAGRAM' | 'TELEGRAM' | 'TWITTER' | 'FACEBOOK'
  agentType?: 'LUNA' | 'ARCAS' | 'NUMI' | 'UMBRA'
  language?: 'uk' | 'en'
  scheduledAt?: Date
}

export interface GeneratedContent {
  text: string
  hashtags: string[]
  platform: string
  characterCount: number
}

// TODO: Реалізувати генератор контенту у Фазі 3
// export async function generateContent(request: ContentGenerationRequest): Promise<GeneratedContent>
