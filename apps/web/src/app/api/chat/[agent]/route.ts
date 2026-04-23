import { getSessionUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lumara/database'
import {
  AgentType,
  AGENT_TOKEN_LIMITS,
  getAgentSystemPrompt,
  getAgentFirstMessage,
  type ProfileLike,
} from '@lumara/agents'
import { sendMessageSchema } from '@lumara/shared'
import { FREE_MESSAGES_LIMIT, PLANS } from '@/lib/stripe'
import { calcCostUsd } from '@/lib/token-costs'
import { checkTokenAlerts } from '@/lib/token-alerts'

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
      console.warn(`[chat/route] Anthropic перевантажений (529), спроба ${attempt + 1}/${maxRetries}, затримка ${Math.round(delay)}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

function buildProfileContext(
  profile: Record<string, unknown> | null,
  sessionName: string | null | undefined
): string {
  const parts: string[] = []
  const displayName = (profile?.fullName as string) || sessionName
  if (displayName) parts.push(`Ім'я: ${displayName}`)
  if (profile?.gender) parts.push(`Стать: ${profile?.gender}`)
  if (profile?.birthDate) {
    const d = new Date(profile.birthDate as string)
    parts.push(`Дата народження: ${d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}`)
  }
  if (profile?.birthTime) parts.push(`Час народження: ${profile?.birthTime}`)
  if (profile?.birthPlace) parts.push(`Місце народження: ${profile?.birthPlace}`)
  if (profile?.goal) parts.push(`Основний запит/мета: ${profile?.goal}`)

  if (parts.length === 0) return ''
  return `\n\n---\nPERSONAL DATA — ALREADY KNOWN. Use directly. NEVER ask the user for any of this information again:\n${parts.join('\n')}\nIMPORTANT: The user has already provided this data. Asking them to repeat it is a critical error that breaks immersion.\n---`
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
  try {
    const session = await getSessionUser()
    if (!session?.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const agentParam = params.agent.toUpperCase()
    if (!['LUNA', 'ARCAS', 'NUMI', 'UMBRA'].includes(agentParam)) {
      return NextResponse.json({ error: 'Невідомий агент' }, { status: 400 })
    }
    const agentType = agentParam as AgentType

    const body = await req.json()
    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Невірні дані', details: parsed.error.flatten() }, { status: 400 })
    }

    const { conversationId, content, initiate } = parsed.data
    const userId = session.id

    // Знаходимо або створюємо агента в БД
    const agent = await db.agent.findUnique({ where: { type: agentType } })
    if (!agent) {
      return NextResponse.json({ error: 'Агент не знайдено' }, { status: 404 })
    }

    // Перевірка блокування (червоний алерт)
    if (agent.blockedUntil && agent.blockedUntil > new Date()) {
      const minutesLeft = Math.ceil((agent.blockedUntil.getTime() - Date.now()) / 60_000)
      return NextResponse.json(
        { error: 'AGENT_BLOCKED', message: `Агент тимчасово призупинений. Спробуй через ${minutesLeft} хв.` },
        { status: 503 }
      )
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
      return NextResponse.json({ error: "Повідомлення обов'язкове" }, { status: 400 })
    }

    // Перевірка ліміту повідомлень по плану
    const subscription = await db.subscription.findFirst({ where: { userId } })
    const plan =
      subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'
        ? subscription.plan
        : 'FREE'

    if (plan === 'FREE') {
      const totalMessages = await db.message.count({
        where: {
          role: 'USER',
          conversation: { userId },
        },
      })
      if (totalMessages >= FREE_MESSAGES_LIMIT) {
        return NextResponse.json(
          { error: 'LIMIT_REACHED', limit: FREE_MESSAGES_LIMIT },
          { status: 402 }
        )
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
        return NextResponse.json(
          { error: 'MONTHLY_LIMIT_REACHED', limit: PLANS.BASIC.messagesPerMonth },
          { status: 402 }
        )
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

    const basePrompt = getAgentSystemPrompt(agentType, {
      includeMonetization,
      crossPromoVariant,
    })
    const systemPrompt = basePrompt + profileContext
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
          system: systemPrompt,
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
      db.tokenUsage.create({
        data: {
          userId,
          agent: agentType,
          actionType: 'chat',
          model: aiModel,
          tokensInput: tokIn,
          tokensOutput: tokOut,
          tokensTotal: tokIn + tokOut,
          costUsd: calcCostUsd(aiModel, tokIn, tokOut),
        },
      }).then(() => checkTokenAlerts(agentType)).catch(() => {})
    } catch (apiErr) {
      const overloaded = isOverloadedError(apiErr)
      console.error('[chat/route] API помилка після всіх спроб:', apiErr)
      return NextResponse.json(
        {
          error: overloaded ? 'OVERLOADED' : 'API_ERROR',
          message: overloaded
            ? 'Сервіс тимчасово перевантажений. Спробуйте через хвилину.'
            : 'Помилка підключення до AI. Спробуйте ще раз.',
        },
        { status: overloaded ? 503 : 500 }
      )
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
    console.error('[chat/route] помилка:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
