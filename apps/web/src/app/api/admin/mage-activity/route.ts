import { getSessionUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@lumara/database'

// Активність магів: userbot_logs + outreach_responses
export async function GET() {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }

  const [userbotLogs, outreachResponses] = await Promise.all([
    db.userbotLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        mage: true,
        action: true,
        groupUsername: true,
        messagePreview: true,
        createdAt: true,
      },
    }),
    db.outreachResponse.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        agentType: true,
        platform: true,
        groupHandle: true,
        userHandle: true,
        responseText: true,
        createdAt: true,
      },
    }),
  ])

  const actionLabels: Record<string, string> = {
    REACTION: 'Реакція',
    MESSAGE: 'Повідомлення',
    READ: 'Читання',
    JOIN: 'Вхід',
    ERROR: 'Помилка',
  }

  const platformLabels: Record<string, string> = {
    TELEGRAM_GROUP: 'Telegram',
    INSTAGRAM_COMMENT: 'Instagram',
  }

  const items = [
    ...userbotLogs.map((log) => ({
      id: log.id,
      type: 'userbot' as const,
      date: log.createdAt.toISOString(),
      mage: log.mage,
      platform: 'Telegram',
      action: actionLabels[log.action] ?? log.action,
      username: log.groupUsername ?? '—',
      result: log.messagePreview ?? '—',
    })),
    ...outreachResponses.map((r) => ({
      id: r.id,
      type: 'outreach' as const,
      date: r.createdAt.toISOString(),
      mage: r.agentType,
      platform: platformLabels[r.platform] ?? r.platform,
      action: 'Відповідь',
      username: r.userHandle ?? r.groupHandle ?? '—',
      result: r.responseText.slice(0, 120),
    })),
  ]

  // Сортуємо за датою (найновіші перші)
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ items: items.slice(0, 200) })
}
