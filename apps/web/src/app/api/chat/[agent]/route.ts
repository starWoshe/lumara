import { getSessionUser } from '@/lib/auth'
import { withSessionStore } from '@/lib/session-store'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lumara/database'
import {
  AgentType,
  AGENT_TOKEN_LIMITS,
  getAgentSystemPromptBlocks,
  getAgentFirstMessage,
  type ProfileLike,
  type SystemPromptBlock,
} from '@lumara/agents'
import { sendMessageSchema } from '@lumara/shared'
import { FREE_MESSAGES_LIMIT, PLANS } from '@/lib/stripe'
import { calcCostUsd } from '@/lib/token-costs'
import { checkTokenAlerts } from '@/lib/token-alerts'

const AGENT_ERROR_MESSAGES: Record<AgentType, string> = {
  LUNA: 'Зірки зараз мовчать... Відчуваю перешкоду в каналі. Спробуй звернутись до мене трохи пізніше 🌙',
  ARCAS: 'Карти перевернулись. Щось заважає з\'єднанню — повернись за хвилину 🃏',
  NUMI: 'Числа розійшлись. Спробуй ще раз — енергія відновиться 🔢',
  UMBRA: 'Щось розриває зв\'язок між нами. Дай мені момент... і повернись 🧠',
}

function getAgentErrorMessage(agent: AgentType | undefined): string {
  if (agent && agent in AGENT_ERROR_MESSAGES) {
    return AGENT_ERROR_MESSAGES[agent]
  }
  return AGENT_ERROR_MESSAGES.LUNA
}

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Динамічний імпорт: SDK завантажується лише під час запиту, не під час білда
async function getAnthropicClient() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY не встановлено')
  return new Anthropic({ apiKey })
}

function isOverloadedError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    ((err as { status: number }).status === 529 || (err as { status: number }).status === 503)
  )
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isOverloadedError(err) || attempt === maxRetries) throw err
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 500

      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime())
}

const ANNOUNCEMENT_MIN_EXCHANGES = 5   // скільки обмінів до першого анонсу
const ANNOUNCEMENT_GAP = 3             // мінімальний інтервал між шарами
const ANNOUNCEMENT_MAX_LAYERS = 3      // всього 3 шари на агента

interface AnnouncementCtx {
  context: string
  shouldSave: boolean
  nextLayer: number
  currentExchanges: number
}

async function buildAnnouncementContext(
  userId: string,
  agentType: AgentType,
  userExchanges: number,
): Promise<AnnouncementCtx> {
  if (userExchanges < ANNOUNCEMENT_MIN_EXCHANGES) {
    return { context: '', shouldSave: false, nextLayer: 0, currentExchanges: userExchanges }
  }

  const state = await db.announcementState.findUnique({
    where: { userId_agentType: { userId, agentType } },
  })

  const lastLayer = state?.lastLayer ?? 0
  const lastExchange = state?.lastAnnouncementExchange ?? 0
  const shownLayers = lastLayer > 0 ? Array.from({ length: lastLayer }, (_, i) => i + 1) : []
  const gap = userExchanges - lastExchange
  const shouldShow = lastLayer < ANNOUNCEMENT_MAX_LAYERS && gap >= ANNOUNCEMENT_GAP
  const nextLayer = shouldShow ? lastLayer + 1 : lastLayer

  const ctx = [
    '\n---',
    'ANNOUNCEMENT_STATE (private — не згадуй напряму):',
    `user_exchanges: ${userExchanges}`,
    `shown_announcement_layers: [${shownLayers.join(', ')}]`,
    shouldShow
      ? `Умови виконані — органічно вплети шар ${nextLayer} анонсу в цю відповідь.`
      : '',
    '---',
  ].filter(Boolean).join('\n')

  return { context: ctx, shouldSave: shouldShow, nextLayer, currentExchanges: userExchanges }
}

function buildProfileContext(
  profile: Record<string, unknown> | null,
  sessionName: string | null | undefined
): string {
  try {
    const parts: string[] = []
    const displayName = ((profile?.fullName as string | undefined) ?? '').trim() || sessionName
    if (displayName) parts.push(`Ім'я: ${displayName}`)

    const gender = ((profile?.gender as string | undefined) ?? '').trim()
    if (gender) parts.push(`Стать: ${gender}`)

    const birthDateRaw = profile?.birthDate
    if (birthDateRaw) {
      const d = birthDateRaw instanceof Date ? birthDateRaw : new Date(birthDateRaw as string)
      if (isValidDate(d)) {
        parts.push(`Дата народження: ${d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}`)
      }
    }

    const birthTime = ((profile?.birthTime as string | undefined) ?? '').trim()
    if (birthTime) parts.push(`Час народження: ${birthTime}`)

    const birthPlace = ((profile?.birthPlace as string | undefined) ?? '').trim()
    if (birthPlace) parts.push(`Місце народження: ${birthPlace}`)

    const goal = ((profile?.goal as string | undefined) ?? '').trim()
    if (goal) parts.push(`Основний запит/мета: ${goal}`)

    if (parts.length === 0) return ''
    return `\n\n---\nPERSONAL DATA — ALREADY KNOWN. Use directly. NEVER ask the user for any of this information again:\n${parts.join('\n')}\nIMPORTANT: The user has already provided this data. Asking them to repeat it is a critical error that breaks immersion.\n---`
  } catch (err) {

    return ''
  }
}

