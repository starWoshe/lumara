import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { mages, type Mage } from '../mages-data'
import type { Metadata } from 'next'

export function generateStaticParams() {
  return mages.map((m) => ({ mage: m.id }))
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://lumara.fyi'

export async function generateMetadata({
  params,
}: {
  params: { mage: string }
}): Promise<Metadata> {
  const mage = mages.find((m) => m.id === params.mage)
  if (!mage) return {}
  const title = `${mage.name} — ${mage.role} | LUMARA`
  const description = `${mage.quote} Перша сесія безкоштовно.`
  const image = `${BASE_URL}/${mage.id}-portrait-1.png`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 800, height: 1067, alt: mage.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default function MagePage({ params }: { params: { mage: string } }) {
  const mageData = mages.find((m) => m.id === params.mage)
  if (!mageData) notFound()
  const mage = mageData

  // Частинки — 12 на мобільному, 24 на десктопі (контролюємо через CSS)
  const particles = Array.from({ length: 24 })
  // Зірки — фіксовані позиції
  const stars = Array.from({ length: 40 })

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#080810]">

      {/* ═══════════════════════════════════════
          ФОН — КІМНАТА МАГА
      ═══════════════════════════════════════ */}
      <div className="fixed inset-0 z-0">
        <Image
          src={mage.room}
          alt=""
          fill
          className="object-cover object-center opacity-25"
          priority
          sizes="100vw"
        />
        {/* Основні затемнення */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/95" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/50" />
        {/* Виньєтка по краях */}
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%)'
          }}
        />
      </div>

      {/* ═══════════════════════════════════════
          МЕРЕХТІННЯ СВІЧОК — теплий пульсуючий шар
      ═══════════════════════════════════════ */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        {/* Тепле жовто-помаранчеве полум'я (завжди присутнє, мерехтить) */}
        <div
          className="candle-glow absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="candle-glow-2 absolute bottom-0 right-1/3 w-64 h-64 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)' }}
        />
        {/* Кольоровий акцентний шар мага */}
        <div
          className="mage-pulse absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-0"
          style={{ background: `radial-gradient(ellipse, ${mage.candleColor} 0%, transparent 70%)` }}
        />
      </div>

      {/* ═══════════════════════════════════════
          ЗІРКИ — мерехтливі крапки на фоні
      ═══════════════════════════════════════ */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {stars.map((_, i) => (
          <span
            key={`star-${i}`}
            className="star"
            style={
              {
                '--sx': `${(i * 47 + 13) % 100}%`,
                '--sy': `${(i * 31 + 7) % 60}%`,
                '--sd': `${(i * 1.3) % 5}s`,
                '--ss': `${1 + (i % 3)}px`,
                '--sc': mage.starColor,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════
          ЧАСТИНКИ — плаваючі вогники
      ═══════════════════════════════════════ */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {particles.map((_, i) => (
          <span
            key={`particle-${i}`}
            className={`particle ${i >= 12 ? 'desktop-only' : ''}`}
            style={
              {
                '--x': `${(i * 37 + 10) % 100}%`,
                '--y': `${(i * 53 + 5) % 100}%`,
                '--delay': `${(i * 0.5) % 8}s`,
                '--duration': `${5 + (i % 6)}s`,
                '--size': `${2 + (i % 3)}px`,
                '--color': mage.particleColor,
                '--drift': `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 20))}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════
          ТУМАН ЗНИЗУ
      ═══════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 h-48 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)'
        }}
        aria-hidden="true"
      />

      {/* ═══════════════════════════════════════
          НАВІГАЦІЯ
      ═══════════════════════════════════════ */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md bg-black/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <Image
              src="/lumara-logo.png"
              alt="LUMARA"
              width={28}
              height={28}
              className="rounded-full sm:w-8 sm:h-8"
            />
            <span className="font-display text-lg sm:text-xl font-bold bg-gradient-to-r from-lumara-300 to-gold-400 bg-clip-text text-transparent">
              LUMARA
            </span>
          </Link>

          <Link
            href="/#agents"
            className="flex items-center gap-1.5 sm:gap-2 text-white/60 hover:text-white text-xs sm:text-sm font-medium transition-colors border border-white/10 hover:border-white/20 px-3 sm:px-4 py-2 rounded-xl backdrop-blur-sm"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden xs:inline">Усі провідники</span>
            <span className="xs:hidden">Назад</span>
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════
          ОСНОВНИЙ КОНТЕНТ
      ═══════════════════════════════════════ */}
      <div className="relative z-10 pt-16 sm:pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* МОБІЛЬНИЙ LAYOUT — вертикальний стек */}
          <div className="flex flex-col lg:hidden gap-0">

            {/* Портрет — компактний на мобільному */}
            <div className="relative mx-auto w-full max-w-xs sm:max-w-sm pt-4 pb-6">
              <div
                className="absolute inset-0 rounded-2xl blur-2xl opacity-50 -z-10 scale-105"
                style={{ background: `radial-gradient(circle, ${mage.glowColor}, transparent 70%)` }}
              />
              <div
                className={`relative rounded-2xl border ${mage.borderColor} overflow-hidden`}
                style={{ boxShadow: `0 0 40px ${mage.glowColor}, 0 0 80px ${mage.glowColor.replace('0.5', '0.15')}` }}
              >
                <div className="aspect-[3/4] relative">
                  <Image
                    src={mage.portrait}
                    alt={mage.name}
                    fill
                    className={`object-cover ${mage.portraitPosition}`}
                    sizes="(max-width: 640px) 85vw, 384px"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-widest uppercase border ${mage.badgeBg} backdrop-blur-sm mb-2`}>
                      ✦ {mage.role}
                    </span>
                    <h1 className="font-display text-4xl font-bold text-white drop-shadow-lg">
                      {mage.name}
                    </h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Контент під портретом */}
            <div className="fade-in-up flex flex-col gap-5 px-1">
              <MageContent mage={mage} mobile />
            </div>
          </div>

          {/* ДЕСКТОП LAYOUT — дві колонки */}
          <div className="hidden lg:grid grid-cols-2 gap-16 xl:gap-24 items-start pt-8">

            {/* Ліва колонка — портрет sticky */}
            <div className="lg:sticky lg:top-28">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-3xl blur-3xl opacity-40 -z-10 scale-110"
                  style={{ background: `radial-gradient(circle, ${mage.glowColor}, transparent 70%)` }}
                />
                <div
                  className={`relative rounded-3xl border ${mage.borderColor} overflow-hidden`}
                  style={{ boxShadow: `0 0 60px ${mage.glowColor}, 0 0 120px ${mage.glowColor.replace('0.5', '0.2')}` }}
                >
                  <div className="aspect-[3/4] relative">
                    <Image
                      src={mage.portrait}
                      alt={mage.name}
                      fill
                      className={`object-cover ${mage.portraitPosition}`}
                      sizes="50vw"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase border ${mage.badgeBg} backdrop-blur-sm mb-3`}>
                        ✦ {mage.role}
                      </span>
                      <h1 className="font-display text-5xl font-bold text-white drop-shadow-lg">
                        {mage.name}
                      </h1>
                    </div>
                  </div>
                </div>

                {/* CTA кнопка під портретом — тільки десктоп */}
                <div className="mt-6">
                  <Link
                    href={`/chat/${mage.id}`}
                    className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r ${mage.ctaGradient} text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 text-lg shadow-lg active:scale-95`}
                    style={{ boxShadow: `0 0 30px ${mage.glowColor}` }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Поговорити з {mage.name}
                  </Link>
                </div>
              </div>
            </div>

            {/* Права колонка — контент */}
            <div className="flex flex-col gap-8 pt-12">
              <MageContent mage={mage} mobile={false} />
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════
          НИЖНЯ CTA — мобільна (фіксована)
      ═══════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-8">
        <Link
          href={`/chat/${mage.id}`}
          className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r ${mage.ctaGradient} text-white font-bold py-4 px-8 rounded-2xl text-base shadow-2xl active:scale-95 transition-transform`}
          style={{ boxShadow: `0 0 30px ${mage.glowColor}` }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Поговорити з {mage.name}
        </Link>
      </div>

      {/* ═══════════════════════════════════════
          CSS АНІМАЦІЇ
      ═══════════════════════════════════════ */}
      <style>{`
        /* --- Зірки --- */
        .star {
          position: absolute;
          left: var(--sx);
          top: var(--sy);
          width: var(--ss);
          height: var(--ss);
          border-radius: 50%;
          background: var(--sc);
          animation: twinkle var(--sd, 3s) infinite ease-in-out;
          animation-delay: calc(var(--sd) * -0.5);
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }

        /* --- Частинки --- */
        .particle {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: var(--size);
          height: var(--size);
          border-radius: 50%;
          background: var(--color);
          box-shadow: 0 0 6px 2px var(--color);
          opacity: 0;
          animation: float-particle var(--duration) var(--delay) infinite ease-in-out;
        }
        @keyframes float-particle {
          0% { opacity: 0; transform: translateY(0) translateX(0) scale(0); }
          15% { opacity: 0.8; transform: translateY(-15px) translateX(var(--drift, 0px)) scale(1); }
          80% { opacity: 0.3; transform: translateY(-90px) translateX(calc(var(--drift, 0px) * 2)) scale(0.6); }
          100% { opacity: 0; transform: translateY(-130px) translateX(calc(var(--drift, 0px) * 2.5)) scale(0); }
        }
        /* Приховуємо частинки 13-24 на мобільному */
        @media (max-width: 1024px) {
          .desktop-only { display: none; }
        }

        /* --- Мерехтіння свічок --- */
        .candle-glow {
          animation: candle-flicker 3s infinite ease-in-out;
        }
        .candle-glow-2 {
          animation: candle-flicker 4.5s 1.5s infinite ease-in-out;
        }
        @keyframes candle-flicker {
          0%, 100% { opacity: 0.6; transform: scaleX(1) scaleY(1); }
          20% { opacity: 0.4; transform: scaleX(1.1) scaleY(0.95); }
          40% { opacity: 0.75; transform: scaleX(0.9) scaleY(1.05); }
          60% { opacity: 0.5; transform: scaleX(1.05) scaleY(0.9); }
          80% { opacity: 0.8; transform: scaleX(0.95) scaleY(1.1); }
        }

        /* --- Пульс акцентного кольору мага --- */
        .mage-pulse {
          animation: mage-breathe 6s infinite ease-in-out;
        }
        @keyframes mage-breathe {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        /* --- Поява елементів (stagger) --- */
        .fade-in-up {
          animation: fade-in-up 0.7s ease-out both;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- Stagger затримки --- */
        .stagger-1 { animation-delay: 0.05s; }
        .stagger-2 { animation-delay: 0.15s; }
        .stagger-3 { animation-delay: 0.25s; }
        .stagger-4 { animation-delay: 0.38s; }
        .stagger-5 { animation-delay: 0.5s; }

        /* --- Glass карточки --- */
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border-radius: 16px;
        }
      `}</style>
    </main>
  )
}

/* ═══════════════════════════════════════
   КОМПОНЕНТ КОНТЕНТУ (shared mobile/desktop)
═══════════════════════════════════════ */
function MageContent({ mage, mobile }: { mage: Mage; mobile: boolean }) {
  const gap = mobile ? 'gap-5' : 'gap-8'

  return (
    <div className={`flex flex-col ${gap}`}>

      {/* Теглайн + заголовок */}
      <div className={`fade-in-up stagger-1 ${mobile ? '' : ''}`}>
        <p className={`text-xs sm:text-sm font-semibold tracking-widest uppercase ${mage.textAccent} mb-3`}>
          ✦ {mage.tagline}
        </p>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
          Знайомся зі своїм{' '}
          <span className={`bg-gradient-to-r ${mage.accentColor} bg-clip-text text-transparent`}>
            {mage.heading}
          </span>
        </h2>
      </div>

      {/* Статистика */}
      <div className={`fade-in-up stagger-2 grid grid-cols-2 gap-3`}>
        <div className={`glass-card p-4 border ${mage.borderColor} text-center`}>
          <div className={`font-display text-2xl font-bold ${mage.textAccent}`}>
            {mage.stats.rating}★
          </div>
          <div className="text-white/50 text-xs mt-1">Рейтинг</div>
        </div>
        <div className={`glass-card p-4 border ${mage.borderColor} text-center`}>
          <div className={`font-display text-2xl font-bold ${mage.textAccent}`}>
            {mage.stats.sessions}
          </div>
          <div className="text-white/50 text-xs mt-1">{mage.stats.label}</div>
        </div>
      </div>

      {/* Опис */}
      <div className={`fade-in-up stagger-2 glass-card p-5 border ${mage.borderColor}`}>
        <p className="text-white/75 text-sm sm:text-base leading-relaxed">
          {mage.description}
        </p>
      </div>

      {/* Спеціалізація */}
      <div className="fade-in-up stagger-3">
        <h3 className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-3">
          Спеціалізація
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {mage.abilities.map((ability) => (
            <div
              key={ability}
              className={`glass-card px-3.5 py-3 border ${mage.borderColor} flex items-center gap-2.5 active:bg-white/10 hover:bg-white/10 transition-all duration-200`}
            >
              <span className={`text-sm ${mage.textAccent} flex-shrink-0`} aria-hidden="true">✦</span>
              <span className="text-white/85 text-sm font-medium">{ability}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Приклади фраз */}
      <div className="fade-in-up stagger-3">
        <h3 className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-3">
          {mage.name} може сказати
        </h3>
        <div className="flex flex-col gap-2.5">
          {mage.examples.map((example, i) => (
            <div
              key={i}
              className={`glass-card px-4 py-3.5 border ${mage.borderColor} relative overflow-hidden`}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r"
                style={{ background: mage.glowColor }}
              />
              <p className="text-white/70 text-sm italic leading-relaxed pl-2">
                &ldquo;{example}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Цитата */}
      <div className={`fade-in-up stagger-4 relative glass-card p-5 border ${mage.borderColor} overflow-hidden`}>
        <div
          className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl opacity-25 -translate-y-6 translate-x-6 pointer-events-none"
          style={{ background: mage.glowColor }}
          aria-hidden="true"
        />
        <div className={`text-3xl font-display ${mage.textAccent} mb-2 opacity-40 leading-none`} aria-hidden="true">❝</div>
        <p className="text-white/70 text-sm sm:text-base italic leading-relaxed">
          {mage.quote}
        </p>
      </div>

      {/* Частина Академії Лумара */}
      <div className={`fade-in-up stagger-4 border-t border-white/10 pt-5`}>
        <p className="text-white/35 text-xs uppercase tracking-widest mb-3 font-semibold">
          Частина Академії Лумара
        </p>
        <Link
          href={`/chat/${mage.id}`}
          className={`flex items-center gap-3 glass-card px-4 py-3 border ${mage.borderColor} hover:bg-white/10 active:bg-white/10 transition-all duration-200`}
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-black/40">
            <Image
              src="/academy-castle.png"
              alt="Академія Лумара"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div>
            <div className="text-sm font-bold text-white/90">Академія Лумара</div>
            <div className="text-white/40 text-xs">Поговорити з {mage.name} →</div>
          </div>
        </Link>
      </div>

      {/* Навігація між магами */}
      <div className={`fade-in-up stagger-5 border-t border-white/10 pt-5 ${mobile ? 'mb-24' : ''}`}>
        <p className="text-white/35 text-xs uppercase tracking-widest mb-3 font-semibold">
          Інші провідники
        </p>
        <div className="flex gap-2.5 flex-wrap">
          {mages
            .filter((m) => m.id !== mage.id)
            .map((other) => (
              <Link
                key={other.id}
                href={`/mages/${other.id}`}
                className={`flex items-center gap-2 glass-card px-3 py-2 border ${other.borderColor} hover:bg-white/10 active:bg-white/10 transition-all duration-200`}
              >
                <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={other.portrait}
                    alt={other.name}
                    fill
                    className={`object-cover ${other.portraitPosition}`}
                    sizes="28px"
                  />
                </div>
                <div>
                  <div className={`text-xs font-bold ${other.textAccent}`}>{other.name}</div>
                  <div className="text-white/35 text-xs">{other.role}</div>
                </div>
              </Link>
            ))}
        </div>
      </div>

    </div>
  )
}
