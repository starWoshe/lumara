import { db } from '@lumara/database'

async function getOutreachStats() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    telegramToday,
    instagramToday,
    telegramByLang,
    instagramByLang,
    referralClicks,
  ] = await Promise.all([
    db.outreachResponse.count({
      where: { platform: 'TELEGRAM_GROUP', createdAt: { gte: todayStart } },
    }),
    db.outreachResponse.count({
      where: { platform: 'INSTAGRAM_COMMENT', createdAt: { gte: todayStart } },
    }),
    db.outreachResponse.groupBy({
      by: ['language'],
      where: { platform: 'TELEGRAM_GROUP', createdAt: { gte: todayStart } },
      _count: { id: true },
    }),
    db.outreachResponse.groupBy({
      by: ['language'],
      where: { platform: 'INSTAGRAM_COMMENT', createdAt: { gte: todayStart } },
      _count: { id: true },
    }),
    db.referralClick.count({
      where: {
        source: { in: ['telegram_group', 'instagram_comment'] },
        createdAt: { gte: todayStart },
      },
    }),
  ])

  const toLangMap = (rows: { language: string; _count: { id: number } }[]) => {
    const map: Record<string, number> = { UK: 0, RU: 0, EN: 0, DE: 0 }
    for (const row of rows) {
      map[row.language] = row._count.id
    }
    return map
  }

  return {
    telegram: { total: telegramToday, byLanguage: toLangMap(telegramByLang) },
    instagram: { total: instagramToday, byLanguage: toLangMap(instagramByLang) },
    referralClicks,
  }
}

export default async function AdminPage() {
  const stats = await getOutreachStats()

  const Card = ({
    title,
    value,
    sub,
  }: {
    title: string
    value: number
    sub?: React.ReactNode
  }) => (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      {sub && <div className="mt-3 text-sm text-gray-300">{sub}</div>}
    </div>
  )

  const LangBreakdown = ({ data }: { data: Record<string, number> }) => (
    <div className="flex gap-3 mt-2">
      {Object.entries(data).map(([lang, count]) => (
        <span
          key={lang}
          className="inline-flex items-center rounded-full bg-purple-900/40 px-3 py-1 text-xs font-medium text-purple-200"
        >
          {lang}: {count}
        </span>
      ))}
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-400 mb-2">LUMARA Admin</h1>
        <p className="text-gray-400 mb-8">Панель адміністратора</p>

        <h2 className="text-xl font-semibold text-white mb-4">🔍 Активний пошук</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="Відповідей у Telegram групах (сьогодні)"
            value={stats.telegram.total}
            sub={<LangBreakdown data={stats.telegram.byLanguage} />}
          />
          <Card
            title="Відповідей у Instagram (сьогодні)"
            value={stats.instagram.total}
            sub={<LangBreakdown data={stats.instagram.byLanguage} />}
          />
          <Card
            title="Переходів на сайт з групових відповідей (сьогодні)"
            value={stats.referralClicks}
          />
          <Card
            title="Всього активних контактів (сьогодні)"
            value={stats.telegram.total + stats.instagram.total}
          />
        </div>
      </div>
    </main>
  )
}
