import { getSessionUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lumara/database'

const ALLOWED_KEYS = ['daily_budget_usd', 'alert_yellow_tokens_per_hour', 'alert_red_tokens_per_hour']

export async function GET() {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }

  const rows = await db.adminSetting.findMany({ where: { key: { in: ALLOWED_KEYS } } })
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  // Defaults якщо ще не збережено
  return NextResponse.json({
    daily_budget_usd: settings['daily_budget_usd'] ?? '10',
    alert_yellow_tokens_per_hour: settings['alert_yellow_tokens_per_hour'] ?? '50000',
    alert_red_tokens_per_hour: settings['alert_red_tokens_per_hour'] ?? '200000',
  })
}

export async function PUT(req: NextRequest) {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }

  const body = await req.json()

  await Promise.all(
    ALLOWED_KEYS.filter((k) => body[k] !== undefined).map((key) =>
      db.adminSetting.upsert({
        where: { key },
        create: { key, value: String(body[key]) },
        update: { value: String(body[key]) },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
