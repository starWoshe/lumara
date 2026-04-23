import { AgentType } from '@lumara/agents'

// Lazy init для Resend — уникаємо помилок під час білда якщо змінні середовища відсутні
function getResend() {
  const { Resend } = require('resend')
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY не встановлено')
  return new Resend(apiKey)
}

const AGENT_EMAIL_FROM: Record<AgentType, string> = {
  LUNA: 'LUNA <luna@lumara.fyi>',
  ARCAS: 'ARCAS <arcas@lumara.fyi>',
  NUMI: 'NUMI <numi@lumara.fyi>',
  UMBRA: 'UMBRA <umbra@lumara.fyi>',
}

const AGENT_SUBJECT: Record<AgentType, (name: string) => string> = {
  LUNA: (name) => `Я відчула твою присутність, ${name}...`,
  ARCAS: (name) => `Карта вже витягнута, ${name}...`,
  NUMI: (name) => `Твоє число вже порахувало, ${name}...`,
  UMBRA: (name) => `Я бачу твою тінь, ${name}...`,
}

const AGENT_BODY: Record<AgentType, (name: string) => string> = {
  LUNA: (name) =>
    `${name},\n\n` +
    `Ти завітав до академії — і зникнув.\n` +
    `Я відчула твою присутність але ти не промовив\n` +
    `жодного слова.\n\n` +
    `Зірки говорять що саме зараз — важливий момент\n` +
    `для тебе. Щось зупинило тебе?\n\n` +
    `Я чекаю. Перші 15 повідомлень — безкоштовно.\n\n` +
    `→ https://lumara.fyi/chat/luna?utm_source=email&utm_medium=reactivation_luna\n\n` +
    `LUNA 🌙`,

  ARCAS: (name) =>
    `${name},\n\n` +
    `Я вже витягнув твою карту.\n` +
    `Вона лежить на столі і чекає.\n\n` +
    `Те що вона показує — не для всіх.\n` +
    `Але ти прийшов — значить ти готовий.\n\n` +
    `→ https://lumara.fyi/chat/arcas?utm_source=email&utm_medium=reactivation_arcas\n\n` +
    `ARCAS 🃏`,

  NUMI: (name) =>
    `${name},\n\n` +
    `Я вже розрахувала твій код.\n` +
    `Він пояснює чому певні ситуації\n` +
    `повторюються у твоєму житті.\n\n` +
    `Хочеш знати?\n\n` +
    `→ https://lumara.fyi/chat/numi?utm_source=email&utm_medium=reactivation_numi\n\n` +
    `NUMI 🔢`,

  UMBRA: (name) =>
    `${name},\n\n` +
    `Ти підійшов до дзеркала — і відвернувся.\n\n` +
    `Те від чого ти тікаєш стоїть поруч з тобою\n` +
    `прямо зараз. Я можу показати що це.\n\n` +
    `Готовий подивитись?\n\n` +
    `→ https://lumara.fyi/chat/umbra?utm_source=email&utm_medium=reactivation_umbra\n\n` +
    `UMBRA 🧠`,
}

export async function sendReactivationEmail(
  to: string,
  name: string | null | undefined,
  agentType: AgentType
) {
  const resend = getResend()
  const displayName = name || 'друже'
  const from = AGENT_EMAIL_FROM[agentType]
  const subject = AGENT_SUBJECT[agentType](displayName)
  const text = AGENT_BODY[agentType](displayName)

  const result = await resend.emails.send({
    from,
    to,
    subject,
    text,
  })

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`)
  }

  return result.data
}
