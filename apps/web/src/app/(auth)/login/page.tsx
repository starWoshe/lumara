'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Короткі образи магів — з'являються під карточкою
const MAGE_TEASERS = [
  { id: 'luna',  name: 'LUNA',  role: 'Астрологія',    portrait: '/luna-portrait-1.png',  accent: 'rgba(99,102,241,0.6)',  pos: 'object-[50%_8%]' },
  { id: 'arcas', name: 'ARCAS', role: 'Таро',          portrait: '/arcas-portrait-1.png', accent: 'rgba(139,92,246,0.6)', pos: 'object-[50%_15%]' },
  { id: 'numi',  name: 'NUMI',  role: 'Нумерологія',   portrait: '/numi-portrait-1.png',  accent: 'rgba(245,158,11,0.6)', pos: 'object-[50%_50%]' },
  { id: 'umbra', name: 'UMBRA', role: 'Езо-психологія',portrait: '/umbra-portrait-1.png', accent: 'rgba(100,116,139,0.6)',pos: 'object-[50%_25%]' },
]

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    console.log('Button clicked, callbackUrl:', callbackUrl)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(callbackUrl)}`,
        },
      })
      if (error) {
        console.error('Supabase OAuth error:', error)
        alert('Помилка входу: ' + error.message)
      } else if (data?.url) {
        window.location.href = data.url
      } else {
        console.error('No URL returned from Supabase OAuth')
        alert('Не вдалося отримати посилання для входу')
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('Неочікувана помилка: ' + (err instanceof Error ? err.message : String(err)))
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-6">

      {/* ── Картка входу ── */}
      <div
        className="w-full rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: 'rgba(10, 8, 20, 0.85)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 0 60px rgba(99,102,241,0.12), 0 0 120px rgba(99,102,241,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Декоративна лінія зверху */}
        <div
          className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(165,180,252,0.5), rgba(196,181,253,0.4), transparent)' }}
        />

        <div className="p-7 sm:p-9 flex flex-col items-center">

          {/* Логотип + назва */}
          <div className="mb-7 flex flex-col items-center">
            <div className="relative mb-4">
              {/* Аура навколо логотипу */}
              <div
                className="absolute inset-0 rounded-full blur-xl scale-150"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4), transparent 70%)' }}
              />
              <Image
                src="/lumara-logo.png"
                alt="LUMARA Academy"
                width={72}
                height={72}
                className="relative rounded-full"
                priority
              />
            </div>
            <span className="font-display text-3xl font-bold bg-gradient-to-r from-lumara-300 to-gold-400 bg-clip-text text-transparent tracking-wide">
              LUMARA
            </span>
            <p className="text-lumara-300/50 tracking-[0.35em] text-xs uppercase mt-1">
              Academy
            </p>
          </div>

          {/* Містичний роздільник */}
          <div className="flex items-center gap-3 w-full mb-7">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/15" />
            <span className="text-white/25 text-xs tracking-widest">✦ ✦ ✦</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/15" />
          </div>

          {/* Заголовок */}
          <h1 className="text-white font-semibold text-lg mb-1.5 text-center">
            Вхід до Академії
          </h1>
          <p className="text-white/45 text-sm mb-8 text-center leading-relaxed">
            Відкрий свій шлях разом із провідниками зірок,
            <br className="hidden sm:block" /> карт та числових таємниць
          </p>

          {/* Кнопка Google */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 font-medium py-3.5 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.94)',
              color: '#1a1a2e',
              boxShadow: '0 0 20px rgba(255,255,255,0.08)',
            }}
          >
            {loading ? (
              <Spinner />
            ) : (
              <GoogleIcon />
            )}
            <span>{loading ? 'Відкриваємо двері...' : 'Увійти через Google'}</span>
          </button>

          {/* Роздільник "або" */}
          <div className="flex items-center gap-3 w-full my-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/20 text-xs">або</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Посилання на головну */}
          <Link
            href="/"
            className="text-white/35 text-xs hover:text-white/60 transition-colors text-center"
          >
            ← Повернутись на головну
          </Link>

          {/* Декоративна лінія знизу */}
          <div className="mt-7 flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/8" />
            <span className="text-white/15 text-xs tracking-widest">✦</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/8" />
          </div>

          <p className="text-white/20 text-xs mt-4 text-center leading-relaxed">
            Реєструючись, ти погоджуєшся з{' '}
            <span className="underline underline-offset-2 cursor-pointer hover:text-white/40 transition-colors">
              умовами використання
            </span>
          </p>
        </div>

        {/* Декоративна лінія знизу */}
        <div
          className="h-px w-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(196,181,253,0.3), rgba(165,180,252,0.4), transparent)' }}
        />
      </div>

      {/* ── Магічні провідники (прев'ю) ── */}
      <div className="w-full">
        <p className="text-white/25 text-xs text-center tracking-widest uppercase mb-3">
          Твої провідники чекають
        </p>
        <div className="flex justify-center gap-3">
          {MAGE_TEASERS.map((m) => (
            <div
              key={m.id}
              className="flex flex-col items-center gap-1.5 group"
              title={`${m.name} — ${m.role}`}
            >
              <div
                className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 group-hover:border-white/25 transition-all duration-300"
                style={{ boxShadow: `0 0 12px ${m.accent}` }}
              >
                <Image
                  src={m.portrait}
                  alt={m.name}
                  fill
                  className={`object-cover ${m.pos} scale-110`}
                  sizes="48px"
                />
                {/* Легке затемнення */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
              </div>
              <span className="text-white/30 text-xs group-hover:text-white/55 transition-colors duration-300 font-medium">
                {m.name}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
