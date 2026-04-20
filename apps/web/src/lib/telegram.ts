const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const ADMIN_CHAT_ID = '6127139155'

export async function sendTelegramAlert(message: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: message, parse_mode: 'HTML' }),
    })
  } catch {
    // Не блокуємо основний потік
  }
}
