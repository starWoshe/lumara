import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Health · LUMARA Admin',
}

interface HealthItem {
  component: string
  status: 'ok' | 'warning' | 'error'
  lastUpdated: string
  nextCheck: string
  details?: string
}

async function getHealthData(): Promise<{ items: HealthItem[]; generatedAt: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/api/health`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    return {
      items: [],
      generatedAt: new Date().toISOString(),
    }
  }
  return res.json()
}

function StatusBadge({ status }: { status: HealthItem['status'] }) {
  const map = {
    ok: { emoji: '✅', label: 'OK', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    warning: { emoji: '⚠️', label: 'Увага', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    error: { emoji: '🔴', label: 'Збій', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.color}`}>
      {s.emoji} {s.label}
    </span>
  )
}

export default async function HealthPage() {
  const data = await getHealthData()

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-400 mb-2">Статус системи</h1>
        <p className="text-gray-400 mb-8">
          Останнє оновлення: {new Date(data.generatedAt).toLocaleString('uk-UA')}
        </p>

        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/80 border-b border-gray-800">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-400 uppercase tracking-wider">Статус</th>
                <th className="text-left px-6 py-3 font-medium text-gray-400 uppercase tracking-wider">Компонент</th>
                <th className="text-left px-6 py-3 font-medium text-gray-400 uppercase tracking-wider">Останнє оновлення</th>
                <th className="text-left px-6 py-3 font-medium text-gray-400 uppercase tracking-wider">Наступне</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data.items.map((item) => (
                <tr key={item.component} className="hover:bg-gray-900/40 transition">
                  <td className="px-6 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{item.component}</div>
                    {item.details && (
                      <div className="text-xs text-gray-500 mt-0.5">{item.details}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-300">{item.lastUpdated}</td>
                  <td className="px-6 py-4 text-gray-300">{item.nextCheck}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.items.length === 0 && (
          <div className="mt-8 rounded-lg bg-red-900/30 border border-red-800 p-4 text-red-200">
            ⚠️ Не вдалося отримати дані статусу. Перевір API endpoint /api/health.
          </div>
        )}
      </div>
    </main>
  )
}
