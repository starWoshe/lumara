import { getSessionUser } from '@/lib/auth'
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
  const session = await getSessionUser()
  const firstName = session?.name?.split(' ')[0] ?? 'Мандрівнику'

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
          style={{ opacity: 0.92 }}
        >
          <source src="/castle-stars.mp4" type="video/mp4" />
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
              prefetch={false}
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

      {/* ── CTA: заповни профіль ── */}
      <Link href="/profile" className="profile-cta-btn group block relative rounded-2xl overflow-hidden">

        {/* Анімований градієнтний бордер */}
        <div className="profile-cta-border absolute inset-0 rounded-2xl pointer-events-none" />

        {/* Шиммер-смуга */}
        <div className="profile-cta-shimmer absolute inset-0 pointer-events-none rounded-2xl" />

        {/* Зоряні частинки */}
        <span className="profile-cta-star" style={{ left: '8%',  top: '25%', animationDelay: '0s' }}>✦</span>
        <span className="profile-cta-star" style={{ left: '20%', top: '70%', animationDelay: '0.7s' }}>✧</span>
        <span className="profile-cta-star" style={{ left: '78%', top: '20%', animationDelay: '1.3s' }}>✦</span>
        <span className="profile-cta-star" style={{ left: '90%', top: '65%', animationDelay: '0.4s' }}>✧</span>
        <span className="profile-cta-star" style={{ left: '52%', top: '80%', animationDelay: '1.8s' }}>✦</span>
        <span className="profile-cta-star" style={{ left: '35%', top: '15%', animationDelay: '0.9s' }}>✧</span>

        {/* Контент */}
        <div className="relative z-10 flex items-center gap-4 px-5 py-4 sm:py-5">
          {/* Іконка */}
          <div className="profile-cta-icon flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl">
            🔮
          </div>

          {/* Текст */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm sm:text-base leading-snug">
              Активуй точний астральний аналіз
            </p>
            <p className="text-white/45 text-xs sm:text-sm mt-0.5 leading-relaxed">
              Заповни дату, час і місце народження — маги говоритимуть саме до тебе
            </p>
          </div>

          {/* Стрілка */}
          <div className="profile-cta-arrow flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
            →
          </div>
        </div>
      </Link>

      <style>{`
        /* ── Пульсуюче свічення навколо кнопки ── */
        .profile-cta-btn {
          background: linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.10) 40%, rgba(245,158,11,0.08) 100%);
          animation: cta-pulse-glow 4s ease-in-out infinite;
        }
        @keyframes cta-pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.15), 0 0 40px rgba(99,102,241,0.05); }
          50%       { box-shadow: 0 0 35px rgba(139,92,246,0.30), 0 0 70px rgba(139,92,246,0.10), 0 0 100px rgba(245,158,11,0.06); }
        }

        /* ── Градієнтний бордер, що обертається ── */
        .profile-cta-border {
          background: conic-gradient(
            from var(--border-angle, 0deg),
            rgba(99,102,241,0.7) 0%,
            rgba(167,139,250,0.5) 20%,
            rgba(245,158,11,0.6) 40%,
            rgba(99,102,241,0.2) 60%,
            rgba(139,92,246,0.6) 80%,
            rgba(99,102,241,0.7) 100%
          );
          padding: 1px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: border-spin 6s linear infinite;
        }
        @property --border-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes border-spin {
          to { --border-angle: 360deg; }
        }

        /* ── Шиммер-смуга ── */
        .profile-cta-shimmer {
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%);
          background-size: 200% 100%;
          animation: cta-shimmer 3.5s ease-in-out infinite;
        }
        @keyframes cta-shimmer {
          0%   { background-position: -100% 0; }
          60%  { background-position: 200% 0; }
          100% { background-position: 200% 0; }
        }

        /* ── Зоряні частинки ── */
        .profile-cta-star {
          position: absolute;
          font-size: 10px;
          color: rgba(167,139,250,0.7);
          animation: cta-star-twinkle ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes cta-star-twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.7); }
          50%       { opacity: 0.9; transform: scale(1.4); color: rgba(245,158,11,0.9); }
        }
        .profile-cta-star { animation-duration: 2.5s; }
        .profile-cta-star:nth-child(3) { animation-duration: 3.1s; }
        .profile-cta-star:nth-child(4) { animation-duration: 2.2s; }
        .profile-cta-star:nth-child(5) { animation-duration: 3.5s; }
        .profile-cta-star:nth-child(6) { animation-duration: 2.8s; }
        .profile-cta-star:nth-child(7) { animation-duration: 1.9s; }
        .profile-cta-star:nth-child(8) { animation-duration: 3.2s; }

        /* ── Іконка ── */
        .profile-cta-icon {
          background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.20));
          border: 1px solid rgba(139,92,246,0.35);
          box-shadow: 0 0 12px rgba(99,102,241,0.20);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .profile-cta-btn:hover .profile-cta-icon {
          transform: scale(1.1) rotate(-6deg);
          box-shadow: 0 0 20px rgba(99,102,241,0.40);
        }

        /* ── Стрілка ── */
        .profile-cta-arrow {
          color: rgba(167,139,250,0.7);
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(139,92,246,0.25);
          font-size: 14px;
          transition: transform 0.3s ease, color 0.3s ease, background 0.3s ease;
        }
        .profile-cta-btn:hover .profile-cta-arrow {
          transform: translateX(4px);
          color: rgba(245,158,11,0.9);
          background: rgba(245,158,11,0.12);
          border-color: rgba(245,158,11,0.35);
        }

        /* ── Hover-підсвічення фону ── */
        .profile-cta-btn:hover {
          background: linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.14) 40%, rgba(245,158,11,0.10) 100%);
        }
      `}</style>
    </div>
    </div>
  )
}
