// Точка входу для агента LUNA
import { readFileSync } from 'fs'
import { join } from 'path'
import { detectQueryType, type LunaQueryType } from './personality'
import { LUNA_SYSTEM_PROMPT } from '../prompts/luna'

// Завантажує спеціалізований .md промпт для типу запиту
function loadPrompt(type: LunaQueryType): string {
  if (type === 'general') return ''
  try {
    const filePath = join(__dirname, 'prompts', `${type}.md`)
    return readFileSync(filePath, 'utf-8')
  } catch {
    // Якщо файл не знайдено — повертаємо порожній рядок
    return ''
  }
}

// Повертає фінальний системний промпт для LUNA з урахуванням типу запиту
export function getLunaSystemPrompt(userMessage: string): string {
  const queryType = detectQueryType(userMessage)
  const specializedContext = loadPrompt(queryType)

  if (!specializedContext) {
    return LUNA_SYSTEM_PROMPT
  }

  return `${LUNA_SYSTEM_PROMPT}

---
## Контекст для цього запиту (${queryType})

${specializedContext}`
}

export { detectQueryType } from './personality'
export type { LunaQueryType } from './personality'
