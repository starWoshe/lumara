import { createClient } from '@/lib/supabase/server'
import { db } from '@lumara/database'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'

export type SessionUser = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) return null

  const name =
    (user.user_metadata?.full_name as string | undefined)
    ?? (user.user_metadata?.name as string | undefined)
    ?? null
  const image =
    (user.user_metadata?.avatar_url as string | undefined)
    ?? (user.user_metadata?.picture as string | undefined)
    ?? null
  const isAdmin = user.email === ADMIN_EMAIL
  const role = isAdmin ? 'ADMIN' : 'USER'

  try {
    // Шукаємо по email — Prisma використовує прямий DB connection, минає RLS
    const dbUser = await db.user.findFirst({ where: { email: user.email } })
    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role,
      }
    }

    // Юзер не існує — створюємо з Supabase Auth UUID
    const newUser = await db.user.create({
      data: { id: user.id, email: user.email, name, image, role },
    })
    await db.profile.upsert({
      where: { userId: newUser.id },
      update: {},
      create: { userId: newUser.id, language: 'uk', timezone: 'Europe/Kiev' },
    })
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      image: newUser.image,
      role: newUser.role,
    }
  } catch {
    // Fallback — з Supabase Auth напряму
    return { id: user.id, email: user.email, name, image, role }
  }
}
