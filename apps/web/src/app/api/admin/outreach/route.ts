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

  const [
    telegramToday,
    instagramToday,
    telegramByLang,
    instagramByLang,
    referralClicks,
  ] = await Promise.all([
    db.outreachResponse.count({
      where: { platform: 'TELEGRAM_GROUP', createdAt: { gte: todayStart } },
    }),
    db.outreachResponse.count({
      where: { platform: 'INSTAGRAM_COMMENT', createdAt: { gte: todayStart } },
    }),
    db.outreachResponse.groupBy({
      by: ['language'],
      where: { platform: 'TELEGRAM_GROUP', createdAt: { gte: todayStart } },
      _count: { id: true },
    }),
    db.outreachResponse.groupBy({
      by: ['language'],
      where: { platform: 'INSTAGRAM_COMMENT', createdAt: { gte: todayStart } },
      _count: { id: true },
    }),
    db.referralClick.count({
      where: {
        source: { in: ['telegram_group', 'instagram_comment'] },
        createdAt: { gte: todayStart },
      },
    }),
  ])

  const toLangMap = (rows: { language: string; _count: { id: number } }[]) => {
    const map: Record<string, number> = { UK: 0, RU: 0, EN: 0, DE: 0 }
    for (const row of rows) {
      map[row.language] = row._count.id
    }
    return map
  }

  return NextResponse.json({
    telegram: {
      total: telegramToday,
      byLanguage: toLangMap(telegramByLang),
    },
    instagram: {
      total: instagramToday,
      byLanguage: toLangMap(instagramByLang),
    },
    referralClicks,
  })
}
