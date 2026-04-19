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
}

type AgentStats = {
  conversationsByAgent: Record<string, number>
  funnel: {
    registered: number
    activated: number
    monetizationTrigger: number
    converted: number
  }
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
  const [tab, setTab] = useState<'users' | 'activity'>('activity')
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null)

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
      const [usersRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch(`/api/admin/activity${selectedUser ? `?userId=${selectedUser}` : ''}`),
        fetch('/api/admin/stats'),
      ])
      const usersData = await usersRes.json()
      const logsData = await logsRes.json()
      const statsData = await statsRes.json()
      setUsers(usersData.users ?? [])
      setLogs(logsData.logs ?? [])
      setAgentStats(statsData ?? null)
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
      <div className="flex gap-2 mb-6">
        <TabBtn active={tab === 'activity'} onClick={() => setTab('activity')}>Активність</TabBtn>
        <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>Користувачі</TabBtn>
      </div>

      {loading ? (
        <div className="text-white/40 text-center py-20">Завантаження...</div>
      ) : tab === 'activity' ? (
        <ActivityTable logs={logs} selectedUser={selectedUser} onClear={() => setSelectedUser(null)} />
      ) : (
        <UsersTable users={users} onSelectUser={(id) => { setSelectedUser(id); setTab('activity') }} />
      )}
    </div>
  )
}

// ---- Під-компоненти ----

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
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
