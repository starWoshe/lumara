import { db } from '@lumara/database'
import { NextResponse } from 'next/server'

// Cron endpoint — підтримує Supabase активним (запускається автоматично через Vercel Cron)
export async function GET(request: Request) {
  // Перевіряємо секретний ключ щоб захистити від стороннього виклику
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Мінімальний запит — просто ping до БД
    await db.$queryRaw`SELECT 1`

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      message: 'Supabase is alive',
    })
  } catch (error) {

    return NextResponse.json({ ok: false, error: 'DB unreachable' }, { status: 500 })
  }
}
