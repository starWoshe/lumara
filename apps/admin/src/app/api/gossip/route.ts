import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lumara/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await db.academyGossip.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const last = await db.academyGossip.findFirst({ orderBy: { sortOrder: 'desc' } })
  const sortOrder = (last?.sortOrder ?? 0) + 1

  const item = await db.academyGossip.create({
    data: { text, active: true, sortOrder },
  })
  return NextResponse.json(item, { status: 201 })
}
