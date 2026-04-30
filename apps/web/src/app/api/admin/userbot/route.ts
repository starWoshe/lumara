import { NextResponse } from 'next/server'

const MAGES = ['LUNA', 'ARCAS', 'NUMI', 'UMBRA']

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase не налаштовано' }, { status: 500 })
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  }

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString()

    // Статуси з admin_settings
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/admin_settings?key=like.userbot_%_enabled&select=key,value`,
      { headers }
    )
    const settingsRows: { key: string; value: string }[] = settingsRes.ok
      ? await settingsRes.json()
      : []
    const settingsMap = new Map(settingsRows.map((r) => [r.key, r.value === 'true']))

    // Логи за сьогодні
    const logsRes = await fetch(
      `${supabaseUrl}/rest/v1/userbot_logs?created_at=gte.${encodeURIComponent(
        todayIso
      )}&select=*,created_at&order=created_at.desc`,
      { headers }
    )
    const logsRows: UserbotLogRow[] = logsRes.ok ? await logsRes.json() : []

    // Групи
    const groupsRes = await fetch(
      `${supabaseUrl}/rest/v1/monitored_groups?select=assigned_mage,group_username,last_visited,is_active&is_active=eq.true`,
      { headers }
    )
    const groupsRows: { assigned_mage: string; group_username: string; last_visited: string | null }[] =
      groupsRes.ok ? await groupsRes.json() : []

    const magesData = MAGES.map((m) => {
      const enabled = settingsMap.get(`userbot_${m.toLowerCase()}_enabled`) ?? true
      const mageLogs = logsRows.filter((l) => l.mage === m)
      const reactions = mageLogs.filter((l) => l.action === 'REACTION').length
      const messages = mageLogs.filter((l) => l.action === 'MESSAGE').length
      const groupsVisited = new Set(
        mageLogs.filter((l) => l.group_username).map((l) => l.group_username)
      ).size
      const mageGroups = groupsRows.filter((g) => g.assigned_mage === m)

      return {
        key: m,
        name: m,
        enabled,
        reactions,
        messages,
        groupsVisited,
        totalGroups: mageGroups.length,
      }
    })

    return NextResponse.json({
      mages: magesData,
      logs: logsRows.slice(0, 20),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
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

    return NextResponse.json({ success: true, mage, enabled })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

interface UserbotLogRow {
  id: string
  mage: string
  action: string
  group_username: string | null
  message_preview: string | null
  created_at: string
}
