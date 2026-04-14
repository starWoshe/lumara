import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { mages } from '@/app/mages/mages-data'

export const metadata: Metadata = { title: 'LUMARA — Академія' }

// Налаштування відображення портретів на дашборді
const PORTRAIT_CONFIG: Record<string, { width: string; scale?: string }> = {
  luna:  { width: 'w-28 sm:w-36 md:w-40' },
  arcas: { width: 'w-20 sm:w-28 md:w-32', scale: 'scale-90' }, // менший — не поміщається
  numi:  { width: 'w-28 sm:w-36 md:w-40' },
  umbra: { width: 'w-28 sm:w-36 md:w-40' },
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const firstName = session?.user.name?.split(' ')[0] ?? 'Мандрівнику'

  return (
    <div className="relative min-h-screen">

      {/* ── Анімований замок справа ── */}
      <div
        className="fixed right-0 top-0 bottom-0 z-0 pointer-events-none hidden lg:block"
        style={{ width: '45%', left: 'auto' }}
        aria-hidden="true"
      >
        {/* Маска — плавне зникнення зліва */}
        <div
          className="absolute inset-0 z-10"
          style={{ background: 'linear-gradient(to right, rgba(6,6,16,1) 0%, rgba(6,6,16,0.5) 25%, rgba(6,6,16,0.1) 50%, transparent 75%)' }}
        />
        {/* Маска знизу */}
        <div
          className="absolute inset-x-0 bottom-0 z-10 h-48"
          style={{ background: 'linear-gradient(to top, rgba(6,6,16,1) 0%, transparent 100%)' }}
        />
        {/* Маска зверху */}
        <div
          className="absolute inset-x-0 top-0 z-10 h-32"
          style={{ background: 'linear-gradient(to bottom, rgba(6,6,16,0.8) 0%, transparent 100%)' }}
        />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover object-center"
          style={{ mixBlendMode: 'screen', opacity: 0.9 }}
        >
          <source src="/castle-animated.mp4" type="video/mp4" />
        </video>
      </div>

    <div className="relative z-10 p-4 sm:p-6 md:p-8 lg:p-10 max-w-2xl xl:max-w-3xl">

      {/* ── Привітання ── */}
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
          Вітаю, {firstName}
        </h1>
        <p className="text-white/40 text-sm sm:text-base">Оберіть провідника для сьогоднішньої сесії</p>
      </div>

      {/* ── Всі 4 мага — горизонтальні картки ── */}
      <div className="flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8">
        {mages.map((mage) => {
          const cfg = PORTRAIT_CONFIG[mage.id]
          return (
            <Link
              key={mage.id}
              href={`/chat/${mage.name}`}
              className={`relative flex rounded-2xl border ${mage.borderColor} overflow-hidden group transition-all duration-300 hover:border-opacity-70`}
              style={{
                background: 'rgba(6,6,16,0.7)',
                boxShadow: `0 0 30px ${mage.glowColor.replace('0.5', '0.07')}`,
              }}
            >
              {/* Фон — кімната мага */}
              <Image
                src={mage.room}
                alt=""
                fill
                className="object-cover object-center opacity-15 group-hover:opacity-25 transition-opacity duration-500 scale-105 group-hover:scale-100"
                sizes="(max-width: 768px) 100vw, 700px"
              />

              {/* Затемнення зліва */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, rgba(6,6,16,0.95) 0%, rgba(6,6,16,0.7) 40%, rgba(6,6,16,0.2) 70%, transparent 100%)`
                }}
              />

              {/* Glow при ховері */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at right, ${mage.glowColor.replace('0.5', '0.15')}, transparent 60%)`
                }}
              />

              {/* Портрет */}
              <div className={`relative flex-shrink-0 ${cfg.width} self-stretch overflow-hidden`}>
                <Image
                  src={mage.portrait}
                  alt={mage.name}
                  fill
                  className={`object-cover ${mage.portraitPosition} ${cfg.scale ?? ''} group-hover:scale-[1.04] transition-transform duration-500`}
                  sizes="160px"
                />
                {/* Затемнення правого краю портрету */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[rgba(6,6,16,0.5)]" />
              </div>

              {/* Текст */}
              <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-center gap-1 flex-1 min-w-0">
                <span className={`text-xs font-semibold tracking-widest uppercase ${mage.textAccent}`}>
                  ✦ {mage.role}
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white">{mage.name}</h2>
                <p className="text-white/45 text-xs sm:text-sm leading-relaxed line-clamp-2 hidden xs:block">
                  {mage.tagline}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs ${mage.textAccent} opacity-60 group-hover:opacity-100 transition-opacity`}>
                    Почати сесію →
                  </span>
                  <span className="text-white/25 text-xs">
                    {mage.stats.rating}★
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Підказка профілю ── */}
      <Link
        href="/profile"
        className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-900/10 hover:bg-amber-900/20 transition-colors"
      >
        <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">💡</span>
        <p className="text-amber-300/70 text-sm leading-relaxed">
          Для точнішого астрологічного аналізу заповни дату, час та місце народження у профілі →
        </p>
      </Link>
    </div>
    </div>
  )
}
