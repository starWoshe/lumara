import Link from 'next/link'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FREE_MESSAGES_LIMIT } from '@/lib/stripe'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Тарифи — LUMARA Academy' }

const plans = [
  {
    key: 'FREE',
    name: 'Безкоштовно',
    price: null,
    description: 'Відчуй силу LUMARA',
    emoji: '🌑',
    features: [
      `${FREE_MESSAGES_LIMIT} повідомлень (разово)`,
      'Доступ до LUNA',
      'Базові відповіді',
    ],
    limitations: [
      'Без збереження історії',
      'Без натальної карти',
    ],
    cta: 'Почати безкоштовно',
    href: '/login',
    highlighted: false,
    glow: '',
  },
  {
    key: 'BASIC',
    name: 'Базовий',
    price: 180,
    description: 'Для тих, хто досліджує',
    emoji: '🌙',
    features: [
      '150 повідомлень на місяць',
      'Всі 4 агенти',
      'Збереження історії сесій',
    ],
    limitations: [
      'Без натальної карти',
      'Без курсів',
    ],
    cta: 'Обрати Базовий',
    href: '/api/stripe/checkout?plan=BASIC',
    highlighted: false,
    glow: '',
  },
  {
    key: 'PRO',
    name: 'Про',
    price: 450,
    description: 'Для серйозної практики',
    emoji: '⭐',
    features: [
      'Необмежені повідомлення',
      'Всі 4 агенти',
      'Збереження історії сесій',
      'Персональна натальна карта',
    ],
    limitations: [],
    cta: 'Обрати Про',
    href: '/api/stripe/checkout?plan=PRO',
    highlighted: true,
    glow: 'shadow-[0_0_60px_rgba(192,64,240,0.25)]',
  },
  {
    key: 'ELITE',
    name: 'Еліт',
    price: 1000,
    description: 'Максимальна глибина',
    emoji: '✨',
    features: [
      'Необмежені повідомлення',
      'Всі 4 агенти',
      'Збереження історії сесій',
      'Персональна натальна карта',
      'Модель Claude Opus (глибший аналіз)',
      'Доступ до курсів академії',
    ],
    limitations: [],
    cta: 'Обрати Еліт',
    href: '/api/stripe/checkout?plan=ELITE',
    highlighted: false,
    glow: 'shadow-[0_0_40px_rgba(251,191,36,0.1)]',
  },
]

export default async function PricingPage() {
  const session = await getServerSession(authOptions)

  return (
    <main className="min-h-screen relative overflow-hidden bg-black">

      {/* Фонове зображення — зоряне небо */}
      <Image
        src="/starry-sky.jpg"
        alt=""
        fill
        className="object-cover object-center opacity-60"
        priority
      />

      {/* Градієнти поверх */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90 pointer-events-none" />
      {/* Фіолетове світіння по центру */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-lumara-700/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Навігація */}
      <nav className="relative z-10 border-b border-white/5 backdrop-blur-md bg-black/30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/lumara-logo.png" alt="LUMARA" width={36} height={36} className="rounded-full" />
            <span className="font-display text-2xl font-bold bg-gradient-to-r from-lumara-300 to-gold-400 bg-clip-text text-transparent">
              LUMARA
            </span>
          </Link>
          {session ? (
            <Link href="/dashboard" className="text-white/60 hover:text-white text-sm transition-colors">
              До академії →
            </Link>
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-r from-lumara-600 to-lumara-500 text-white text-sm font-medium px-5 py-2 rounded-xl hover:from-lumara-500 hover:to-lumara-400 transition-all"
            >
              Увійти
            </Link>
          )}
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">

        {/* Заголовок */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-lumara-950/60 border border-lumara-700/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-lumara-400 animate-pulse" />
            <span className="text-lumara-300 text-xs tracking-wider uppercase">7 днів безкоштовно</span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold mb-5 leading-tight">
            <span className="bg-gradient-to-br from-white via-lumara-200 to-lumara-400 bg-clip-text text-transparent">
              Обери свій шлях
            </span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto leading-relaxed">
            Від першого знайомства до глибокої практики —<br />LUMARA супроводжує на кожному рівні
          </p>
        </div>

        {/* Картки планів */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl p-6 border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 ${plan.glow} ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-lumara-900/50 to-black/60 border-lumara-500/40'
                  : 'bg-black/30 border-white/8 hover:border-white/15'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-lumara-600 to-lumara-400 text-white text-xs font-bold px-4 py-1 rounded-full tracking-wide">
                    ✦ Найпопулярніший
                  </span>
                </div>
              )}

              {/* Емодзі і назва */}
              <div className="mb-5">
                <div className="text-3xl mb-3">{plan.emoji}</div>
                <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                <p className="text-white/35 text-xs tracking-wide">{plan.description}</p>
              </div>

              {/* Ціна */}
              <div className="mb-6 pb-6 border-b border-white/8">
                {plan.price ? (
                  <div className="flex items-end gap-1.5">
                    <span className={`font-display text-4xl font-bold ${plan.highlighted ? 'text-lumara-300' : 'text-white'}`}>
                      {plan.price}
                    </span>
                    <span className="text-white/40 text-sm mb-1">грн/міс</span>
                  </div>
                ) : (
                  <div className="flex items-end gap-1.5">
                    <span className="font-display text-4xl font-bold text-white">0</span>
                    <span className="text-white/40 text-sm mb-1">грн</span>
                  </div>
                )}
              </div>

              {/* Фічі */}
              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/65">
                    <span className={`mt-0.5 flex-shrink-0 text-xs ${plan.highlighted ? 'text-lumara-400' : 'text-white/40'}`}>✦</span>
                    {f}
                  </li>
                ))}
                {plan.limitations.map((l) => (
                  <li key={l} className="flex items-start gap-2.5 text-sm text-white/20">
                    <span className="mt-0.5 flex-shrink-0 text-xs">—</span>
                    {l}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-lumara-600 to-lumara-500 text-white hover:from-lumara-500 hover:to-lumara-400 shadow-[0_0_25px_rgba(192,64,240,0.4)]'
                    : 'bg-white/6 text-white/70 hover:bg-white/12 hover:text-white border border-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Примітка */}
        <p className="text-center text-white/20 text-sm mt-12">
          Всі платні плани включають 7-денний безкоштовний пробний період · Скасування в будь-який момент
        </p>
      </div>
    </main>
  )
}
