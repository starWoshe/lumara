import { NextResponse } from 'next/server'
import { db } from '@lumara/database'

// Типи днів публікації
 type AcademyDay = 'monday' | 'wednesday' | 'friday' | 'sunday'

// Конфігурація магів
const MAGES = [
  {
    key: 'LUNA',
    name: 'LUNA',
    title: 'Астролог академії LUMARA',
    description: 'Вона бачить те що зірки говорять саме тобі',
    channel: '@luna_lumara',
    chatPath: 'luna',
    emoji: '🌙',
    specialty: 'астрологія',
  },
  {
    key: 'ARCAS',
    name: 'ARCAS',
    title: 'Провідник Таро і Оракулу LUMARA',
    description: 'Він читає символи які ти ще не бачиш',
    channel: '@arcas_lumara',
    chatPath: 'arcas',
    emoji: '🃏',
    specialty: 'таро',
  },
  {
    key: 'NUMI',
    name: 'NUMI',
    title: 'Нумеролог академії LUMARA',
    description: 'Вона розрахує код який керує твоїм шляхом',
    channel: '@numi_lumara',
    chatPath: 'numi',
    emoji: '🔢',
    specialty: 'нумерологія',
  },
  {
    key: 'UMBRA',
    name: 'UMBRA',
    title: 'Езо-психолог академії LUMARA',
    description: 'Вона досліджує те що приховано за завісою',
    channel: '@umbra_lumara',
    chatPath: 'umbra',
    emoji: '🧠',
    specialty: 'езо-психологія',
  },
]

const ACADEMY_CHANNEL_ID = process.env.ACADEMY_TELEGRAM_CHANNEL_ID || '@lumara_academy'
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

// Отримати номер тижня (0-3) для ротації
function getWeekRotation(): number {
  const now = new Date()
  const start = new Date(Date.UTC(2026, 0, 5)) // Понеділок 5 січня 2026 — anchor
  const diff = now.getTime() - start.getTime()
  const weeks = Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
  return ((weeks % 4) + 4) % 4 // гарантовано додатнє
}

async function sendTelegramMessage(text: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN не налаштовано')
  }

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ACADEMY_CHANNEL_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telegram API error: ${err}`)
  }
}

// Генерація через Claude для динамічних постів
async function generateWithClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY не налаштовано')
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error: ${err}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ПОНЕДІЛОК — Маг тижня
async function postMonday(): Promise<string> {
  const week = getWeekRotation()
  const mage = MAGES[week]
  const utm = 'utm_source=telegram&utm_medium=academy_monday'

  const text = `${mage.emoji} Цього тижня з тобою — ${mage.name}
${mage.title}.
${mage.description}.

📲 Її канал: ${mage.channel}
💬 Особисто: lumara.fyi/chat/${mage.chatPath}?${utm}
Перші 15 повідомлень безкоштовно ✨`

  await sendTelegramMessage(text)
  return `Маг тижня: ${mage.name}`
}

// СЕРЕДА — Крос-промо між магами
async function postWednesday(): Promise<string> {
  const week = getWeekRotation()
  const recommender = MAGES[week]
  const recommended = MAGES[(week + 1) % 4]

  const reasonMap: Record<string, string> = {
    LUNA: 'вона побачила те що я пропустив',
    ARCAS: 'він розклав карти і я зрозумів те що не бачив раніше',
    NUMI: 'вона розрахувала момент який я відчував інтуїтивно',
    UMBRA: 'вона показала тінь яку я не помічав',
  }

  const text = `${recommended.emoji} Сьогодні я — ${recommender.name}.
Порадився з ${recommended.name} — ${reasonMap[recommended.key]}.
Іноді ${recommended.specialty} говорить те що ${recommender.specialty} мовчить.

