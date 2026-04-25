import { getSessionUser } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db } from '@lumara/database'
import { z } from 'zod'

const profileSchema = z.object({
  fullName:   z.string().max(200).optional().nullable(),
  gender:     z.string().max(50).optional().nullable(),
  birthDate:  z.string().optional().nullable(),
  birthTime:  z.string().optional().nullable(),
  birthPlace: z.string().max(200).optional().nullable(),
  goal:       z.string().max(500).optional().nullable(),
})

export async function GET() {
  const session = await getSessionUser()
  console.log('[profile GET] session:', session)
  if (!session?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await db.profile.findUnique({ where: { userId: session.id } })
  console.log('[profile GET] profile:', profile)
  return NextResponse.json(profile)
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionUser()
    console.log('[profile PATCH] session:', session)
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    console.log('[profile PATCH] body:', body)

    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      console.error('[profile PATCH] validation error:', issues)
      return NextResponse.json({ error: 'Validation error', details: issues }, { status: 400 })
    }
    const data = parsed.data

    // Нормалізуємо порожні рядки в null — користувачі можуть очищати поля
    const fullName   = data.fullName?.trim()  || null
    const gender     = data.gender?.trim()    || null
    const birthTime  = data.birthTime?.trim() || null
    const birthPlace = data.birthPlace?.trim()|| null
    const goal       = data.goal?.trim()      || null

    // birthDate валідуємо окремо, щоб уникнути Invalid Date
    let birthDate: Date | null = null
    const birthDateStr = data.birthDate?.trim()
    if (birthDateStr) {
      const d = new Date(birthDateStr)
      if (!isNaN(d.getTime())) {
        birthDate = d
      }
    }

    console.log('[profile PATCH] normalized:', { fullName, gender, birthDate, birthTime, birthPlace, goal })

    const profile = await db.profile.upsert({
      where: { userId: session.id },
      update: { fullName, gender, birthDate, birthTime, birthPlace, goal },
      create: {
        userId: session.id,
        fullName,
        gender,
        birthDate,
        birthTime,
        birthPlace,
        goal,
        language: 'uk',
        timezone: 'Europe/Kiev',
      },
    })

    console.log('[profile PATCH] saved:', profile)
    return NextResponse.json(profile)
  } catch (err: unknown) {
    console.error('[profile PATCH] помилка:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 })
  }
}
