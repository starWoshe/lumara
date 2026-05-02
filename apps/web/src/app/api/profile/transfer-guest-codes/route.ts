import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { db } from '@lumara/database'

const VALID_CODES = new Set([
  'LUNA:wolf_vision',
  'ARCAS:shaman_card',
  'NUMI:cycle_nine',
  'UMBRA:beekeeper_shadow',
])

export async function POST(req: NextRequest) {
  const session = await getSessionUser()
  if (!session?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const revealedCodes: unknown[] = Array.isArray(body?.revealedCodes) ? body.revealedCodes : []

  const validCodes = revealedCodes.filter(
    (c): c is string => typeof c === 'string' && VALID_CODES.has(c)
  )
  if (validCodes.length === 0) {
    return NextResponse.json({ ok: true })
  }

  const profile = await db.profile.findUnique({ where: { userId: session.id } })
  if (!profile) return NextResponse.json({ ok: true })

  const current = (profile.academyRevealedBy as string[]) ?? []
  const merged = [...new Set([...current, ...validCodes])]

  if (merged.length > current.length) {
    await db.profile.update({
      where: { userId: session.id },
      data: { academyRevealedBy: merged },
    })
  }

  return NextResponse.json({ ok: true })
}
