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

  if (!session?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await db.profile.findUnique({ where: { userId: session.id } })

  return NextResponse.json(profile)
}

export async function PATCH(req: Request) {
  try {
    const session = await getSessionUser()

    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()


    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')

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



    // Гарантуємо, що користувач існує в БД (fixes Foreign key constraint)
    const existingUser = await db.user.findUnique({ where: { id: session.id } })
    if (!existingUser) {

      try {
        await db.user.create({
          data: {
            id: session.id,
            email: session.email,
            name: session.name,
            image: session.image,
            role: session.role === 'ADMIN' ? 'ADMIN' : 'USER',
          },
        })
      } catch (userErr) {

      }
    }

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


    return NextResponse.json(profile)
  } catch (err: unknown) {

    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 })
  }
}
