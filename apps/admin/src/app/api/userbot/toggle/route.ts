import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase не налаштовано' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { mage, enabled } = body as { mage: string; enabled: boolean }

    if (!mage || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Невірні параметри' }, { status: 400 })
    }

    const key = `userbot_${mage.toLowerCase()}_enabled`

    const res = await fetch(`${supabaseUrl}/rest/v1/admin_settings?key=eq.${key}`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ value: String(enabled), updated_at: new Date().toISOString() }),
    })

    if (res.status === 404 || res.status === 204) {
      // Upsert через POST з merge-duplicates
      const upsert = await fetch(`${supabaseUrl}/rest/v1/admin_settings`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ key, value: String(enabled) }),
      })

      if (!upsert.ok) {
        const text = await upsert.text().catch(() => '')
        return NextResponse.json({ error: `Upsert failed: ${text}` }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, mage, enabled })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
