import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()

  // IG_ACCESS_TOKEN — читаємо дату з env або вважаємо що оновлювалась за розкладом (1-го числа)
  const igTokenStatus = (() => {
    const tokenExists = !!process.env.IG_ACCESS_TOKEN
    if (!tokenExists) return { status: 'red', lastUpdated: null, nextUpdate: null }

    // Останнє оновлення: 1-го числа поточного або минулого місяця
    const lastFirst = new Date(now.getFullYear(), now.getMonth(), 1)
    if (lastFirst > now) lastFirst.setMonth(lastFirst.getMonth() - 1)

    const nextFirst = new Date(lastFirst)
    nextFirst.setMonth(nextFirst.getMonth() + 1)

    const daysUntilExpiry = Math.floor((nextFirst.getTime() - now.getTime()) / 86400000) + 30
    const status = daysUntilExpiry > 14 ? 'green' : daysUntilExpiry > 7 ? 'yellow' : 'red'

    return {
      status,
      lastUpdated: lastFirst.toISOString().split('T')[0],
      nextUpdate: nextFirst.toISOString().split('T')[0],
    }
  })()

  // STRIPE_LIVE_MODE
  const stripeLiveMode = process.env.STRIPE_LIVE_MODE === 'true'
  const stripeStatus = {
    status: stripeLiveMode ? 'green' : 'yellow',
    lastUpdated: null,
    nextUpdate: null,
  }

  // Vercel Deploy — перевіряємо через env змінну VERCEL_ENV
  const vercelEnv = process.env.VERCEL_ENV ?? 'unknown'
  const vercelStatus = {
    status: vercelEnv === 'production' ? 'green' : vercelEnv === 'preview' ? 'yellow' : 'green',
    lastUpdated: null,
    nextUpdate: null,
  }

  // Anthropic API key
  const anthropicStatus = {
    status: process.env.ANTHROPIC_API_KEY ? 'green' : 'red',
    lastUpdated: null,
    nextUpdate: null,
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    checks: [
      { id: 'ig_token',   label: 'IG_ACCESS_TOKEN',  ...igTokenStatus },
      { id: 'stripe',     label: 'STRIPE_LIVE_MODE',  ...stripeStatus },
      { id: 'anthropic',  label: 'ANTHROPIC_API_KEY', ...anthropicStatus },
      { id: 'vercel',     label: 'Vercel Deploy',      ...vercelStatus },
    ],
  })
}
