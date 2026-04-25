export const dynamic = 'force-dynamic'

import { getSessionUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PLANS, type PlanKey } from '@/lib/stripe'
import { db } from '@lumara/database'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.id) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const plan = req.nextUrl.searchParams.get('plan') as PlanKey | null
    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Невірний план' }, { status: 400 })
    }

    const planConfig = PLANS[plan]
    const userId = session.id
    const email = session.email!

    // Знаходимо або створюємо Stripe Customer
    let subscription = await db.subscription.findFirst({ where: { userId } })
    let stripeCustomerId = subscription?.stripeCustomerId ?? null

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({ email, metadata: { userId } })
      stripeCustomerId = customer.id
    }

    // Створюємо Checkout Session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId, plan },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { userId, plan },
    })

    return NextResponse.redirect(checkoutSession.url!)
  } catch (error) {

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
