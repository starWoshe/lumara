import { createClient } from '@/lib/supabase/server'

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

  // Шукаємо по Supabase Auth UUID
  const { data: dbUser } = await supabase
    .from('users')
    .select('id, email, name, image, role')
    .eq('id', user.id)
    .single()

  if (dbUser) return dbUser as SessionUser

  // Fallback: шукаємо по email (якщо запис є зі старим UUID)
  const { data: dbUserByEmail } = await supabase
    .from('users')
    .select('id, email, name, image, role')
    .eq('email', user.email)
    .single()

  if (dbUserByEmail) return dbUserByEmail as SessionUser

  // Створюємо новий запис
  const { data: newUser } = await supabase
    .from('users')
    .insert({ id: user.id, email: user.email, name, image, role })
    .select('id, email, name, image, role')
    .single()

  if (newUser) {
    await supabase
      .from('profiles')
      .upsert({ user_id: newUser.id, language: 'uk', timezone: 'Europe/Kiev' }, { onConflict: 'user_id' })

    await supabase
      .from('activity_logs')
      .insert({ user_id: newUser.id, action: 'SIGN_IN', metadata: { provider: 'google' } })

    return newUser as SessionUser
  }

  // Якщо все заблоковано RLS — повертаємо з Supabase Auth напряму
  return { id: user.id, email: user.email, name, image, role }
}
