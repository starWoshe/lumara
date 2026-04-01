import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

const agents = [
  { name: 'ARCAS', role: 'Таро', emoji: '🔮', href: '/chat/ARCAS', color: 'from-purple-900/30 to-violet-900/30', border: 'border-purple-500/20' },
  { name: 'NUMI', role: 'Нумерологія', emoji: '✨', href: '/chat/NUMI', color: 'from-amber-900/30 to-yellow-900/30', border: 'border-amber-500/20' },
  { name: 'UMBRA', role: 'Езо-психологія', emoji: '🌑', href: '/chat/UMBRA', color: 'from-slate-900/30 to-gray-900/30', border: 'border-slate-500/20' },
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const firstName = session?.user.name?.split(' ')[0] ?? 'Мандрівнику'

  return (
    <div className="pt-4 px-6 pb-6 md:pt-6 md:px-10 md:pb-10 max-w-4xl">
      {/* Привітання */}
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
          Вітаю, {firstName} 🌟
        </h1>
        <p className="text-white/50">Обери провідника для сьогоднішньої сесії</p>
      </div>

      {/* Карточка LUNA — повна ширина, з кімнатою і аватаром */}
      <Link
        href="/chat/LUNA"
        className="glass-card mb-4 overflow-hidden relative flex items-center gap-0 border border-blue-500/30 hover:border-blue-400/50 hover:scale-[1.01] transition-all duration-300 group block"
      >
        {/* Фон — кімната LUNA */}
        <Image
          src="/luna-room.png"
          alt=""
          fill
          className="object-cover object-center opacity-25 group-hover:opacity-35 transition-opacity duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-transparent" />

        {/* Аватар зліва */}
        <div className="relative z-10 flex-shrink-0 w-32 h-36 md:w-40 md:h-44 overflow-hidden">
          <Image
            src="/luna-avatar.png"
            alt="LUNA"
            fill
            className="object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-950/40" />
        </div>

        {/* Текст справа */}
        <div className="relative z-10 p-5 md:p-6 flex-1">
          <div className="text-xs font-semibold tracking-widest uppercase text-blue-300 mb-1">
            Астрологія
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 font-display">LUNA</h3>
          <p className="text-white/50 text-sm leading-relaxed mb-4 max-w-xs">
            Читає карту зірок твого народження. Розкриває характер, таланти та ключові цикли життя.
          </p>
          <span className="text-xs text-blue-300/60 group-hover:text-blue-300/90 transition-colors">
            Почати сесію →
          </span>
        </div>
      </Link>

      {/* Решта агентів — сітка */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
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
      <Link href="/profile" className="glass-card p-5 border border-gold-500/20 bg-amber-900/10 hover:bg-amber-900/20 transition-colors block">
        <p className="text-amber-300/80 text-sm">
          💡 Для точнішого астрологічного аналізу заповни дату, час та місце народження у профілі →
        </p>
      </Link>
    </div>
  )
}
