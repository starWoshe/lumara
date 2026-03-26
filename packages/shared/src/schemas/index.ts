import { z } from 'zod'

// Zod схеми для валідації вхідних даних

// Схема для повідомлень агенту
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  agentType: z.enum(['LUNA', 'ARCAS', 'NUMI', 'UMBRA']),
  content: z.string().min(1).max(4000),
})

// Схема для реєстрації користувача
export const registerUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
})

// Схема для оновлення профілю
export const updateProfileSchema = z.object({
  birthDate: z.string().datetime().optional(),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  birthPlace: z.string().max(200).optional(),
  language: z.enum(['uk', 'en', 'ru']).optional(),
  timezone: z.string().optional(),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
