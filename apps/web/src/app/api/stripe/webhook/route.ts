import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { db } from '@lumara/database'
import type { SubscriptionPlan, SubscriptionStatus } from '@lumara/database'

// Маппінг Stripe план → Prisma enum
const STRIPE_PLAN_MAP: Record<string, SubscriptionPlan> = {
  BASIC: 'BASIC',
  PRO: 'PRO',
  ELITE: 'ELITE',
}

const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'ACTIVE',
  trialing: 'TRIALING',
  past_due: 'PAST_DUE',
  canceled: 'CANCELED',
  incomplete: 'INACTIVE',
  incomplete_expired: 'INACTIVE',
  unpaid: 'PAST_DUE',
  paused: 'INACTIVE',
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {

    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(checkoutSession)
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(sub)
        break
      }
    }
  } catch (error) {

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan

  if (!userId || !plan || !STRIPE_PLAN_MAP[plan]) return

  const stripeSubId = session.subscription as string
  const stripeSub = await getStripe().subscriptions.retrieve(stripeSubId) as unknown as { items: { data: Array<{ price: { id: string } }> }, status: string, current_period_start?: number, current_period_end?: number }

  await db.subscription.upsert({
    where: { stripeCustomerId: session.customer as string },
    create: {
      userId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: stripeSubId,
      stripePriceId: stripeSub.items.data[0]?.price.id,
      plan: STRIPE_PLAN_MAP[plan],
      status: STRIPE_STATUS_MAP[stripeSub.status] ?? 'ACTIVE',
      currentPeriodStart: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : null,
      currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
    },
    update: {
      stripeSubscriptionId: stripeSubId,
      stripePriceId: stripeSub.items.data[0]?.price.id,
      plan: STRIPE_PLAN_MAP[plan],
      status: STRIPE_STATUS_MAP[stripeSub.status] ?? 'ACTIVE',
      currentPeriodStart: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : null,
      currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
    },
  })
}

async function handleSubscriptionChange(stripeSub: { id: string, status: string, current_period_start?: number, current_period_end?: number }) {
  const existing = await db.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSub.id },
  })
  if (!existing) return

  const newStatus = STRIPE_STATUS_MAP[stripeSub.status] ?? 'INACTIVE'

  await db.subscription.update({
    where: { id: existing.id },
    data: {
      status: newStatus,
      currentPeriodStart: stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : null,
      currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
    },
  })
}
