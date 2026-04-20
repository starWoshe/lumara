import { db } from '@lumara/database'
import { sendTelegramAlert } from './telegram'

const AGENT_ICONS: Record<string, string> = {
  LUNA: '🌙', ARCAS: '🃏', NUMI: '🔢', UMBRA: '🧠',
}

async function getSetting(key: string, fallback: number): Promise<number> {
  try {
    const s = await db.adminSetting.findUnique({ where: { key } })
    return s ? Number(s.value) : fallback
  } catch {
    return fallback
  }
}

export async function checkTokenAlerts(agent: string): Promise<void> {
  const [yellowLimit, redLimit, dailyBudget] = await Promise.all([
    getSetting('alert_yellow_tokens_per_hour', 50_000),
    getSetting('alert_red_tokens_per_hour', 200_000),
    getSetting('daily_budget_usd', 10),
  ])

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const icon = AGENT_ICONS[agent] ?? '🤖'

  // Перевірка годинного ліміту
  const hourlyResult = await db.tokenUsage.aggregate({
    where: { agent: agent as never, createdAt: { gte: oneHourAgo } },
    _sum: { tokensTotal: true },
  })
  const hourlyTokens = hourlyResult._sum.tokensTotal ?? 0

  if (hourlyTokens >= redLimit) {
    // Блокуємо мага на 1 годину
    await db.agent.update({
      where: { type: agent as never },
      data: { blockedUntil: new Date(Date.now() + 60 * 60 * 1000) },
    })
    await sendTelegramAlert(
      `🚨 <b>${agent} заблоковано</b>\nЛіміт токенів перевищено: ${hourlyTokens.toLocaleString()} за годину.\nАвтоматично призупинено на 1 годину.`
    )
  } else if (hourlyTokens >= yellowLimit) {
    await sendTelegramAlert(
      `⚠️ <b>${icon} ${agent} надто активний</b>\n${hourlyTokens.toLocaleString()} токенів за останню годину.\nПеревір що відбувається.`
    )
  }

  // Перевірка денного бюджету
  const dailyResult = await db.tokenUsage.aggregate({
    where: { createdAt: { gte: todayStart } },
    _sum: { costUsd: true },
  })
  const dailyCost = dailyResult._sum.costUsd ?? 0

  if (dailyCost >= dailyBudget) {
    await sendTelegramAlert(
      `💰 <b>Денний бюджет $${dailyBudget} вичерпано</b>\nВитрачено: $${dailyCost.toFixed(4)}\nПеревір адмін-панель: lumara.fyi/admin`
    )
  }
}
