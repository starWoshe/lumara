async function getTelegramGroups() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { groups: [], niches: [], error: 'Supabase не налаштовано' }
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/telegram_groups?select=*&order=last_activity_at.desc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        next: { revalidate: 60 },
      }
    )

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const rows: TelegramGroupRow[] = await res.json()
    const groups = rows.filter((r) => !r.is_niche)
    const niches = rows.filter((r) => r.is_niche)

    return { groups, niches, error: null }
  } catch (e) {
    return { groups: [], niches: [], error: String(e) }
  }
}

interface TelegramGroupRow {
  id: string
  external_id: string
  title: string | null
  username: string | null
  member_count: number | null
  keywords: string[] | null
  category: string | null
  is_niche: boolean
  last_activity_at: string | null
  created_at: string
}

export default async function GroupsPage() {
  const { groups, niches, error } = await getTelegramGroups()

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString('uk-UA')
  }

  const GroupTable = ({ rows, title, highlight }: { rows: TelegramGroupRow[]; title: string; highlight?: boolean }) => (
    <section className="mb-10">
      <h2 className={`text-xl font-semibold mb-4 ${highlight ? 'text-amber-400' : 'text-white'}`}>
        {title} <span className="text-gray-500 text-sm">({rows.length})</span>
      </h2>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Назва</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Учасники</th>
              <th className="px-4 py-3">Категорія</th>
              <th className="px-4 py-3">Ключові слова</th>
              <th className="px-4 py-3">Остання активність</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  Немає даних
                </td>
              </tr>
            )}
            {rows.map((g) => (
              <tr key={g.id} className="hover:bg-gray-900/50 transition">
                <td className="px-4 py-3 font-medium text-white">
                  {g.title || 'Без назви'}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {g.username ? `@${g.username}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {g.member_count ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      g.is_niche
                        ? 'bg-amber-900/40 text-amber-200'
                        : 'bg-purple-900/40 text-purple-200'
                    }`}
                  >
                    {g.category || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  <div className="flex flex-wrap gap-1">
                    {(g.keywords || []).slice(0, 6).map((kw) => (
                      <span
                        key={kw}
                        className="inline-block rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {formatDate(g.last_activity_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-400 mb-2">Групи Telegram</h1>
        <p className="text-gray-400 mb-8">
          Зібрані дані по групах для аналізу цільової аудиторії
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-800 p-4 text-red-200">
            ⚠️ {error}
          </div>
        )}

        <GroupTable rows={niches} title="🎯 Вузькі ніші" highlight />
        <GroupTable rows={groups} title="📂 Всі групи" />
      </div>
    </main>
  )
}
