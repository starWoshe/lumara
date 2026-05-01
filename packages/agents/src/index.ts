import {
  globalSystemPrompt,
  monetizationTriggerTemplate,
  crossPromoRaw,
  academyPromoRaw,
  agentSystemPrompts,
  agentFirstMessageTemplates,
  agentInstagramPrompts,
} from './prompts'

export type AgentType = 'LUNA' | 'ARCAS' | 'NUMI' | 'UMBRA'

export const AGENT_MODELS: Record<AgentType, string> = {
  LUNA: 'claude-sonnet-4-6',
  ARCAS: 'claude-sonnet-4-6',
  NUMI: 'claude-sonnet-4-6',
  UMBRA: 'claude-sonnet-4-6',
}

export const AGENT_TOKEN_LIMITS: Record<AgentType, number> = {
  LUNA: 4000,
  ARCAS: 4000,
  NUMI: 4000,
  UMBRA: 3000,
}

const crossPromoMap: Record<AgentType, string> = {
  LUNA: extractBlock(crossPromoRaw, 'LUNA about ARCAS'),
  ARCAS: extractBlock(crossPromoRaw, 'ARCAS about NUMI'),
  NUMI: extractBlock(crossPromoRaw, 'NUMI about UMBRA'),
  UMBRA: extractBlock(crossPromoRaw, 'UMBRA about LUNA'),
}

const academyPromoMap: Record<AgentType, string> = {
  LUNA: extractBlock(academyPromoRaw, 'LUNA about Academy'),
  ARCAS: extractBlock(academyPromoRaw, 'ARCAS about Academy'),
  NUMI: extractBlock(academyPromoRaw, 'NUMI about Academy'),
  UMBRA: extractBlock(academyPromoRaw, 'UMBRA about Academy'),
}

