import { getSessionUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@lumara/database'

// Список всіх користувачів — тільки для ADMIN
export async function GET() {
  const session = await getSessionUser()

  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }

  const users = await db.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      createdAt: true,
      subscriptions: {
        select: { plan: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: {
        select: { conversations: true },
      },
      profile: {
        select: { acquisitionSource: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ users })
}
