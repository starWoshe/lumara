import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@lumara/database'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (typeof body.text === 'string') data.text = body.text.trim()
  if (typeof body.active === 'boolean') data.active = body.active
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder

  const item = await db.academyGossip.update({ where: { id: params.id }, data })
  return NextResponse.json(item)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await db.academyGossip.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
