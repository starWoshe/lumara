import { getSessionUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@lumara/database'

export async function GET() {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const agents = ['LUNA', 'ARCAS', 'NUMI', 'UMBRA'] as const
  const actionTypes = ['chat', 'post', 'monitor', 'video'] as const

  // Сьогодні — розбивка по магах
  const todayByAgent = await Promise.all(
    agents.map((agent) =>
      db.tokenUsage.aggregate({
        where: { agent, createdAt: { gte: todayStart } },
        _sum: { tokensTotal: true, costUsd: true },
      }).then((r) => ({ agent, tokens: r._sum.tokensTotal ?? 0, cost: r._sum.costUsd ?? 0 }))
    )
  )

  // Сьогодні — розбивка по типу
  const todayByType = await Promise.all(
    actionTypes.map((actionType) =>
      db.tokenUsage.aggregate({
        where: { actionType, createdAt: { gte: todayStart } },
        _sum: { tokensTotal: true, costUsd: true },
      }).then((r) => ({ actionType, tokens: r._sum.tokensTotal ?? 0, cost: r._sum.costUsd ?? 0 }))
    )
  )

  // За місяць — по днях (останні 30 днів)
  const monthlyRows = await db.$queryRaw<{ day: string; tokens: bigint; cost: number }[]>`
    SELECT
      TO_CHAR("created_at" AT TIME ZONE 'Europe/Kiev', 'YYYY-MM-DD') AS day,
      SUM("tokens_total")::bigint AS tokens,
      SUM("cost_usd") AS cost
    FROM "token_usage"
    WHERE "created_at" >= ${monthStart}
    GROUP BY day
    ORDER BY day ASC
  `

  const todayTokens = todayByAgent.reduce((s, r) => s + r.tokens, 0)
  const todayCost = todayByAgent.reduce((s, r) => s + r.cost, 0)

  // Прогноз: якщо місяць іде N днів, прогноз = витрати / N * кількість днів у місяці
  const daysElapsed = Math.max(1, new Date().getDate())
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const monthCost = monthlyRows.reduce((s, r) => s + r.cost, 0)
  const forecast = (monthCost / daysElapsed) * daysInMonth

  return NextResponse.json({
    today: {
      tokens: todayTokens,
      cost: todayCost,
      byAgent: todayByAgent,
      byType: todayByType,
    },
    month: {
      cost: monthCost,
      forecast,
      byDay: monthlyRows.map((r) => ({ day: r.day, tokens: Number(r.tokens), cost: r.cost })),
    },
  })
}
