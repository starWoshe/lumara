import Link from 'next/link'
import ToggleButton from './ToggleButton'

const MAGES = [
  { key: 'LUNA', name: 'LUNA', specialty: 'Астрологія' },
  { key: 'ARCAS', name: 'ARCAS', specialty: 'Таро / Оракул' },
  { key: 'NUMI', name: 'NUMI', specialty: 'Нумерологія' },
  { key: 'UMBRA', name: 'UMBRA', specialty: 'Езо-психологія' },
]

async function getUserbotData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { mages: [], logs: [], error: 'Supabase не налаштовано' }
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  try {
    // Статуси з admin_settings
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/admin_settings?key=like.userbot_%_enabled&select=key,value`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 0 },
      }
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
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 0 },
      }
    )
    const logsRows: UserbotLogRow[] = logsRes.ok ? await logsRes.json() : []

    // Групи
    const groupsRes = await fetch(
      `${supabaseUrl}/rest/v1/monitored_groups?select=assigned_mage,group_username,last_visited&is_active=eq.true`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 0 },
      }
    )
    const groupsRows: { assigned_mage: string; group_username: string; last_visited: string | null }[] =
      groupsRes.ok ? await groupsRes.json() : []

    const magesData = MAGES.map((m) => {
      const enabled = settingsMap.get(`userbot_${m.key.toLowerCase()}_enabled`) ?? true
      const mageLogs = logsRows.filter((l) => l.mage === m.key)
      const reactions = mageLogs.filter((l) => l.action === 'REACTION').length
      const messages = mageLogs.filter((l) => l.action === 'MESSAGE').length
      const groupsVisited = new Set(
        mageLogs.filter((l) => l.group_username).map((l) => l.group_username)
      ).size
      const mageGroups = groupsRows.filter((g) => g.assigned_mage === m.key)

      return {
        ...m,
        enabled,
        reactions,
        messages,
        groupsVisited,
        totalGroups: mageGroups.length,
      }
    })

    return {
      mages: magesData,
      logs: logsRows.slice(0, 20),
      error: null,
    }
  } catch (e) {
    return { mages: [], logs: [], error: String(e) }
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

export default async function UserbotPage() {
  const data = await getUserbotData()

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-400 mb-2">UserBot</h1>
            <p className="text-gray-400">Telegram-клієнти магів: прогрів та активний пошук</p>
          </div>
          <Link
            href="/"
            className="text-sm text-purple-400 hover:text-purple-300 transition"
          >
            ← Назад в адмінку
          </Link>
        </div>

        {data.error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-800 p-4 text-red-200">
            ⚠️ {data.error}
          </div>
        )}

        {/* Статус магів */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">🧙 Статус магів</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.mages.map((m) => (
              <div
                key={m.key}
                className="rounded-xl bg-gray-900 border border-gray-800 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-white">{m.name}</h3>
                  <ToggleButton mage={m.key} enabled={m.enabled} />
                </div>
                <p className="text-sm text-gray-400 mb-4">{m.specialty}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Режим:</span>
                    <span className="text-amber-300">
                      {m.enabled ? 'активний' : 'вимкнений'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Реакцій сьогодні:</span>
                    <span className="text-white">{m.reactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Повідомлень сьогодні:</span>
                    <span className="text-white">{m.messages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Груп відвідано:</span>
                    <span className="text-white">
                      {m.groupsVisited}/{m.totalGroups}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Логи */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">
            📋 Останні 20 дій
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Час</th>
                  <th className="px-4 py-3">Маг</th>
                  <th className="px-4 py-3">Дія</th>
                  <th className="px-4 py-3">Група</th>
                  <th className="px-4 py-3">Контекст</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Немає даних за сьогодні
                    </td>
                  </tr>
                )}
                {data.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-900/50 transition">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('uk-UA')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-purple-900/40 px-2.5 py-0.5 text-xs font-medium text-purple-200">
                        {log.mage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {log.group_username ? `@${log.group_username}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                      {log.message_preview || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    REACTION: 'bg-pink-900/40 text-pink-200',
    MESSAGE: 'bg-blue-900/40 text-blue-200',
    READ: 'bg-gray-800 text-gray-300',
    JOIN: 'bg-green-900/40 text-green-200',
    ERROR: 'bg-red-900/40 text-red-200',
  }
  const labels: Record<string, string> = {
    REACTION: 'Реакція',
    MESSAGE: 'Повідомлення',
    READ: 'Читання',
    JOIN: 'Вхід',
    ERROR: 'Помилка',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[action] || 'bg-gray-800 text-gray-300'
      }`}
    >
      {labels[action] || action}
    </span>
  )
}


