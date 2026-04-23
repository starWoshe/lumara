import { NextResponse } from 'next/server'
import { db } from '@lumara/database'
import { AgentType } from '@lumara/agents'
import { sendReactivationEmail } from '@/lib/email'

// Cron endpoint — реактивація мовчазних юзерів (запускається щодня о 12:00 UTC)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const hoursAgo28 = new Date(now.getTime() - 28 * 60 * 60 * 1000)
  const hoursAgo20 = new Date(now.getTime() - 20 * 60 * 60 * 1000)

  try {
    // Знаходимо юзерів які зареєструвались від 20 до 28 годин тому,
    // не отримували реактиваційний лист і не відписались від email
    const silentUsers = await db.user.findMany({
      where: {
        createdAt: {
          gte: hoursAgo28,
          lte: hoursAgo20,
        },
        reactivationSentAt: null,
        emailUnsubscribedAt: null,
        deletedAt: null,
        conversations: {
          none: {
            deletedAt: null,
            messages: {
              some: {
                role: 'USER',
                deletedAt: null,
              },
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        profile: {
          select: {
            fullName: true,
            lastVisitedAgent: true,
          },
        },
      },
    })

    let sent = 0
    let failed = 0

    for (const user of silentUsers) {
      // Визначаємо мага
      const agentType: AgentType =
        user.profile?.lastVisitedAgent ?? 'LUNA'

      try {
        await sendReactivationEmail(
          user.email,
          user.profile?.fullName ?? user.name,
          agentType
        )

        await db.user.update({
          where: { id: user.id },
          data: { reactivationSentAt: new Date() },
        })

        sent++
      } catch (err) {
        console.error(`[reactivation] Помилка надсилання для ${user.email}:`, err)
        failed++
      }
    }

    return NextResponse.json({
      ok: true,
      checked: silentUsers.length,
      sent,
      failed,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[reactivation] Помилка cron:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
