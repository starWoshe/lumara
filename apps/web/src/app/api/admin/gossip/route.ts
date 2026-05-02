import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@lumara/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const items = await db.academyGossip.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const last = await db.academyGossip.findFirst({ orderBy: { sortOrder: 'desc' } })
  const item = await db.academyGossip.create({
    data: { text, active: true, sortOrder: (last?.sortOrder ?? 0) + 1 },
  })
  return NextResponse.json(item, { status: 201 })
}