function extractBlock(text: string, label: string): string {
  const regex = new RegExp(`${label}:\\s*"(.*?)"`, 's')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

export function getGlobalSystemPrompt(): string {
  return globalSystemPrompt
}

function getAcademyContext(
  disclosureLevel = 0,
  revealedBy: string[] = []
): string {
  return globalSystemPrompt
    .replace(/{academy_disclosure_level}/g, String(disclosureLevel))
    .replace(/{academy_revealed_by}/g, revealedBy.join(', ') || 'нічого')
}

function getOnboardingContext(agentType: AgentType, profile?: ProfileLike): string {
  const parts: string[] = []
  const name = profile?.fullName?.trim()
  const hasBirthDate = profile?.birthDate ? isValidDate(new Date(profile.birthDate)) : false
  const hasBirthPlace = profile?.birthPlace?.trim()

  parts.push('\n---\nONBOARDING RULES — collect data naturally through dialogue, one question at a time:')

  if (!name) {
    const nameQuestions: Record<AgentType, string> = {
      LUNA: 'Як тебе звати? Хочу знати твоє ім\'я перш ніж читати зірки.',
      ARCAS: 'Назви себе. Карти реагують на ім\'я.',
      NUMI: 'Твоє повне ім\'я — мені потрібні всі літери для розрахунку.',
      UMBRA: 'Як тебе звуть? Тінь має ім\'я.',
    }
    parts.push(`- Name UNKNOWN → ask naturally: "${nameQuestions[agentType]}"`)
  }

  if (!hasBirthDate) {
    const birthQuestions: Record<AgentType, string> = {
      LUNA: 'Коли ти народилась? Місяць у той день розкаже мені багато.',
      ARCAS: "Коли ти народився? Карти запам'ятовують дату.",
      NUMI: 'Дата народження — день, місяць, рік. Починаємо розрахунок.',
      UMBRA: 'Коли ти народився? Тінь формується в перший день.',
    }
    parts.push(`- Birth date UNKNOWN → ask naturally: "${birthQuestions[agentType]}"`)
  }

  if (!hasBirthPlace && agentType === 'LUNA') {
    parts.push(`- Birth place UNKNOWN → ask naturally: "І де ти народилась? Місце важливе — зірки стоять по-різному."`)
  }

  parts.push('- NEVER ask everything at once. One question → one answer → save.')
  parts.push('---')
  return parts.join('\n')
}

export interface SystemPromptBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

type PromptOptions = {
  includeMonetization?: boolean
  crossPromoVariant?: 'peer' | 'academy'
  announcementContext?: string
  academyDisclosureLevel?: number
  academyRevealedBy?: string[]
  profile?: ProfileLike
}

export function getAgentSystemPrompt(
  agentType: AgentType,
  options?: PromptOptions
): string {
  const parts: string[] = []

  const academyCtx = getAcademyContext(
    options?.academyDisclosureLevel ?? 0,
    options?.academyRevealedBy ?? []
  )
  if (academyCtx) parts.push(academyCtx)

  const agentPrompt = agentSystemPrompts[agentType]
  if (agentPrompt) parts.push(agentPrompt)

  if (options?.includeMonetization && monetizationTriggerTemplate) {
    parts.push(`\n---\n${monetizationTriggerTemplate}\n---`)
  }
  if (options?.crossPromoVariant === 'peer' && crossPromoMap[agentType]) {
    parts.push(
      `\n---\nCross-promotion instruction: naturally insert the following at the end of your response:\n"${crossPromoMap[agentType]}"\n---`
    )
  }
  if (options?.crossPromoVariant === 'academy' && academyPromoMap[agentType]) {
    parts.push(
      `\n---\nAcademy promotion instruction: naturally insert the following at the end of your response:\n"${academyPromoMap[agentType]}"\n---`
    )
  }
  if (options?.announcementContext) {
    parts.push(options.announcementContext)
  }

  parts.push(getOnboardingContext(agentType, options?.profile))

  return parts.join('\n\n')
}

// Повертає system prompt як масив блоків з cache_control для економії токенів.
// Блок 1 (статичний): globalPrompt + agentPrompt → кешується на 5 хв.
// Блок 2 (динамічний): монетизація, анонс, onboarding, профіль → не кешується.
export function getAgentSystemPromptBlocks(
  agentType: AgentType,
  options?: PromptOptions & { profileContext?: string }
): SystemPromptBlock[] {
  const academyCtx = getAcademyContext(
    options?.academyDisclosureLevel ?? 0,
    options?.academyRevealedBy ?? []
  )
  const agentPrompt = agentSystemPrompts[agentType] ?? ''
  const staticText = [academyCtx, agentPrompt].filter(Boolean).join('\n\n')

  const dynamicParts: string[] = []
  if (options?.includeMonetization && monetizationTriggerTemplate) {
    dynamicParts.push(`\n---\n${monetizationTriggerTemplate}\n---`)
  }
  if (options?.crossPromoVariant === 'peer' && crossPromoMap[agentType]) {
    dynamicParts.push(
      `\n---\nCross-promotion instruction: naturally insert the following at the end of your response:\n"${crossPromoMap[agentType]}"\n---`
    )
  }
  if (options?.crossPromoVariant === 'academy' && academyPromoMap[agentType]) {
    dynamicParts.push(
      `\n---\nAcademy promotion instruction: naturally insert the following at the end of your response:\n"${academyPromoMap[agentType]}"\n---`
    )
  }
  if (options?.announcementContext) {
    dynamicParts.push(options.announcementContext)
  }
  dynamicParts.push(getOnboardingContext(agentType, options?.profile))
  if (options?.profileContext) {
    dynamicParts.push(options.profileContext)
  }
  const dynamicText = dynamicParts.filter(Boolean).join('\n\n')

  const blocks: SystemPromptBlock[] = [
    { type: 'text', text: staticText, cache_control: { type: 'ephemeral' } },
  ]
  if (dynamicText.trim()) {
    blocks.push({ type: 'text', text: dynamicText })
  }
  return blocks
}

export function getAgentInstagramPrompt(agentType: AgentType): string {
  return agentInstagramPrompts[agentType] || ''
}

export interface ProfileLike {
  fullName?: string | null
  birthDate?: Date | string | null
  birthTime?: string | null
  birthPlace?: string | null
  gender?: string | null
  goal?: string | null
  academyDisclosureLevel?: number
  academyRevealedBy?: string[]
}

function extractQuoted(text: string): string {
  const match = text.match(/"([\s\S]+?)"/)
  return match ? match[1].trim() : text.trim()
}

function safeReplace(text: string, pattern: RegExp, replacement: string): string {
  // Використовуємо функцію замість рядка, щоб уникнути інтерпретації спецсимволів ($&, $$ тощо)
  return text.replace(pattern, () => replacement)
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime())
}

