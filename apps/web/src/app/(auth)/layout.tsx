import Image from 'next/image'

// Фіксовані позиції зірок (детерміновані — не Math.random() в Server Component)
const STARS = [
  { x: 8,  y: 12, s: 2, o: 0.7, d: 2.1 },
  { x: 17, y: 5,  s: 1, o: 0.4, d: 3.8 },
  { x: 31, y: 22, s: 2, o: 0.6, d: 1.5 },
  { x: 44, y: 8,  s: 1, o: 0.5, d: 4.2 },
  { x: 57, y: 18, s: 3, o: 0.8, d: 2.7 },
  { x: 69, y: 4,  s: 1, o: 0.3, d: 5.1 },
  { x: 78, y: 15, s: 2, o: 0.6, d: 1.9 },
  { x: 91, y: 9,  s: 1, o: 0.5, d: 3.3 },
  { x: 5,  y: 35, s: 1, o: 0.4, d: 4.6 },
  { x: 24, y: 48, s: 2, o: 0.7, d: 2.3 },
  { x: 38, y: 31, s: 1, o: 0.3, d: 6.0 },
  { x: 52, y: 55, s: 2, o: 0.5, d: 1.7 },
  { x: 63, y: 42, s: 1, o: 0.6, d: 3.9 },
  { x: 75, y: 60, s: 3, o: 0.8, d: 2.5 },
  { x: 87, y: 38, s: 1, o: 0.4, d: 5.4 },
  { x: 13, y: 72, s: 2, o: 0.5, d: 1.3 },
  { x: 29, y: 80, s: 1, o: 0.3, d: 4.0 },
  { x: 46, y: 75, s: 2, o: 0.7, d: 2.9 },
  { x: 61, y: 85, s: 1, o: 0.4, d: 3.5 },
  { x: 82, y: 78, s: 2, o: 0.6, d: 1.8 },
  { x: 94, y: 65, s: 1, o: 0.5, d: 4.7 },
  { x: 20, y: 92, s: 3, o: 0.9, d: 2.2 },
  { x: 55, y: 95, s: 1, o: 0.4, d: 5.6 },
  { x: 73, y: 88, s: 2, o: 0.6, d: 3.1 },
]

// Фіксовані частинки
const PARTICLES = [
  { x: 15, y: 70, delay: 0,   dur: 7 },
  { x: 28, y: 55, delay: 1.5, dur: 9 },
  { x: 42, y: 80, delay: 3,   dur: 6 },
  { x: 58, y: 65, delay: 0.8, dur: 8 },
  { x: 72, y: 75, delay: 2.2, dur: 7 },
  { x: 85, y: 60, delay: 4,   dur: 9 },
  { x: 35, y: 85, delay: 1,   dur: 6 },
  { x: 65, y: 90, delay: 2.8, dur: 8 },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#060610]">

      {/* ── Фон — замок академії ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/academy-castle.png"
          alt=""
          fill
          className="object-cover object-center opacity-30"
          priority
        />
        {/* Градієнти затемнення */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060610] via-transparent to-transparent opacity-80" />
        {/* Виньєтка */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.88) 100%)' }}
        />
      </div>

      {/* ── Мерехтіння свічок ── */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="auth-candle-1 absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.15) 0%, transparent 70%)' }} />
        <div className="auth-candle-2 absolute bottom-0 right-1/4 w-56 h-56 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.10) 0%, transparent 70%)' }} />
        {/* Містичне фіолетово-синє сяйво в центрі */}
        <div className="auth-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* ── Зірки ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {STARS.map((star, i) => (
          <span
            key={i}
            className="auth-star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.s}px`,
              height: `${star.s}px`,
              opacity: star.o,
              animationDuration: `${star.d}s`,
              animationDelay: `${-star.d * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* ── Частинки ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="auth-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>

      {/* ── Туман знизу ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 z-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(6,6,16,1) 0%, rgba(6,6,16,0.5) 60%, transparent 100%)' }}
        aria-hidden="true"
      />

      {/* ── Контент ── */}
      <div className="relative z-10 w-full flex items-center justify-center py-12">
        {children}
      </div>

      {/* ── CSS анімації ── */}
      <style>{`
        .auth-star {
          position: absolute;
          border-radius: 50%;
          background: rgba(200, 210, 255, 0.9);
          animation: auth-twinkle linear infinite;
        }
        @keyframes auth-twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.4); }
        }

        .auth-particle {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: rgba(165, 180, 252, 0.8);
          box-shadow: 0 0 6px 2px rgba(165, 180, 252, 0.5);
          opacity: 0;
          animation: auth-float linear infinite;
        }
        @keyframes auth-float {
          0% { opacity: 0; transform: translateY(0) scale(0); }
          20% { opacity: 0.8; transform: translateY(-20px) scale(1); }
          80% { opacity: 0.3; transform: translateY(-80px) scale(0.7); }
          100% { opacity: 0; transform: translateY(-110px) scale(0); }
        }

        .auth-candle-1 { animation: candle-a 3.5s infinite ease-in-out; }
        .auth-candle-2 { animation: candle-a 5s 1.2s infinite ease-in-out; }
        .auth-glow { animation: candle-a 8s 2s infinite ease-in-out; }
        @keyframes candle-a {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          30% { opacity: 0.3; transform: scale(1.1) skewX(1deg); }
          60% { opacity: 0.7; transform: scale(0.95); }
          80% { opacity: 0.45; transform: scale(1.05) skewX(-1deg); }
        }
      `}</style>
    </div>
  )
}
