import { db } from '@lumara/database'
import { NextResponse } from 'next/server'

// Vercel Cron endpoint — підтримує Supabase активним.
// Без авторизації, оскільки Vercel Cron не передає кастомні headers.
// Мінімальний запит SELECT 1 — не критично для безпеки.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      source: 'vercel-cron',
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'DB unreachable' },
      { status: 500 }
    )
  }
}
