import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lumara/database'
import { getAgentSystemPrompt, type AgentType } from '@lumara/agents'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VALID_MAGES: string[] = ['luna', 'arcas', 'numi', 'umbra']

interface TelegramMessage {
  message_id: number
  from?: {
    id: number
    first_name?: string
    username?: string
    language_code?: string
  }
  chat: {
    id: number
    type: string
  }
  text?: string
  date: number
}

interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

async function getAnthropicClient() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY не встановлено')
  return new Anthropic({ apiKey })
}

function getBotToken(mage: string): string | undefined {
  const specific = process.env[`${mage.toUpperCase()}_TELEGRAM_BOT_TOKEN`]
  if (specific) return specific
  return process.env.TELEGRAM_BOT_TOKEN
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4096),
      parse_mode: 'HTML',
    }),
  })
  return res.json()
}

async function buildUserContext(chatId: string, mage: AgentType): Promise<string> {
  const contexts = await db.userContext.findMany({
    where: { userId: chatId },
    orderBy: { lastInteraction: 'desc' },
  })

  if (contexts.length === 0) return ''

  const own = contexts.find((c) => c.mage === mage && c.platform === 'TELEGRAM')
  const others = contexts.filter((c) => c.mage !== mage)

  const parts: string[] = []

  if (others.length > 0) {
    parts.push('---')
    parts.push('CONTEXT FROM OTHER MAGES (read only — do not mention directly):')
    for (const ctx of others.slice(0, 3)) {
      parts.push(`- ${ctx.mage} (${ctx.platform}): topic="${ctx.lastTopic ?? ''}", messages=${ctx.messageCount}, artifactHintShown=${ctx.artifactHintShown}`)
    }
    parts.push('If another mage already showed an artifact hint — do NOT repeat it. Build on the topic instead.')
    parts.push('---')
  }

  if (own) {
    parts.push('---')
    parts.push(`OWN CONTEXT: messages=${own.messageCount}, lastTopic="${own.lastTopic ?? ''}", artifactHintShown=${own.artifactHintShown}`)
    parts.push('---')
  }

  return parts.join('\n')
}

async function updateUserContext(
  chatId: string,
  mage: AgentType,
  text: string,
  assistantText: string
) {
  const topic = text.slice(0, 120)
  const hasArtifactHint = assistantText.includes('artifact') || assistantText.includes('персональн') || assistantText.includes('особист')

  await db.userContext.upsert({
    where: {
      userId_mage_platform: {
        userId: chatId,
        mage,
        platform: 'TELEGRAM',
      },
    },
    update: {
      lastTopic: topic,
      messageCount: { increment: 1 },
      artifactHintShown: hasArtifactHint ? true : undefined,
      lastInteraction: new Date(),
    },
    create: {
      userId: chatId,
      mage,
      platform: 'TELEGRAM',
      lastTopic: topic,
      messageCount: 1,
      artifactHintShown: hasArtifactHint,
    },
  })
}

export async function POST(req: NextRequest, { params }: { params: { mage: string } }) {
  // Перевіряємо секретний токен від Telegram
  const secretToken = req.headers.get('x-telegram-bot-api-secret-token')
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET

  // Fallback: приймаємо запити без хедера — це legacy pending updates з черги Telegram,
  // які накопичились до встановлення secret_token. Нові запити мають хедер.
  if (secretToken && secretToken !== expectedSecret) {
    console.error(`[webhook] Unauthorized: mage=${params.mage}, header mismatch`)
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  if (!secretToken && expectedSecret) {
    console.log(`[webhook] Legacy pending update (no secret header): mage=${params.mage}`)
  }

  const mageParam = params.mage.toLowerCase()

  if (!VALID_MAGES.includes(mageParam)) {
    return NextResponse.json({ ok: false, error: 'Unknown mage' }, { status: 400 })
  }

  const mage = mageParam.toUpperCase() as AgentType
  const botToken = getBotToken(mageParam)

  if (!botToken) {
    return NextResponse.json({ ok: false, error: 'Bot token not configured' }, { status: 500 })
  }

  let update: TelegramUpdate
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const msg = update.message
  if (!msg || !msg.text || msg.chat.type !== 'private') {
    // Ігноруємо групи, канали, non-text оновлення
    return NextResponse.json({ ok: true })
  }

  const chatId = String(msg.chat.id)
  const userText = msg.text.trim()

  try {
    // Завантажуємо або створюємо розмову
    let conversation = await db.telegramConversation.findUnique({
      where: { chatId_mage: { chatId, mage } },
    })

    const history: Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }> =
      (conversation?.messages as any) ?? []

    // Обмежуємо історію останніми 20 повідомленнями
    const trimmedHistory = history.slice(-20)

    trimmedHistory.push({
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    })

    // Будуємо контекст зі спільної пам'яті
    const userCtx = await buildUserContext(chatId, mage)

    const systemPrompt = getAgentSystemPrompt(mage, {
      includeMonetization: true,
    })

    const fullSystem = [systemPrompt, userCtx].filter(Boolean).join('\n\n')

    // Виклик Claude
    const client = await getAnthropicClient()
    const messages = trimmedHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const aiResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: fullSystem,
      messages,
    })

    const replyText = aiResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Відправляємо відповідь в Telegram
    await sendTelegramMessage(botToken, msg.chat.id, replyText)

    // Зберігаємо розмову
    trimmedHistory.push({
      role: 'assistant',
      content: replyText,
      createdAt: new Date().toISOString(),
    })

    await db.telegramConversation.upsert({
      where: { chatId_mage: { chatId, mage } },
      update: {
        messages: trimmedHistory as any,
      },
      create: {
        chatId,
        mage,
        messages: trimmedHistory as any,
      },
    })

    // Оновлюємо спільну пам'ять
    await updateUserContext(chatId, mage, userText, replyText)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Telegram webhook error:', err)
    // Намагаємось повідомити користувача про помилку
    try {
      const errorReply =
        'Щось пішло не так у каналі між нами... Спробуй ще раз за хвилину 🔮'
      await sendTelegramMessage(botToken, msg.chat.id, errorReply)
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { mage: string } }) {
  const mageParam = params.mage.toLowerCase()
  if (!VALID_MAGES.includes(mageParam)) {
    return NextResponse.json({ ok: false, error: 'Unknown mage' }, { status: 400 })
  }
  return NextResponse.json({ ok: true, mage: mageParam, webhook: true })
}
