import { createClient } from '@/lib/supabase/server'
import { db } from '@lumara/database'
import { getSessionFromStore, setSessionInStore } from './session-store'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'woshem68@gmail.com'

export type SessionUser = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cached = getSessionFromStore()
  if (cached !== undefined) return cached
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    setSessionInStore(null)
    return null
  }

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
    // Шукаємо спочатку по id (Supabase Auth UUID) — надійніше при зміні email
    let dbUser = await db.user.findUnique({ where: { id: user.id } })

    // Якщо не знайшли по id — шукаємо по email (для сумісності)
    if (!dbUser) {
      dbUser = await db.user.findFirst({ where: { email: user.email } })
    }

    if (dbUser) {
      // Оновлюємо email у БД, якщо він змінився в Supabase Auth
      if (dbUser.email !== user.email) {
        dbUser = await db.user.update({
          where: { id: dbUser.id },
          data: { email: user.email },
        })
      }

      // Адміністратор завжди має роль ADMIN, навіть якщо в БД записано інакше
      const effectiveRole = dbUser.role === 'ADMIN' || isAdmin ? 'ADMIN' : 'USER'
      const result = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        role: effectiveRole,
      }
      setSessionInStore(result)
      return result
    }

    // Юзер не існує — створюємо з Supabase Auth UUID
    const newUser = await db.user.create({
      data: { id: user.id, email: user.email, name, image, role },
    })
    await db.profile.upsert({
      where: { userId: newUser.id },
      update: {},
      create: { userId: newUser.id, language: 'uk', timezone: 'Europe/Kiev', academyDisclosureLevel: 1 },
    })
    const result = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      image: newUser.image,
      role: newUser.role,
    }
    setSessionInStore(result)
    return result
  } catch (err) {

    // Якщо create впав — спробуємо знайти користувача ще раз
    const fallbackUser = await db.user.findUnique({ where: { id: user.id } })
      .catch(() => null)
      ?? await db.user.findFirst({ where: { email: user.email } }).catch(() => null)
    if (fallbackUser) {
      const effectiveRole = fallbackUser.role === 'ADMIN' || isAdmin ? 'ADMIN' : 'USER'
      const result = {
        id: fallbackUser.id,
        email: fallbackUser.email,
        name: fallbackUser.name,
        image: fallbackUser.image,
        role: effectiveRole,
      }
      setSessionInStore(result)
      return result
    }
    // Останній fallback — повертаємо Supabase Auth id (може не існувати в БД)
    const fallbackResult = { id: user.id, email: user.email, name, image, role }
    setSessionInStore(fallbackResult)
    return fallbackResult
  }
}
