import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { db } from '@lumara/database'

// Лог активності користувачів — тільки для ADMIN
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200)
  const userId = searchParams.get('userId')

  const logs = await db.activityLog.findMany({
    where: userId ? { userId } : undefined,
    include: {
      user: {
        select: { id: true, email: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ logs })
}
