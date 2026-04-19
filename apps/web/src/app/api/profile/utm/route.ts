import { getSessionUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lumara/database'

// Зберігає UTM-джерело у профіль при першому вході
export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.id) return NextResponse.json({ ok: false }, { status: 401 })

  const { source } = await req.json()
  if (!source || typeof source !== 'string') return NextResponse.json({ ok: false }, { status: 400 })

  const sanitized = source.slice(0, 200)

  const existing = await db.profile.findUnique({ where: { userId: session.id } })

  if (!existing) {
    await db.profile.create({ data: { userId: session.id, acquisitionSource: sanitized } })
  } else if (!existing.acquisitionSource) {
    await db.profile.update({
      where: { userId: session.id },
      data: { acquisitionSource: sanitized },
    })
  }

  return NextResponse.json({ ok: true })
}
