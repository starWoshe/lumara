import { NextResponse } from 'next/server'
import { db } from '@lumara/database'

// ТИМЧАСОВИЙ endpoint для діагностики — видалити після виправлення
export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Перевірка підключення до БД
  try {
    await db.$queryRaw`SELECT 1`
    results.db_connection = 'OK'
  } catch (e) {
    results.db_connection = `FAILED: ${String(e)}`
  }

  // 2. Кількість користувачів
  try {
    const count = await db.user.count()
    results.users_count = count
  } catch (e) {
    results.users_count = `FAILED: ${String(e)}`
  }

  // 3. Спроба створити тестового юзера
  try {
    const testUser = await db.user.upsert({
      where: { email: 'woshem68@gmail.com' },
      update: { role: 'ADMIN' },
      create: {
        email: 'woshem68@gmail.com',
        name: 'Admin',
        role: 'ADMIN',
      },
    })
    results.upsert = 'OK'
    results.user_id = testUser.id
    results.user_role = testUser.role
  } catch (e) {
    results.upsert = `FAILED: ${String(e)}`
  }

  return NextResponse.json(results)
}
