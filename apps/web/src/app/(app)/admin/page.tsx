'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/providers/SessionProvider'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// ---- Типи ----

type User = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  createdAt: string
  subscriptions: { plan: string; status: string }[]
  _count: { conversations: number }
  profile: { acquisitionSource: string | null } | null
}

type AgentStats = {
  conversationsByAgent: Record<string, number>
  funnel: {
    registered: number
    activated: number
    monetizationTrigger: number
    converted: number
  }
  reactivation: {
    sent: number
    converted: number
  }
}

type TokenStats = {
  today: {
    tokens: number
    cost: number
    byAgent: { agent: string; tokens: number; cost: number }[]
    byType: { actionType: string; tokens: number; cost: number }[]
  }
  month: {
    cost: number
    forecast: number
    byDay: { day: string; tokens: number; cost: number }[]
  }
}

type AdminSettings = {
  daily_budget_usd: string
  alert_yellow_tokens_per_hour: string
  alert_red_tokens_per_hour: string
}

type ActivityLog = {
  id: string
  action: string
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { id: string; email: string; name: string | null; image: string | null }
}

// ---- Утиліти ----

const ACTION_LABELS: Record<string, string> = {
  SIGN_IN: '🔑 Вхід',
  SIGN_OUT: '👋 Вихід',
  CHAT_STARTED: '💬 Почав чат',
  MESSAGE_SENT: '✉️ Повідомлення',
  PROFILE_UPDATED: '👤 Профіль',
  SUBSCRIPTION_CHANGED: '⭐ Підписка',
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  ELITE: 'Elite',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ---- Компонент ----

export default function AdminPage() {
  const { user: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'activity' | 'users' | 'costs' | 'limits'>('activity')
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null)
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const [settings, setSettings] = useState<AdminSettings>({
    daily_budget_usd: '10',
    alert_yellow_tokens_per_hour: '50000',
    alert_red_tokens_per_hour: '200000',
  })
  const [savingSettings, setSavingSettings] = useState(false)

  // Захист — тільки ADMIN (через useEffect щоб не порушувати Rules of Hooks)
  useEffect(() => {
    if (status !== 'loading' && (!session || session.role !== 'ADMIN')) {
      router.replace('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated' || session?.role !== 'ADMIN') return
    async function load() {
      setLoading(true)
      const [usersRes, logsRes, statsRes, tokenRes, settingsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch(`/api/admin/activity${selectedUser ? `?userId=${selectedUser}` : ''}`),
        fetch('/api/admin/stats'),
        fetch('/api/admin/token-stats'),
        fetch('/api/admin/settings'),
      ])
      const usersData = await usersRes.json()
      const logsData = await logsRes.json()
      const statsData = await statsRes.json()
      const tokenData = await tokenRes.json()
      const settingsData = await settingsRes.json()
      setUsers(usersData.users ?? [])
      setLogs(logsData.logs ?? [])
      setAgentStats(statsData ?? null)
      setTokenStats(tokenData ?? null)
      if (settingsData && !settingsData.error) setSettings(settingsData)
      setLoading(false)
    }
    load()
  }, [selectedUser, status, session])

  if (status === 'loading' || !session || session.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Адмін панель</h1>
        <p className="text-white/40 text-sm">LUMARA Academy · {users.length} користувачів</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Всього юзерів" value={users.length} icon="👥" />
        <StatCard
          label="Активні підписки"
          value={users.filter(u => u.subscriptions[0]?.status === 'ACTIVE').length}
          icon="⭐"
        />
        <StatCard
          label="Всього розмов"
          value={users.reduce((s, u) => s + u._count.conversations, 0)}
          icon="💬"
        />
        <StatCard
          label="Нові сьогодні"
          value={users.filter(u => new Date(u.createdAt).toDateString() === new Date().toDateString()).length}
          icon="🌱"
        />
      </div>

      {/* Реактивація */}
      {agentStats && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatCard
            label="Реактиваційних листів надіслано"
            value={agentStats.reactivation.sent}
            icon="📧"
          />
          <StatCard
            label="Конверсія реактивації"
            value={
              agentStats.reactivation.sent > 0
                ? Math.round((agentStats.reactivation.converted / agentStats.reactivation.sent) * 100)
                : 0
            }
            icon="📈"
            suffix="%"
          />
        </div>
      )}

      {/* Розбивка по магах */}
      {agentStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {(['LUNA', 'ARCAS', 'NUMI', 'UMBRA'] as const).map((mage) => {
            const icons: Record<string, string> = { LUNA: '🌙', ARCAS: '🃏', NUMI: '🔢', UMBRA: '🧠' }
            return (
              <StatCard
                key={mage}
                label={`${mage} — розмов`}
                value={agentStats.conversationsByAgent[mage] ?? 0}
                icon={icons[mage]}
              />
            )
          })}
        </div>
      )}

      {/* Воронка */}
      {agentStats && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
          <h2 className="text-white/60 text-xs uppercase tracking-widest mb-4">Воронка</h2>
          <div className="flex flex-col gap-2">
            <FunnelRow label="Реєстрація" value={agentStats.funnel.registered} max={agentStats.funnel.registered} color="bg-blue-500" />
            <FunnelRow label="Активація (почав чат)" value={agentStats.funnel.activated} max={agentStats.funnel.registered} color="bg-indigo-500" />
            <FunnelRow label="Тригер монетизації (≥12 повідомлень)" value={agentStats.funnel.monetizationTrigger} max={agentStats.funnel.registered} color="bg-purple-500" />
            <FunnelRow label="Конверсія (платна підписка)" value={agentStats.funnel.converted} max={agentStats.funnel.registered} color="bg-green-500" />
          </div>
        </div>
      )}

      {/* Таби */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <TabBtn active={tab === 'activity'} onClick={() => setTab('activity')}>Активність</TabBtn>
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>Користувачі</TabBtn>
        <TabBtn active={tab === 'costs'} onClick={() => setTab('costs')}>💰 Витрати</TabBtn>
        <TabBtn active={tab === 'limits'} onClick={() => setTab('limits')}>⚙️ Ліміти</TabBtn>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-20">Завантаження...</div>
      ) : tab === 'activity' ? (
        <ActivityTable logs={logs} selectedUser={selectedUser} onClear={() => setSelectedUser(null)} />
      ) : tab === 'users' ? (
        <UsersTable users={users} onSelectUser={(id) => { setSelectedUser(id); setTab('activity') }} />
      ) : tab === 'costs' ? (
        <CostsPanel stats={tokenStats} />
      ) : (
        <LimitsPanel
          settings={settings}
          saving={savingSettings}
          onChange={(k, v) => setSettings((s) => ({ ...s, [k]: v }))}
          onSave={async () => {
            setSavingSettings(true)
            await fetch('/api/admin/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(settings),
            })
            setSavingSettings(false)
          }}
        />
      )}
    </div>
  )
}

