import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { mages } from '@/app/mages/mages-data'

export const metadata: Metadata = { title: 'LUMARA — Академія' }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const firstName = session?.user.name?.split(' ')[0] ?? 'Мандрівнику'

  // LUNA — окрема карточка-герой
  const luna = mages.find((m) => m.id === 'luna')!
  // Решта — компактна сітка
  const rest = mages.filter((m) => m.id !== 'luna')

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-4xl">

      {/* ── Привітання ── */}
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
          Вітаю, {firstName}
        </h1>
        <p className="text-white/40 text-sm sm:text-base">Оберіть провідника для сьогоднішньої сесії</p>
      </div>

      {/* ── LUNA — герой-карточка ── */}
      <Link
        href="/chat/LUNA"
        className={`relative block rounded-2xl border ${luna.borderColor} overflow-hidden mb-4 sm:mb-5 group hover:border-blue-400/50 transition-all duration-300`}
        style={{ boxShadow: `0 0 40px ${luna.glowColor.replace('0.5', '0.1')}` }}
      >
        {/* Фон — кімната LUNA */}
        <Image
          src={luna.room}
          alt=""
          fill
          className="object-cover object-center opacity-20 group-hover:opacity-30 transition-opacity duration-500 scale-105 group-hover:scale-100"
        />
        {/* Градієнт */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#06060f]/95 via-[#06060f]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06060f]/80 via-transparent to-transparent" />

        {/* Glow при ховері */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at right, ${luna.glowColor}, transparent 60%)` }}
        />

        <div className="relative z-10 flex items-stretch min-h-[140px] sm:min-h-[160px]">
          {/* Портрет */}
          <div className="relative flex-shrink-0 w-28 sm:w-36 md:w-44 overflow-hidden">
            <Image
              src={luna.portrait}
              alt="LUNA"
              fill
              className={`object-cover ${luna.portraitPosition} group-hover:scale-105 transition-transform duration-500`}
              sizes="176px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#06060f]/60" />
          </div>

          {/* Текст */}
          <div className="p-4 sm:p-5 md:p-6 flex flex-col justify-center gap-1.5 flex-1">
            <span className={`text-xs font-semibold tracking-widest uppercase ${luna.textAccent}`}>
              ✦ {luna.role}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">{luna.name}</h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs hidden sm:block">
              {luna.tagline}
            </p>
            <span className={`text-xs ${luna.textAccent} opacity-60 group-hover:opacity-100 transition-opacity mt-1`}>
              Почати сесію →
            </span>
          </div>
        </div>
      </Link>

      {/* ── Решта магів — 3 картки ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {rest.map((mage) => (
          <Link
            key={mage.id}
            href={`/chat/${mage.name}`}
            className={`relative rounded-2xl border ${mage.borderColor} overflow-hidden group hover:border-opacity-60 transition-all duration-300 min-h-[180px] sm:min-h-[200px]`}
            style={{ boxShadow: `0 0 24px ${mage.glowColor.replace('0.5', '0.08')}` }}
          >
            {/* Фото — повна карточка */}
            <Image
              src={mage.portrait}
              alt={mage.name}
              fill
              className={`object-cover ${mage.portraitPosition} group-hover:scale-105 transition-transform duration-500`}
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            {/* Кімната на фоні (ледь видно) */}
            <Image
              src={mage.room}
              alt=""
              fill
              className="object-cover object-center opacity-0 group-hover:opacity-20 transition-opacity duration-500"
              sizes="(max-width: 640px) 100vw, 33vw"
            />

            {/* Темний градієнт знизу */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

            {/* Glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-400 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at bottom, ${mage.glowColor}, transparent 70%)` }}
            />

            {/* Текст */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              <span className={`text-xs font-semibold tracking-widest uppercase ${mage.textAccent} opacity-80`}>
                {mage.role}
              </span>
              <h3 className="font-display text-xl font-bold text-white">{mage.name}</h3>
              <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors">
                Почати сесію →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Підказка профілю ── */}
      <Link
        href="/profile"
        className="glass-card flex items-start gap-3 p-4 border border-amber-500/20 bg-amber-900/10 hover:bg-amber-900/20 transition-colors rounded-xl block"
      >
        <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">💡</span>
        <p className="text-amber-300/70 text-sm leading-relaxed">
          Для точнішого астрологічного аналізу заповни дату, час та місце народження у профілі →
        </p>
      </Link>
    </div>
  )
}
