import type { ReactNode } from 'react'
import { getSessionUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { mages } from '@/app/mages/mages-data'

// Детерміновані зірки (без Math.random у Server Component)
const STARS = [
  { x: 5,  y: 8,  s: 2, d: 2.4 }, { x: 14, y: 22, s: 1, d: 4.1 },
  { x: 23, y: 5,  s: 3, d: 1.8 }, { x: 35, y: 18, s: 1, d: 5.2 },
  { x: 47, y: 3,  s: 2, d: 3.0 }, { x: 58, y: 14, s: 1, d: 2.7 },
  { x: 67, y: 28, s: 2, d: 4.5 }, { x: 79, y: 7,  s: 1, d: 1.6 },
  { x: 88, y: 19, s: 3, d: 3.8 }, { x: 95, y: 11, s: 1, d: 2.1 },
  { x: 9,  y: 45, s: 1, d: 5.0 }, { x: 19, y: 60, s: 2, d: 2.9 },
  { x: 31, y: 38, s: 1, d: 4.3 }, { x: 42, y: 52, s: 2, d: 1.5 },
  { x: 54, y: 72, s: 1, d: 3.6 }, { x: 63, y: 41, s: 3, d: 2.2 },
  { x: 74, y: 65, s: 1, d: 4.8 }, { x: 83, y: 55, s: 2, d: 1.9 },
  { x: 92, y: 78, s: 1, d: 3.3 }, { x: 12, y: 82, s: 2, d: 5.5 },
  { x: 26, y: 90, s: 1, d: 2.6 }, { x: 49, y: 85, s: 2, d: 1.3 },
  { x: 71, y: 92, s: 1, d: 4.0 }, { x: 86, y: 88, s: 3, d: 2.8 },
  { x: 38, y: 75, s: 1, d: 3.7 }, { x: 60, y: 95, s: 2, d: 1.7 },
]

// Метеорити — напрямок, початок, затримка
const METEORS = [
  { x: 10, y: -5,  delay: 0,   dur: 2.5 },
  { x: 35, y: -8,  delay: 3.5, dur: 2.0 },
  { x: 60, y: -3,  delay: 7.0, dur: 3.0 },
  { x: 80, y: -6,  delay: 11,  dur: 2.2 },
  { x: 20, y: -4,  delay: 15,  dur: 2.7 },
  { x: 50, y: -7,  delay: 19,  dur: 2.1 },
  { x: 75, y: -5,  delay: 23,  dur: 2.8 },
]

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSessionUser()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="h-dvh md:h-screen overflow-hidden relative bg-[#060610] flex flex-col">

      {/* ── Фон — зоряне небо ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Image
          src="/starry-sky.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" />
        {/* Виньєтка */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)' }}
        />
      </div>

      {/* ── Блискучі зорі ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="app-star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.s}px`,
              height: `${s.s}px`,
              animationDuration: `${s.d}s`,
              animationDelay: `${-s.d * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* ── Метеорити ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {METEORS.map((m, i) => (
          <span
            key={i}
            className="meteor"
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.dur}s`,
            }}
          />
        ))}
      </div>

      {/* ── Бокова навігація ── */}
      <aside className="fixed left-0 top-0 h-dvh md:h-screen w-60 border-r border-white/5 bg-black/30 backdrop-blur-xl z-40 hidden md:flex flex-col">
        {/* Логотип */}
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <Image src="/lumara-logo.png" alt="LUMARA" width={34} height={34} className="rounded-full flex-shrink-0" />
          <span className="font-display text-xl font-bold bg-gradient-to-r from-lumara-300 to-gold-400 bg-clip-text text-transparent">
            LUMARA
          </span>
        </div>

        {/* Навігаційні посилання */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm">
            <span className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-sm">🏠</span>
            Головна
          </Link>
          {mages.map((mage) => (
            <Link
              key={mage.id}
              href={`/chat/${mage.name}`}
              prefetch={false}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm group"
            >
              <div
                className={`relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border ${mage.borderColor}`}
                style={{ boxShadow: `0 0 8px ${mage.glowColor.replace('0.5', '0.5')}` }}
              >
                <Image
                  src={mage.portrait}
                  alt={mage.name}
                  fill
                  className={`object-cover ${mage.portraitPosition}`}
                  sizes="28px"
                />
              </div>
              <span>
                <span className={`font-semibold ${mage.textAccent} group-hover:opacity-100 opacity-80`}>{mage.name}</span>
                {' '}<span className="text-white/35 text-xs">— {mage.role}</span>
              </span>
            </Link>
          ))}
        </nav>

        {/* Профіль користувача */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2">
            {session.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.image} alt="avatar" className="w-8 h-8 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{session.name}</p>
              <p className="text-xs text-white/40 truncate">{session.email}</p>
            </div>
          </div>
          <Link href="/profile" className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs">
            <span>👤</span> Профіль
          </Link>
          <Link href="/pricing" className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-lumara-400/60 hover:text-lumara-300 hover:bg-lumara-900/20 transition-all text-xs">
            <span>⭐</span> Тарифи
          </Link>
          {session.role === 'ADMIN' && (
            <Link href="/admin" className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-yellow-400/70 hover:text-yellow-300 hover:bg-yellow-900/20 transition-all text-xs">
              <span>🛡️</span> Адмін панель
            </Link>
          )}
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs">
              <span>↩</span> Вийти
            </button>
          </form>
        </div>
      </aside>

      {/* ── Основний контент ── */}
      <main className="md:pl-60 flex-1 min-h-0 overflow-y-auto relative z-10 flex flex-col">
        {children}
      </main>

      {/* ── CSS анімації ── */}
      <style>{`
        /* Мерехтливі зорі */
        .app-star {
          position: absolute;
          border-radius: 50%;
          background: rgba(220, 225, 255, 0.9);
          animation: star-twinkle linear infinite;
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.7); }
          25% { opacity: 0.9; transform: scale(1.3); box-shadow: 0 0 4px 1px rgba(180,190,255,0.6); }
          50% { opacity: 0.3; transform: scale(0.9); }
          75% { opacity: 1; transform: scale(1.5); box-shadow: 0 0 6px 2px rgba(180,190,255,0.8); }
        }

        /* Метеорити */
        .meteor {
          position: absolute;
          width: 120px;
          height: 1.5px;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,1) 100%);
          border-radius: 999px;
          opacity: 0;
          animation: meteor-fly linear infinite;
          transform-origin: right center;
          transform: rotate(30deg);
          box-shadow: 0 0 6px 1px rgba(180,200,255,0.5);
        }
        @keyframes meteor-fly {
          0% {
            opacity: 0;
            transform: rotate(30deg) translateX(0) translateY(0) scaleX(0.3);
          }
          5% {
            opacity: 1;
            transform: rotate(30deg) translateX(30px) translateY(10px) scaleX(1);
          }
          40% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: rotate(30deg) translateX(600px) translateY(300px) scaleX(0.5);
          }
        }
      `}</style>
    </div>
  )
}