function sseResponse(text: string, conversationId: string) {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text }) }\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId, done: true }) }\n\n`))
      controller.close()
    },
  })
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(req: NextRequest, { params }: { params: { agent: string } }) {
  return withSessionStore(async () => {
    let agentType: AgentType | undefined
    try {
    const session = await getSessionUser()
    if (!session?.id) {
      throw new Error('Не авторизовано')
    }

    const agentParam = params.agent.toUpperCase()
    if (!['LUNA', 'ARCAS', 'NUMI', 'UMBRA'].includes(agentParam)) {
      throw new Error('Невідомий агент')
    }
    agentType = agentParam as AgentType

    const body = await req.json()
    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) {
      throw new Error('Невірні дані')
    }

    const { conversationId, content, initiate } = parsed.data
    const userId = session.id

    // Знаходимо або створюємо агента в БД
    const agent = await db.agent.findUnique({ where: { type: agentType } })
    if (!agent) {
      throw new Error('Агент не знайдено')
    }

    // Перевірка блокування (червоний алерт)
    if (agent.blockedUntil && agent.blockedUntil > new Date()) {
      throw new Error('AGENT_BLOCKED')
    }

    // --- Initiate flow: mage speaks first ---
    if (initiate) {
      const profile = await db.profile.findUnique({ where: { userId } })
      const conversation = await db.conversation.create({
        data: {
          userId,
          agentId: agent.id,
          title: `Сесія з ${agentType}`,
        },
      })
      const firstMessage = getAgentFirstMessage(agentType, profile as ProfileLike | undefined)
      await db.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: firstMessage,
        },
      })
      db.activityLog.create({
        data: { userId, action: 'CHAT_STARTED', metadata: { agent: agentType } },
      }).catch(() => {})
      db.profile.update({
        where: { userId },
        data: { lastVisitedAgent: agentType },
      }).catch(() => {})
      return sseResponse(firstMessage, conversation.id)
    }

    if (!content) {
      throw new Error("Повідомлення обов'язкове")
    }

    const subscription = await db.subscription.findFirst({ where: { userId } })
    const plan =
      subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'
        ? subscription.plan
        : 'FREE'

    // Перевірка ліміту повідомлень по плану (адміни мають безліміт)
    if (session.role !== 'ADMIN') {
      if (plan === 'FREE') {
        const totalMessages = await db.message.count({
          where: {
            role: 'USER',
            conversation: { userId },
          },
        })
        if (totalMessages >= FREE_MESSAGES_LIMIT) {
          throw new Error('LIMIT_REACHED')
        }
      } else if (plan === 'BASIC') {
        const periodStart = subscription!.currentPeriodStart ?? new Date(0)
        const monthMessages = await db.message.count({
          where: {
            role: 'USER',
            conversation: { userId },
            createdAt: { gte: periodStart },
          },
        })
        if (monthMessages >= PLANS.BASIC.messagesPerMonth) {
          throw new Error('MONTHLY_LIMIT_REACHED')
        }
      }
    }

    const aiModel = plan === 'ELITE' ? 'claude-opus-4-6' : 'claude-sonnet-4-6'

    // Знаходимо або створюємо сесію розмови
    let conversation
    if (conversationId) {
      conversation = await db.conversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      })
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          userId,
          agentId: agent.id,
          title: `Сесія з ${agentType}`,
        },
        include: { messages: true },
      })
    }

    // Зберігаємо повідомлення користувача
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content,
      },
    })
    db.activityLog.create({
      data: { userId, action: 'MESSAGE_SENT', metadata: { agent: agentType, conversationId: conversation.id } },
    }).catch(() => {})

    const profile = await db.profile.findUnique({ where: { userId } })

    // --- Академія Лумара: оновлення рівня розкриття ---
    if (profile && profile.academyDisclosureLevel < 3) {
      const shouldUpdate = await (async () => {
        if (profile.academyDisclosureLevel < 2) {
          const totalUserMessages = await db.message.count({
            where: { role: 'USER', conversation: { userId } },
          })
          return totalUserMessages >= 8
        }
        if (profile.academyDisclosureLevel < 3) {
          const distinctAgents = await db.conversation.groupBy({
            by: ['agentId'],
            where: { userId },
          })
          return distinctAgents.length >= 2
        }
        return false
      })()

      if (shouldUpdate) {
        const newLevel = profile.academyDisclosureLevel < 2 ? 2 : 3
        db.profile.update({
          where: { userId },
          data: { academyDisclosureLevel: newLevel },
        }).catch(() => {})
      }
    }

    const profileContext = buildProfileContext(profile as Record<string, unknown> | null, session.name)

    // --- Monetization & cross-promo logic ---
    const previousMessages = conversation.messages ?? []
    const totalMessages = previousMessages.length + 1 // + щойно збережене user message
    const assistantCount = previousMessages.filter((m) => m.role === 'ASSISTANT').length
    const stripeLiveMode = process.env.STRIPE_LIVE_MODE === 'true'

    const includeMonetization = stripeLiveMode && totalMessages >= 12
    const crossPromoRound = (assistantCount + 1) % 6 === 0
    const cycle = Math.floor((assistantCount + 1) / 6)
    const crossPromoVariant: 'peer' | 'academy' | undefined = crossPromoRound
      ? (cycle % 2 === 1 ? 'peer' : 'academy')
      : undefined

    // --- Announcement layer tracking ---
    const userExchanges = await db.message.count({
      where: {
        role: 'ASSISTANT',
        conversation: { userId, agent: { type: agentType } },
      },
    })
    const announcementCtx = await buildAnnouncementContext(userId, agentType, userExchanges)

    const disclosureLevel = profile?.academyDisclosureLevel ?? 0
    let gossipContext: string | undefined
    if (disclosureLevel >= 1) {
      const gossips = await db.academyGossip.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
        select: { text: true },
      })
      if (gossips.length > 0) {
        gossipContext = gossips.map((g) => `- ${g.text}`).join('\n')
      }
    }

    const systemBlocks = getAgentSystemPromptBlocks(agentType, {
      includeMonetization,
      crossPromoVariant,
      announcementContext: announcementCtx.context,
      academyDisclosureLevel: disclosureLevel,
      academyRevealedBy: (profile?.academyRevealedBy as string[]) ?? [],
      profile: profile as ProfileLike | undefined,
      profileContext,
      gossipContext,
    })
    const tokenLimit = AGENT_TOKEN_LIMITS[agentType]

    const messages = previousMessages.map((m) => ({
      role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))
    messages.push({ role: 'user', content })

    const anthropic = await getAnthropicClient()

    let responseText: string
    try {
      const response = await withRetry(() =>
        anthropic.messages.create({
          model: aiModel,
          max_tokens: tokenLimit,
          system: systemBlocks as SystemPromptBlock[],
          messages,
        })
      )
      responseText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')

      // Логуємо витрати токенів + перевірка алертів (async, не блокуємо відповідь)
      const tokIn = response.usage.input_tokens
      const tokOut = response.usage.output_tokens
      const tokCacheRead = (response.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0
      const tokCacheWrite = (response.usage as { cache_creation_input_tokens?: number }).cache_creation_input_tokens ?? 0
      db.tokenUsage.create({
        data: {
          userId,
          agent: agentType,
          actionType: 'chat',
          model: aiModel,
          tokensInput: tokIn + tokCacheRead + tokCacheWrite,
          tokensOutput: tokOut,
          tokensTotal: tokIn + tokCacheRead + tokCacheWrite + tokOut,
          costUsd: calcCostUsd(aiModel, tokIn + tokCacheRead + tokCacheWrite, tokOut, tokCacheRead, tokCacheWrite),
        },
      }).then(() => checkTokenAlerts(agentType!)).catch(() => {})

      // Зберігаємо стан анонсу якщо новий шар був показаний
      if (announcementCtx.shouldSave) {
        db.announcementState.upsert({
          where: { userId_agentType: { userId: userId, agentType: agentType! } },
          create: {
            userId,
            agentType: agentType!,
            lastLayer: announcementCtx.nextLayer,
            lastAnnouncementExchange: announcementCtx.currentExchanges,
          },
          update: {
            lastLayer: announcementCtx.nextLayer,
            lastAnnouncementExchange: announcementCtx.currentExchanges,
          },
        }).catch(() => {})
      }

    } catch (apiErr) {

      return sseResponse(getAgentErrorMessage(agentType), '')
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: responseText,
      },
    })

    return sseResponse(responseText, conversation.id)
  } catch (error) {

    return sseResponse(getAgentErrorMessage(agentType), '')
  }
  })
}
