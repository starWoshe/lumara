import { getSessionUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@lumara/database'

export async function GET() {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }

  const agents = await db.agent.findMany({ select: { id: true, type: true } })
  const agentIdToType = Object.fromEntries(agents.map((a) => [a.id, a.type]))

  const convByAgent = await db.conversation.groupBy({
    by: ['agentId'],
    _count: { id: true },
    where: { deletedAt: null },
  })

  const conversationsByAgent: Record<string, number> = { LUNA: 0, ARCAS: 0, NUMI: 0, UMBRA: 0 }
  for (const row of convByAgent) {
    const type = agentIdToType[row.agentId]
    if (type) conversationsByAgent[type] = row._count.id
  }

  const [totalUsers, activatedUsers, convertedUsers, monetizationRows, reactivationStats] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { deletedAt: null, conversations: { some: { deletedAt: null } } } }),
    db.subscription.count({ where: { status: 'ACTIVE' } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT c.user_id
        FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        WHERE m.role = 'USER' AND c.deleted_at IS NULL
        GROUP BY c.user_id
        HAVING COUNT(m.id) >= 12
      ) sub
    `,
    // Статистика реактивації
    db.$queryRaw<{ sent: bigint; converted: bigint }[]>`
      SELECT
        COUNT(*)::bigint AS sent,
        COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN u.id END)::bigint AS converted
      FROM users u
      LEFT JOIN conversations c ON c.user_id = u.id AND c.deleted_at IS NULL
      LEFT JOIN messages m ON m.conversation_id = c.id AND m.role = 'USER' AND m.deleted_at IS NULL AND m.created_at > u.reactivation_sent_at
      WHERE u.reactivation_sent_at IS NOT NULL
        AND u.deleted_at IS NULL
    `,
  ])

  return NextResponse.json({
    conversationsByAgent,
    funnel: {
      registered: totalUsers,
      activated: activatedUsers,
      monetizationTrigger: Number(monetizationRows[0]?.count ?? 0),
      converted: convertedUsers,
    },
    reactivation: {
      sent: Number(reactivationStats[0]?.sent ?? 0),
      converted: Number(reactivationStats[0]?.converted ?? 0),
    },
  })
}
