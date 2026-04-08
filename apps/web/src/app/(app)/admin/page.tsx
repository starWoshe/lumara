'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
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
  _count: { conversations: number; messages: number }
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
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<'users' | 'activity'>('activity')
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  // Захист — тільки ADMIN
  if (status === 'loading') return null
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch(`/api/admin/activity${selectedUser ? `?userId=${selectedUser}` : ''}`),
      ])
      const usersData = await usersRes.json()
      const logsData = await logsRes.json()
      setUsers(usersData.users ?? [])
      setLogs(logsData.logs ?? [])
      setLoading(false)
    }
    load()
  }, [selectedUser])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Адмін панель</h1>
        <p className="text-white/40 text-sm">LUMARA Academy · {users.length} користувачів</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
          label="Всього повідомлень"
          value={users.reduce((s, u) => s + u._count.messages, 0)}
          icon="✉️"
        />
      </div>

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
            <th className="text-left p-4 hidden lg:table-cell">Розмов / Повідомлень</th>
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
                  {user._count.conversations} / {user._count.messages}
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
