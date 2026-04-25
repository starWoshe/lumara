export const dynamic = 'force-dynamic'

import { getSessionUser } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { db } from '@lumara/database'

// Перенаправляє на Stripe Customer Portal для управління підпискою
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.id) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const subscription = await db.subscription.findFirst({
      where: { userId: session.id },
    })

    if (!subscription?.stripeCustomerId) {
      return NextResponse.redirect(new URL('/pricing', req.url))
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
    })

    return NextResponse.redirect(portalSession.url)
  } catch (error) {

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
