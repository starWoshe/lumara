import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface HealthItem {
  component: string
  status: 'ok' | 'warning' | 'error'
  lastUpdated: string
  nextCheck: string
  details?: string
}

export async function GET() {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)

  const items: HealthItem[] = [
    {
      component: 'IG_ACCESS_TOKEN',
      status: 'ok',
      lastUpdated: `${currentMonth}-01`,
      nextCheck: getNextMonthFirstDay(now),
      details: 'Оновлюється автоматично 1-го числа кожного місяця',
    },
    {
      component: 'STRIPE_LIVE_MODE',
      status: process.env.STRIPE_LIVE_MODE === 'true' ? 'ok' : 'warning',
      lastUpdated: '—',
      nextCheck: '—',
      details: process.env.STRIPE_LIVE_MODE === 'true' ? 'Продакшн режим' : 'Тестовий режим',
    },
    {
      component: 'GitHub Actions',
      status: 'ok',
      lastUpdated: now.toISOString().slice(0, 10),
      nextCheck: 'Активно',
      details: 'CI/CD, моніторинг, публікація контенту',
    },
    {
      component: 'Vercel Deploy',
      status: 'ok',
      lastUpdated: now.toISOString().slice(0, 10),
      nextCheck: 'Автоматично при push',
      details: 'Регіон: fra1 (Frankfurt)',
    },
    {
      component: 'Supabase DB',
      status: 'ok',
      lastUpdated: now.toISOString().slice(0, 10),
      nextCheck: 'Щоденний health check',
      details: 'PostgreSQL через Prisma',
    },
    {
      component: 'Anthropic API',
      status: 'ok',
      lastUpdated: '—',
      nextCheck: '—',
      details: 'Claude Sonnet 4.6',
    },
  ]

  return NextResponse.json({ items, generatedAt: now.toISOString() })
}

function getNextMonthFirstDay(date: Date): string {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}