→ ${recommended.channel}`

  await sendTelegramMessage(text)
  return `Крос-промо: ${recommender.name} → ${recommended.name}`
}

// П'ЯТНИЦЯ — Дайджест тижня
async function postFriday(): Promise<string> {
  const utm = 'utm_source=telegram&utm_medium=academy_friday'

  // Спробуємо отримати останні публікації з ContentQueue
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  let digestText = ''

  try {
    const items = await db.contentQueue.findMany({
      where: {
        platform: 'TELEGRAM',
        status: 'PUBLISHED',
        publishedAt: { gte: weekAgo },
      },
      orderBy: { publishedAt: 'desc' },
    })

    const hasAllMages = MAGES.every(m => items.some(i => i.agentType === m.key))

    if (items.length >= 4 && hasAllMages) {
      const summaries = MAGES.map(mage => {
        const item = items.find(c => c.agentType === mage.key)
        const snippet = item ? extractSentences(item.content, 2) : `${mage.description}.`
        return `${mage.emoji} ${mage.name}: ${snippet} → ${mage.channel}`
      }).join('\n')

      digestText = `✦ Найкраще від магів цього тижня:\n\n${summaries}\n\nПочинай безкоштовно → lumara.fyi?${utm}`
    }
  } catch {
    // Ігноруємо — перейдемо до AI генерації
  }

  if (!digestText) {
    const prompt = `Ти — редактор LUMARA Academy. Напиши короткий дайджест тижня для Telegram-каналу.

Напиши по 1-2 речення для кожного мага (українською, без хештегів):
- 🌙 LUNA (астрологія)
- 🃏 ARCAS (таро)
- 🔢 NUMI (нумерологія)
- 🧠 UMBRA (езо-психологія)

Формат:
✦ Найкраще від магів цього тижня:
🌙 LUNA: [2 речення] → @luna_lumara
🃏 ARCAS: [2 речення] → @arcas_lumara
🔢 NUMI: [2 речення] → @numi_lumara
🧠 UMBRA: [2 речення] → @umbra_lumara

Починай безкоштовно → lumara.fyi?utm_source=telegram&utm_medium=academy_friday`

    digestText = await generateWithClaude(prompt)
  }

  await sendTelegramMessage(digestText)
  return 'Дайджест тижня опубліковано'
}

// НЕДІЛЯ — Анонс тижня
async function postSunday(): Promise<string> {
  const prompt = `Ти — редактор LUMARA Academy. Напиши недіельний анонс наступного тижня для Telegram-каналу.

Структура (українською, без хештегів):
◐ Новий тиждень в LUMARA Academy.
Що чекає тебе:
🌙 LUNA розкаже про [конкретна тема в астрології — транзит, ретроградна планета, новий місяць тощо]
🃏 ARCAS витягне [конкретна тема в таро — карта, розклад, порада]
🔢 NUMI розрахує [конкретна тема в нумерології — енергія дати, число дня, матриця]
🧠 UMBRA дослідить [конкретна тема в езо-психології — архетип, тінь, практика]

Всі провідники чекають тебе →
lumara.fyi?utm_source=telegram&utm_medium=academy_sunday

Будь конкретним — не абстрактні "важливі події", а реальні теми які актуальні.`

  const text = await generateWithClaude(prompt)
  await sendTelegramMessage(text)
  return 'Анонс тижня опубліковано'
}

function extractSentences(text: string, count: number): string {
  const cleaned = text
    .replace(/#[\wа-яіїєґ_]+/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[\n\r]+/g, ' ')
    .trim()

  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.length > 10)
  return sentences.slice(0, count).join(' ') || cleaned.slice(0, 120) + '...'
}

// GET handler для Cron
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const day = searchParams.get('day') as AcademyDay | null

  if (!day || !['monday', 'wednesday', 'friday', 'sunday'].includes(day)) {
    return NextResponse.json(
      { error: 'Invalid day. Expected: monday, wednesday, friday, sunday' },
      { status: 400 }
    )
  }

  try {
    let result: string
    switch (day) {
      case 'monday':
        result = await postMonday()
        break
      case 'wednesday':
        result = await postWednesday()
        break
      case 'friday':
        result = await postFriday()
        break
      case 'sunday':
        result = await postSunday()
        break
    }

    return NextResponse.json({ ok: true, day, result, timestamp: new Date().toISOString() })
  } catch (error) {

    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
