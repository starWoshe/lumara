'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type StatusColor = 'green' | 'yellow' | 'red'

interface HealthCheck {
  id: string
  label: string
  status: StatusColor
  label_value?: string
  lastUpdated: string | null
  nextUpdate: string | null
}

interface HealthData {
  timestamp: string
  checks: (HealthCheck & { label: string })[]
}

const STATUS_DOT: Record<StatusColor, string> = {
  green:  'bg-emerald-400',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500 animate-pulse',
}

const STATUS_TEXT: Record<StatusColor, string> = {
  green:  'text-emerald-400',
  yellow: 'text-yellow-400',
  red:    'text-red-400',
}

const STATUS_LABEL: Record<StatusColor, string> = {
  green:  'OK',
  yellow: 'Увага',
  red:    'Критично',
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchHealth() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHealth() }, [])

  const overallStatus: StatusColor = data?.checks.some((c) => c.status === 'red')
    ? 'red'
    : data?.checks.some((c) => c.status === 'yellow')
    ? 'yellow'
    : 'green'

  return (
    <div className="min-h-screen bg-[#060610] text-white p-6 md:p-10">
      <div className="max-w-2xl mx-auto">

        {/* Хедер */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-white/40 text-sm hover:text-white/70 transition-colors">
              ← Адмін панель
            </Link>
            <h1 className="text-2xl font-semibold mt-2">Статус системи</h1>
            {data && (
              <p className="text-white/40 text-xs mt-1">
                Оновлено: {new Date(data.timestamp).toLocaleString('uk-UA')}
              </p>
            )}
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Оновлення...' : '↻ Оновити'}
          </button>
        </div>

        {/* Загальний статус */}
        {!loading && data && (
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-3 border"
            style={{
              background: overallStatus === 'green'
                ? 'rgba(16,185,129,0.08)'
                : overallStatus === 'yellow'
                ? 'rgba(234,179,8,0.08)'
                : 'rgba(239,68,68,0.08)',
              borderColor: overallStatus === 'green'
                ? 'rgba(16,185,129,0.25)'
                : overallStatus === 'yellow'
                ? 'rgba(234,179,8,0.25)'
                : 'rgba(239,68,68,0.25)',
            }}
          >
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_DOT[overallStatus]}`} />
            <span className={`font-medium ${STATUS_TEXT[overallStatus]}`}>
              {overallStatus === 'green' ? 'Всі системи працюють нормально' : overallStatus === 'yellow' ? 'Є попередження' : 'Є критичні проблеми'}
            </span>
          </div>
        )}

        {/* Помилка завантаження */}
        {error && (
          <div className="rounded-2xl p-4 mb-6 bg-red-500/10 border border-red-400/20 text-red-300 text-sm">
            Помилка: {error}
          </div>
        )}

        {/* Список перевірок */}
        <div className="space-y-3">
          {loading && !data && (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 bg-white/5 animate-pulse h-16" />
            ))
          )}

          {data?.checks.map((check) => (
            <div
              key={check.id}
              className="rounded-2xl p-4 border border-white/8 bg-white/3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[check.status]}`} />
                <div>
                  <p className="font-mono text-sm text-white/90">{check.label}</p>
                  <div className="flex gap-3 mt-0.5">
                    {check.lastUpdated && (
                      <span className="text-xs text-white/35">Оновлено: {check.lastUpdated}</span>
                    )}
                    {check.nextUpdate && (
                      <span className="text-xs text-white/35">Наступне: {check.nextUpdate}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className={`text-xs font-medium ${STATUS_TEXT[check.status]}`}>
                  {STATUS_LABEL[check.status]}
                </span>
                {check.label_value && (
                  <p className="text-xs text-white/40 mt-0.5">{check.label_value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Підказки */}
        <div className="mt-8 rounded-2xl p-4 bg-white/3 border border-white/8">
          <p className="text-xs text-white/40 font-medium mb-2 uppercase tracking-wider">Швидкі дії</p>
          <div className="space-y-1.5 text-sm text-white/60">
            <p>• IG Token мінімальний термін — 60 днів. Оновлюється автоматично 1-го числа.</p>
            <p>• STRIPE_LIVE_MODE=true — щоб увімкнути монетизацію в продакшн.</p>
            <p>• Для Telegram алертів потрібен секрет TELEGRAM_ALERT_BOT_TOKEN.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
