import Stripe from 'stripe'

// Lazy initialization: не створюємо клієнт на рівні модуля,
// щоб уникнути помилок під час білда якщо змінні середовища відсутні
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY не встановлено')
    _stripe = new Stripe(key, {
      apiVersion: '2026-03-25.dahlia' as const,
    })
  }
  return _stripe
}

// Константи планів
export const PLANS = {
  BASIC: {
    name: 'Basic',
    nameUk: 'Базовий',
    price: 180,
    currency: 'uah',
    priceId: process.env.STRIPE_PRICE_BASIC!,
    messagesPerMonth: 150,
    allAgents: true,
    historyEnabled: true,
    natalChartEnabled: false,
    opusModel: false,
    coursesEnabled: false,
  },
  PRO: {
    name: 'Pro',
    nameUk: 'Про',
    price: 450,
    currency: 'uah',
    priceId: process.env.STRIPE_PRICE_PRO!,
    messagesPerMonth: null, // безліміт
    allAgents: true,
    historyEnabled: true,
    natalChartEnabled: true,
    opusModel: false,
    coursesEnabled: false,
  },
  ELITE: {
    name: 'Elite',
    nameUk: 'Еліт',
    price: 1000,
    currency: 'uah',
    priceId: process.env.STRIPE_PRICE_ELITE!,
    messagesPerMonth: null, // безліміт
    allAgents: true,
    historyEnabled: true,
    natalChartEnabled: true,
    opusModel: true,
    coursesEnabled: true,
  },
} as const

export type PlanKey = keyof typeof PLANS

// Ліміт безкоштовних повідомлень (разовий, не щомісячний)
export const FREE_MESSAGES_LIMIT = 15
