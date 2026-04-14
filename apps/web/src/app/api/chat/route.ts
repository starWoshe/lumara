import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/lib/auth'
import { db } from '@lumara/database'
import { AGENT_PROMPTS, AGENT_TOKEN_LIMITS } from '@lumara/agents'
import { sendMessageSchema } from '@lumara/shared'
import { FREE_MESSAGES_LIMIT, PLANS } from '@/lib/stripe'

export const maxDuration = 60

// Ліниве створення клієнта — уникає проблем при відсутньому ключі під час збірки
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY не встановлено')
  return new Anthropic({ apiKey })
}

// Retry з exponential backoff для помилки 529 (overloaded)
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
      const isOverloaded =
        err instanceof Anthropic.APIError && (err.status === 529 || err.status === 503)
      if (!isOverloaded || attempt === maxRetries) throw err
      const delay = baseDelayMs * 2 ** attempt + Math.random() * 500
      console.warn(`[chat/route] Anthropic перевантажений (529), спроба ${attempt + 1}/${maxRetries}, затримка ${Math.round(delay)}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

export async function POST(req: NextRequest) {
  try {
    // Перевірка авторизації
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    // Валідація вхідних даних
    const body = await req.json()
    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Невірні дані', details: parsed.error.flatten() }, { status: 400 })
    }

    const { agentType, content, conversationId } = parsed.data

    // Переконуємось що userId є (може бути відсутній якщо JWT callback не спрацював)
    const userId = session.user.id
    if (!userId) {
      console.error('[chat/route] userId відсутній в session:', JSON.stringify(session))
      return NextResponse.json({ error: 'Сесія пошкоджена, увійдіть знову' }, { status: 401 })
    }

    // Перевірка ліміту повідомлень по плану
    const subscription = await db.subscription.findFirst({ where: { userId } })
    const plan = subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'
      ? subscription.plan
      : 'FREE'

    if (plan === 'FREE') {
      // Рахуємо всі повідомлення USER цього користувача за весь час
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
      // Рахуємо повідомлення за поточний платіжний період
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
    // PRO і ELITE — безліміт, перевірка не потрібна

    // Вибір моделі залежно від плану
    const aiModel = plan === 'ELITE' ? 'claude-opus-4-6' : 'claude-sonnet-4-6'

    // Знаходимо або створюємо агента в БД
    const agent = await db.agent.findUnique({ where: { type: agentType } })
    if (!agent) {
      return NextResponse.json({ error: 'Агент не знайдено' }, { status: 404 })
    }

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

    // Підвантажуємо профіль користувача
    const profile = await db.profile.findUnique({ where: { userId } })

    // Формуємо контекст для Claude
    const basePrompt = AGENT_PROMPTS[agentType]
    const tokenLimit = AGENT_TOKEN_LIMITS[agentType]

    // Додаємо дані профілю до системного промпту
    const parts: string[] = []
    if (session.user.name) parts.push(`Ім'я: ${session.user.name}`)
    if (profile?.birthDate) {
      const d = new Date(profile.birthDate)
      parts.push(`Дата народження: ${d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}`)
    }
    if (profile?.birthTime) parts.push(`Час народження: ${profile.birthTime}`)
    if (profile?.birthPlace) parts.push(`Місце народження: ${profile.birthPlace}`)

    const profileContext = parts.length > 0
      ? `\n\n---\nПЕРСОНАЛЬНІ ДАНІ КОРИСТУВАЧА (використовуй їх в аналізі без зайвих запитів — ці дані вже відомі):\n${parts.join('\n')}\n---`
      : ''

    const systemPrompt = basePrompt + profileContext

    const messages = (conversation.messages ?? []).map((m) => ({
      role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))
    messages.push({ role: 'user', content })

    const anthropic = getAnthropicClient()

    // Збираємо повну відповідь з retry для 529 overloaded.
    // Використовуємо create() замість stream() — так помилка 529 кидається одразу,
    // а не під час читання стріму, що дозволяє retry відпрацювати до початку стріму клієнту.
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
    } catch (apiErr) {
      const isOverloaded = apiErr instanceof Anthropic.APIError && (apiErr.status === 529 || apiErr.status === 503)
      console.error('[chat/route] API помилка після всіх спроб:', apiErr)
      return NextResponse.json(
        {
          error: isOverloaded ? 'OVERLOADED' : 'API_ERROR',
          message: isOverloaded
            ? 'Сервіс тимчасово перевантажений. Спробуйте через хвилину.'
            : 'Помилка підключення до AI. Спробуйте ще раз.',
        },
        { status: isOverloaded ? 503 : 500 }
      )
    }

    // Зберігаємо відповідь агента в БД
    await db.message.create({
      data: {
        conversationId: conversation!.id,
        role: 'ASSISTANT',
        content: responseText,
      },
    })

    // Симулюємо SSE-стрім для сумісності з клієнтом
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        // Надсилаємо текст одним чанком (без streaming затримок)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: responseText })}\n\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: conversation!.id, done: true })}\n\n`))
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
  } catch (error) {
    console.error('[chat/route] помилка:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
