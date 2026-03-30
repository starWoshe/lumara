import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/lib/auth'
import { db } from '@lumara/database'
import { AGENT_PROMPTS, AGENT_TOKEN_LIMITS } from '@lumara/agents'
import { sendMessageSchema } from '@lumara/shared'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    // Формуємо контекст для Claude
    const systemPrompt = AGENT_PROMPTS[agentType]
    const tokenLimit = AGENT_TOKEN_LIMITS[agentType]

    const messages = (conversation.messages ?? []).map((m) => ({
      role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }))
    messages.push({ role: 'user', content })

    // Стрімінг відповіді від Claude
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: tokenLimit,
      system: systemPrompt,
      messages,
    })

    // Зберігаємо відповідь після завершення стріму
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text
              fullResponse += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Зберігаємо відповідь агента в БД
          await db.message.create({
            data: {
              conversationId: conversation!.id,
              role: 'ASSISTANT',
              content: fullResponse,
            },
          })

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: conversation!.id, done: true })}\n\n`))
          controller.close()
        } catch (streamError) {
          console.error('[chat/stream] помилка:', streamError)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(streamError) })}\n\n`))
          controller.close()
        }
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