// ---- Під-компоненти ----

function StatCard({ label, value, icon, suffix }: { label: string; value: number; icon: string; suffix?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}{suffix ?? ''}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-lumara-600 text-white'
          : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}

function ActivityTable({ logs, selectedUser, onClear }: {
  logs: ActivityLog[]
  selectedUser: string | null
  onClear: () => void
}) {
  return (
    <div>
      {selectedUser && (
        <div className="mb-4 flex items-center gap-2 text-sm text-white/60">
          <span>Фільтр по користувачу</span>
          <button onClick={onClear} className="text-lumara-400 hover:text-lumara-300 underline">
            очистити
          </button>
        </div>
      )}
      {logs.length === 0 ? (
        <div className="text-white/30 text-center py-20">Активності ще немає</div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                <th className="text-left p-4">Користувач</th>
                <th className="text-left p-4">Дія</th>
                <th className="text-left p-4 hidden md:table-cell">Деталі</th>
                <th className="text-right p-4">Час</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {log.user.image && (
                        <Image
                          src={log.user.image}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full"
                        />
                      )}
                      <div>
                        <div className="text-white text-xs">{log.user.name ?? '—'}</div>
                        <div className="text-white/30 text-xs">{log.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-white/80">{ACTION_LABELS[log.action] ?? log.action}</span>
                  </td>
                  <td className="p-4 hidden md:table-cell text-white/30 text-xs">
                    {log.metadata ? JSON.stringify(log.metadata) : '—'}
                  </td>
                  <td className="p-4 text-right text-white/30 text-xs whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UsersTable({ users, onSelectUser }: {
  users: User[]
  onSelectUser: (id: string) => void
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
            <th className="text-left p-4">Користувач</th>
            <th className="text-left p-4 hidden md:table-cell">Роль / План</th>
            <th className="text-left p-4 hidden lg:table-cell">Розмов</th>
            <th className="text-left p-4 hidden xl:table-cell">Джерело</th>
            <th className="text-right p-4 hidden md:table-cell">Зареєстрований</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const sub = user.subscriptions[0]
            return (
              <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {user.image && (
                      <Image
                        src={user.image}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <div>
                      <div className="text-white text-sm">{user.name ?? '—'}</div>
                      <div className="text-white/30 text-xs">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell">
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user.role === 'ADMIN'
                        ? 'bg-gold-500/20 text-gold-400'
                        : 'bg-white/10 text-white/50'
                    }`}>
                      {user.role}
                    </span>
                    {sub && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        sub.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {PLAN_LABELS[sub.plan] ?? sub.plan}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 hidden lg:table-cell text-white/40 text-xs">
                  {user._count.conversations} розмов
                </td>
                <td className="p-4 hidden xl:table-cell text-white/30 text-xs">
                  {user.profile?.acquisitionSource ?? '—'}
                </td>
                <td className="p-4 text-right text-white/30 text-xs hidden md:table-cell whitespace-nowrap">
                  {formatDate(user.createdAt)}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => onSelectUser(user.id)}
                    className="text-xs text-lumara-400 hover:text-lumara-300 transition-colors"
                  >
                    Активність →
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FunnelRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-48 text-white/50 text-xs shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-white/70 text-xs w-20 text-right shrink-0">
        {value} <span className="text-white/30">({pct}%)</span>
      </div>
    </div>
  )
}

// ---- Витрати ----

const AGENT_ICONS: Record<string, string> = { LUNA: '🌙', ARCAS: '🃏', NUMI: '🔢', UMBRA: '🧠' }
const ACTION_TYPE_LABELS: Record<string, string> = {
  chat: 'Чати з юзерами', post: 'Генерація постів',
  monitor: 'Моніторинг груп', video: 'Відео тексти',
}

function CostsPanel({ stats }: { stats: TokenStats | null }) {
  if (!stats) return <div className="text-white/30 text-center py-20">Немає даних</div>
  const { today, month } = stats
  const maxDay = Math.max(...month.byDay.map((d) => d.cost), 0.001)

  return (
    <div className="space-y-6">
      {/* Сьогодні */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h2 className="text-white/60 text-xs uppercase tracking-widest mb-4">Сьогодні</h2>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <div className="text-2xl font-bold text-white">{today.tokens.toLocaleString()}</div>
            <div className="text-xs text-white/40">токенів</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">${today.cost.toFixed(4)}</div>
            <div className="text-xs text-white/40">витрачено</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {today.byAgent.map(({ agent, tokens, cost }) => (
            <div key={agent} className="bg-white/5 rounded-xl p-3">
              <div className="text-lg mb-0.5">{AGENT_ICONS[agent]}</div>
              <div className="text-white text-sm font-semibold">{agent}</div>
              <div className="text-white/50 text-xs">{tokens.toLocaleString()} tok</div>
              <div className="text-green-400/80 text-xs">${cost.toFixed(4)}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {today.byType.map(({ actionType, tokens }) => (
            tokens > 0 && (
              <div key={actionType} className="flex justify-between text-xs">
                <span className="text-white/50">{ACTION_TYPE_LABELS[actionType] ?? actionType}</span>
                <span className="text-white/70">{tokens.toLocaleString()} токенів</span>
              </div>
            )
          ))}
        </div>
      </div>

      {/* За місяць */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Цей місяць</h2>
          <div className="text-right">
            <span className="text-white font-semibold">${month.cost.toFixed(2)}</span>
            <span className="text-white/30 text-xs ml-2">прогноз: ${month.forecast.toFixed(2)}</span>
          </div>
        </div>
        {/* Простий bar chart */}
        <div className="flex items-end gap-1 h-20">
          {month.byDay.map(({ day, cost }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full bg-green-500/50 hover:bg-green-400/70 rounded-sm transition-all cursor-default"
                style={{ height: `${Math.max(4, (cost / maxDay) * 72)}px` }}
                title={`${day}: $${cost.toFixed(4)}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-white/20 text-xs mt-1">
          <span>{month.byDay[0]?.day?.slice(8) ?? '1'}</span>
          <span>{month.byDay[month.byDay.length - 1]?.day?.slice(8) ?? '31'}</span>
        </div>
      </div>
    </div>
  )
}

// ---- Ліміти ----

function LimitsPanel({
  settings, saving, onChange, onSave,
}: {
  settings: AdminSettings
  saving: boolean
  onChange: (k: keyof AdminSettings, v: string) => void
  onSave: () => void
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-lg space-y-5">
      <h2 className="text-white/60 text-xs uppercase tracking-widest">Налаштування лімітів</h2>

      <LimitField
        label="Денний бюджет ($)"
        hint="При перевищенні — Telegram алерт"
        value={settings.daily_budget_usd}
        onChange={(v) => onChange('daily_budget_usd', v)}
      />
      <LimitField
        label="Жовтий алерт (токенів/год)"
        hint="Попередження в Telegram"
        value={settings.alert_yellow_tokens_per_hour}
        onChange={(v) => onChange('alert_yellow_tokens_per_hour', v)}
      />
      <LimitField
        label="Червоний алерт (токенів/год)"
        hint="Автоматичне блокування мага на 1 годину"
        value={settings.alert_red_tokens_per_hour}
        onChange={(v) => onChange('alert_red_tokens_per_hour', v)}
      />

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-lumara-600 hover:bg-lumara-500 text-white text-sm font-medium transition-all disabled:opacity-50"
      >
        {saving ? 'Зберігаємо...' : 'Зберегти ліміти'}
      </button>
    </div>
  )
}

function LimitField({ label, hint, value, onChange }: {
  label: string; hint: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-white/70 text-sm mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-lumara-500/50 transition-all"
      />
      <p className="text-white/30 text-xs mt-1">{hint}</p>
    </div>
  )
}