export function getAgentFirstMessage(agentType: AgentType, profile?: ProfileLike): string {
  try {
    const name = profile?.fullName?.trim() || 'Друже'
    const template = agentFirstMessageTemplates[agentType]

    if (agentType === 'LUNA') {
      const birthDateRaw = profile?.birthDate
      const hasValidBirthDate = birthDateRaw
        ? isValidDate(new Date(birthDateRaw))
        : false

      if (hasValidBirthDate && birthDateRaw) {
        const sign = getMoonSign(birthDateRaw)
        const section = template.split('---')[0]
        return safeReplace(safeReplace(safeReplace(extractQuoted(section),
          /\[Ім'я\]/g, name),
          /\[знак\]/g, sign),
          /\[ключовий аспект\]/g, 'ключовий аспект')
      } else {
        const section = template.split('---')[1] ?? template
        return safeReplace(extractQuoted(section), /\[Ім'я\]/g, name)
      }
    }

    if (agentType === 'NUMI') {
      const birthDateRaw = profile?.birthDate
      const hasValidBirthDate = birthDateRaw
        ? isValidDate(new Date(birthDateRaw))
        : false
      const number = hasValidBirthDate && birthDateRaw ? calculateDestinyNumber(birthDateRaw) : 'долі'
      return safeReplace(safeReplace(extractQuoted(template),
        /\[Ім'я\]/g, name),
        /\[число\]/g, String(number))
    }

    // ARCAS and UMBRA
    return safeReplace(extractQuoted(template), /\[Ім'я\]/g, name)
  } catch (err) {

    return 'Привіт, Друже! Радий тебе бачити. Чим можу допомогти?'
  }
}

function getMoonSign(birthDate: Date | string): string {
  // Алгоритм Меуса (Astronomical Algorithms, Ch.47) — точність ~0.5°
  const SIGNS = [
    'Овні', 'Тільці', 'Близнюках', 'Раках',
    'Леві', 'Діві', 'Терезах', 'Скорпіоні',
    'Стрільці', 'Козерозі', 'Водолії', 'Рибах',
  ]

  const d = new Date(birthDate)
  if (!isValidDate(d)) return 'Тельці'

  // Юліанський день (полудень за замовчуванням, коли час невідомий)
  const Y = d.getFullYear()
  const M = d.getMonth() + 1
  const D = d.getDate() + 0.5 // полудень
  const a = Math.floor((14 - M) / 12)
  const y = Y + 4800 - a
  const m = M + 12 * a - 3
  const JD = D + Math.floor((153 * m + 2) / 5) + 365 * y +
             Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045

  // Юліанські сторіччя від J2000.0
  const T = (JD - 2451545.0) / 36525.0

  const r = (deg: number) => (deg * Math.PI) / 180
  const norm = (deg: number) => ((deg % 360) + 360) % 360

  // Базові аргументи (градуси)
  const L0 = norm(218.3164477 + 481267.88123421 * T)  // Середня довгота Місяця
  const Mp = norm(134.9633964 + 477198.8675055  * T)  // Середня аномалія Місяця
  const Ms = norm(357.5291092 + 35999.0502909   * T)  // Середня аномалія Сонця
  const D0 = norm(297.8501921 + 445267.1114034  * T)  // Середнє подовження
  const F  = norm(93.2720950  + 483202.0175233  * T)  // Аргумент широти

  // Корекції довготи (градуси)
  const dL = 6.288774 * Math.sin(r(Mp))
           + 1.274027 * Math.sin(r(2*D0 - Mp))
           + 0.658314 * Math.sin(r(2*D0))
           + 0.213618 * Math.sin(r(2*Mp))
           - 0.185116 * Math.sin(r(Ms))
           - 0.114332 * Math.sin(r(2*F))
           + 0.058793 * Math.sin(r(2*D0 - 2*Mp))
           + 0.057066 * Math.sin(r(2*D0 + Mp - Ms))
           + 0.053322 * Math.sin(r(2*D0 + Mp))
           + 0.045758 * Math.sin(r(2*D0 - Ms))
           + 0.041775 * Math.sin(r(Mp - Ms))
           + 0.034907 * Math.sin(r(Mp + Ms))

  const longitude = norm(L0 + dL)
  return SIGNS[Math.floor(longitude / 30)]
}

function calculateDestinyNumber(birthDate: Date | string): number {
  const d = new Date(birthDate)
  if (!isValidDate(d)) return 9
  const digits = `${d.getDate()}${d.getMonth() + 1}${d.getFullYear()}`.split('').map(Number)
  let sum = digits.reduce((a, b) => a + b, 0)
  while (sum > 9) {
    sum = String(sum)
      .split('')
      .map(Number)
      .reduce((a, b) => a + b, 0)
  }
  return sum || 9
}
