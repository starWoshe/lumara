import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/lib/auth'
import {
  AgentType,
  AGENT_MODELS,
  AGENT_TOKEN_LIMITS,
  getAgentInstagramPrompt,
} from '@lumara/agents'

export const maxDuration = 60

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY не встановлено')
  return new Anthropic({ apiKey })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const body = await req.json()
    const agentParam = String(body.agent || '').toUpperCase()
    if (!['LUNA', 'ARCAS', 'NUMI', 'UMBRA'].includes(agentParam)) {
      return NextResponse.json({ error: 'Невідомий агент' }, { status: 400 })
    }
    const agentType = agentParam as AgentType

    const prompt = getAgentInstagramPrompt(agentType)
    if (!prompt) {
      return NextResponse.json({ error: 'Промпт не знайдено' }, { status: 500 })
    }

    const topic = body.topic ? `Тема: ${body.topic}\n\n` : ''
    const fullPrompt = `${topic}${prompt}\n\nСтвори один готовий пост для Instagram українською мовою.`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: AGENT_MODELS[agentType],
      max_tokens: AGENT_TOKEN_LIMITS[agentType],
      system: 'Ти — професійний копірайтер для езотеричного бренду. Пиши яскраво, конкретно, без шаблонів.',
      messages: [{ role: 'user', content: fullPrompt }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json({ content: text })
  } catch (error) {
    console.error('[content/generate] помилка:', error)
    return NextResponse.json(
      { error: 'Помилка генерації контенту' },
      { status: 500 }
    )
  }
}
