import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

const agents = [
  { name: 'LUNA', role: 'Астрологія', emoji: '🌙', href: '/chat/LUNA', color: 'from-blue-900/30 to-indigo-900/30', border: 'border-blue-500/20' },
  { name: 'ARCAS', role: 'Таро', emoji: '🔮', href: '/chat/ARCAS', color: 'from-purple-900/30 to-violet-900/30', border: 'border-purple-500/20' },
  { name: 'NUMI', role: 'Нумерологія', emoji: '✨', href: '/chat/NUMI', color: 'from-amber-900/30 to-yellow-900/30', border: 'border-amber-500/20' },
  { name: 'UMBRA', role: 'Езо-психологія', emoji: '🌑', href: '/chat/UMBRA', color: 'from-slate-900/30 to-gray-900/30', border: 'border-slate-500/20' },
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const firstName = session?.user.name?.split(' ')[0] ?? 'Мандрівнику'

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      {/* Привітання */}
      <div className="mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
          Вітаю, {firstName} 🌟
        </h1>
        <p className="text-white/50">Обери провідника для сьогоднішньої сесії</p>
      </div>

      {/* Картки агентів */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {agents.map((agent) => (
          <Link
            key={agent.name}
            href={agent.href}
            className={`glass-card p-6 bg-gradient-to-br ${agent.color} border ${agent.border} hover:scale-[1.02] transition-all duration-200 group`}
          >
            <div className="text-3xl mb-3">{agent.emoji}</div>
            <h3 className="text-xl font-bold text-white mb-1">{agent.name}</h3>
            <p className="text-white/50 text-sm mb-4">{agent.role}</p>
            <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
              Почати сесію →
            </span>
          </Link>
        ))}
      </div>

      {/* Підказка для профілю */}
      <div className="glass-card p-5 border border-gold-500/20 bg-amber-900/10">
        <p className="text-amber-300/80 text-sm">
          💡 Для точнішого астрологічного аналізу заповни дату, час та місце народження у профілі.
        </p>
      </div>
    </div>
  )
}
