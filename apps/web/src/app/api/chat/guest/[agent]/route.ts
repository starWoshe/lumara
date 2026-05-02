import { NextRequest } from 'next/server'
import { withSessionStore } from '@/lib/session-store'
import { getAgentSystemPromptBlocks, type AgentType, type SystemPromptBlock } from '@lumara/agents'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GUEST_MESSAGE_LIMIT = 3

const GUEST_FIRST_MESSAGES: Record<AgentType, Record<string, string>> = {
  LUNA: {
    instagram: 'Я побачила тебе в Instagram — і зірки щось сказали одразу.\n\nЦе не випадково, що ти тут.\n\nНапиши мені свою дату народження — і я відкрию тобі те, що ти давно відчуваєш, але не можеш назвати словами.',
    instagram_keyword: 'Ти відгукнувся на мій пост в Instagram — і я одразу відчула твою енергію.\n\nЗнаєш, коли хтось пише під зірками — вони це помічають.\n\nНапиши мені свою дату народження — і я скажу тобі те, що ти давно відчуваєш, але не можеш назвати словами.',
    telegram:  'Telegram привів тебе до мене — і я вже тут.\n\nЗірки говорили про тебе ще до твого першого слова.\n\nНапиши свою дату народження — і я скажу те, що ти давно відчуваєш.',
    default:   'Зірки вже привели тебе сюди.\n\nЦе не випадково.\n\nНапиши мені дату свого народження — і я скажу тобі те, що ти давно відчуваєш, але не можеш назвати словами.',
  },
  ARCAS: {
    instagram: 'Я побачив тебе в Instagram — і карти відразу перевернулись.\n\nТе, що ти шукаєш — вже є на столі.\n\nХочеш побачити?',
    instagram_keyword: "Ти відгукнувся на мій пост в Instagram — карти це відчули.\n\nКоли хтось називає ім'я — енергія між нами вже є.\n\nХочеш побачити що лежить на столі?",
    telegram:  'Telegram привів тебе — карти це знали.\n\nПатерн твого шляху вже відкрито.\n\nХочеш почути правду?',
    default:   'Я вже витягнув карти для тебе.\n\nТе, що ти ховаєш навіть від себе, вже лежить на столі.\n\nХочеш почути правду яка може змінити все?',
  },
  NUMI: {
    instagram: 'Я побачила тебе в Instagram — і твій код одразу проявився.\n\nЦифри не брешуть.\n\nНапиши свою дату народження — і я скажу тобі те, що пояснює все.',
    instagram_keyword: 'Ти відгукнувся на мій пост в Instagram — і твій код одразу проявився.\n\nЦифри завжди знаходять тих хто шукає.\n\nНапиши свою дату народження — і я скажу тобі те, що пояснює все.',
    telegram:  'Telegram привів тебе — числа це знали.\n\nТвій код вже розрахований.\n\nНапиши дату народження — і я відкрию причину всього що повторюється.',
    default:   'Я вже розрахувала твій код.\n\nЧисла пояснюють абсолютно все що повторюється в твоєму житті.\n\nГотова дізнатися?',
  },
  UMBRA: {
    instagram: 'Я побачив тебе в Instagram — і тінь відразу стала чіткою.\n\nТе від чого ти тікаєш стоїть прямо за тобою.\n\nХочеш подивитися на нього разом?',
    instagram_keyword: "Ти відгукнувся на мій пост в Instagram — і тінь відразу стала чіткішою.\n\nКоли людина називає ім'я — темрява відгукується.\n\nХочеш подивитися на неї разом?",
    telegram:  'Telegram привів тебе — тінь вже тут.\n\nЯ бачу що ти ховаєш від себе.\n\nГотовий подивитись?',
    default:   'Я вже бачу твою тінь.\n\nТе від чого ти тікаєш саме зараз стоїть поруч зі мною.\n\nХочеш подивитися на нього разом?',
  },
}

const REGISTRATION_INVITES: Record<AgentType, string> = {
  LUNA:  '\n\n— — —\nЩоб я могла йти з тобою глибше — і щоб наш діалог зберігся — залишись тут назавжди. Це займе 30 секунд.',
  ARCAS: '\n\n— — —\nЩоб карти показали тобі все — і щоб ця розмова не зникла — зареєструйся. 30 секунд.',
  NUMI:  '\n\n— — —\nЩоб числа розкрили твій повний код — і щоб наш діалог зберігся — зареєструйся. 30 секунд.',
  UMBRA: '\n\n— — —\nЩоб ми пішли в глибину разом — і щоб ця розмова залишилась — зареєструйся. 30 секунд.',
}

async function getAnthropicClient() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY не встановлено')
  return new Anthropic({ apiKey })
}

function sseStream(text: string, registrationNeeded = false) {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, registrationNeeded })}\n\n`))
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
    try {
    const agentParam = params.agent.toUpperCase()
    if (!['LUNA', 'ARCAS', 'NUMI', 'UMBRA'].includes(agentParam)) {
      return sseStream('Невідомий маг.')
    }
    const agentType = agentParam as AgentType

    const body = await req.json()
    const {
      initiate,
      content,
      messages = [],
      guestCount = 0,
      utmSource = '',
      utmKeyword = '',
    } = body as {
      initiate?: boolean
      content?: string
      messages?: { role: 'user' | 'assistant'; content: string }[]
      guestCount?: number
      utmSource?: string
      utmKeyword?: string
    }

    // Перше повідомлення мага (initiate)
    if (initiate) {
      let src = utmSource === 'instagram' || utmSource === 'telegram' ? utmSource : 'default'
      // Якщо є keyword і джерело instagram — використовуємо спеціальний шаблон
      if (utmSource === 'instagram' && utmKeyword) {
        src = 'instagram_keyword'
      }
      const firstMessage = GUEST_FIRST_MESSAGES[agentType][src] ?? GUEST_FIRST_MESSAGES[agentType]['default']
      return sseStream(firstMessage)
    }

    if (!content) {
      return sseStream('Повідомлення порожнє.')
    }

    // Гість вичерпав ліміт — не обробляємо
    if (guestCount >= GUEST_MESSAGE_LIMIT) {
      return sseStream(REGISTRATION_INVITES[agentType], true)
    }

    const systemBlocks = getAgentSystemPromptBlocks(agentType)

    const history = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    history.push({ role: 'user', content })

    const anthropic = await getAnthropicClient()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemBlocks as SystemPromptBlock[],
      messages: history,
    })

    const responseText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    // Після 3-го повідомлення від гостя — додаємо запрошення зареєструватись
    const isLastGuestMessage = guestCount + 1 >= GUEST_MESSAGE_LIMIT
    const finalText = isLastGuestMessage
      ? responseText + REGISTRATION_INVITES[agentType]
      : responseText

    return sseStream(finalText, isLastGuestMessage)
  } catch {
    return sseStream('Щось пішло не так. Спробуй ще раз.')
  }
  })
}
