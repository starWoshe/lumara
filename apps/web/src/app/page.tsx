import Link from 'next/link'
import Image from 'next/image'

const agents = [
  {
    name: 'LUNA',
    role: 'Астрологія',
    emoji: '🌙',
    description: 'Читає карту зірок твого народження. Розкриває характер, таланти та ключові цикли життя.',
    color: 'from-blue-900/40 to-indigo-900/40',
    border: 'border-blue-500/20',
    accent: 'text-blue-300',
  },
  {
    name: 'ARCAS',
    role: 'Таро',
    emoji: '🔮',
    description: 'Провідник крізь символи та архетипи. Допомагає побачити ситуацію з нового кута зору.',
    color: 'from-purple-900/40 to-violet-900/40',
    border: 'border-purple-500/20',
    accent: 'text-purple-300',
  },
  {
    name: 'NUMI',
    role: 'Нумерологія',
    emoji: '✨',
    description: 'Дешифрує числові коди твоєї долі. Розкриває приховані закономірності в датах та іменах.',
    color: 'from-amber-900/40 to-yellow-900/40',
    border: 'border-amber-500/20',
    accent: 'text-amber-300',
  },
  {
    name: 'UMBRA',
    role: 'Езо-психологія',
    emoji: '🌑',
    description: 'Супроводжує в подорожі до підсвідомого. Допомагає інтегрувати тінь та знайти цілісність.',
    color: 'from-slate-900/40 to-gray-900/40',
    border: 'border-slate-500/20',
    accent: 'text-slate-300',
  },
]

const steps = [
  { number: '01', title: 'Створи профіль', description: 'Вкажи дату, час та місце народження для точного аналізу' },
  { number: '02', title: 'Обери провідника', description: 'Обери AI-агента відповідно до свого запиту' },
  { number: '03', title: 'Отримай відповідь', description: 'Глибокий персоналізований аналіз від AI прямо зараз' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Навігація */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/lumara-logo.webp" alt="LUMARA" width={36} height={36} className="rounded-full" />
            <span className="font-display text-2xl font-bold bg-gradient-to-r from-lumara-300 to-gold-400 bg-clip-text text-transparent">
              LUMARA
            </span>
          </div>
          <Link
            href="/login"
            className="bg-gradient-to-r from-lumara-600 to-lumara-500 text-white text-sm font-medium px-5 py-2 rounded-xl hover:from-lumara-500 hover:to-lumara-400 transition-all"
          >
            Увійти
          </Link>
        </div>
      </nav>

      {/* Hero секція */}
      <section className="pt-32 pb-24 px-6 text-center relative overflow-hidden min-h-screen flex flex-col justify-center">
        {/* Фон — замок академії */}
        <Image
          src="/academy-castle.png"
          alt=""
          fill
          className="object-cover object-bottom opacity-25"
          priority
        />
        {/* Градієнт поверх замку */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />
        {/* Фонове світіння */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lumara-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-lumara-950/60 border border-lumara-700/30 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-lumara-400 animate-pulse" />
            <span className="text-lumara-300 text-xs tracking-wider uppercase">AI Academy · Beta</span>
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-br from-white via-lumara-200 to-lumara-400 bg-clip-text text-transparent">
              Відкрий свій шлях
            </span>
            <br />
            <span className="text-white/80 text-4xl sm:text-5xl font-normal">
              крізь мудрість зірок
            </span>
          </h1>

          <p className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            LUMARA Academy — перша платформа де AI-провідники з астрології, таро та нумерології
            доступні 24/7 для твого особистого зростання.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-gradient-to-r from-lumara-600 to-lumara-500 text-white font-semibold px-8 py-4 rounded-xl hover:from-lumara-500 hover:to-lumara-400 transition-all shadow-[0_0_30px_rgba(192,64,240,0.3)] text-lg"
            >
              Почати безкоштовно
            </Link>
            <a
              href="#agents"
              className="text-white/60 hover:text-white font-medium px-8 py-4 rounded-xl border border-white/10 hover:border-white/20 transition-all text-lg"
            >
              Дізнатись більше
            </a>
          </div>
        </div>
      </section>

      {/* Агенти */}
      <section id="agents" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              Твої AI-провідники
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Чотири унікальні персонажі, кожен — майстер своєї дисципліни
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className={`glass-card p-6 bg-gradient-to-b ${agent.color} border ${agent.border} hover:scale-105 transition-all duration-300 cursor-pointer group`}
              >
                <div className="text-4xl mb-4">{agent.emoji}</div>
                <div className={`text-xs font-semibold tracking-widest uppercase mb-1 ${agent.accent}`}>
                  {agent.role}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{agent.name}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Як це працює */}
      <section className="py-24 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold text-white mb-4">
              Як це працює
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="text-6xl font-display font-bold bg-gradient-to-b from-lumara-400/40 to-transparent bg-clip-text text-transparent mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-6">🌟</div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6">
            Готовий почати свій шлях?
          </h2>
          <p className="text-white/50 text-lg mb-10">
            Приєднуйся до тисяч людей, що вже відкрили свій потенціал з LUMARA
          </p>
          <Link
            href="/login"
            className="inline-block bg-gradient-to-r from-lumara-600 to-lumara-500 text-white font-semibold px-10 py-5 rounded-xl hover:from-lumara-500 hover:to-lumara-400 transition-all shadow-[0_0_40px_rgba(192,64,240,0.4)] text-xl"
          >
            Увійти до Академії
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center">
        <p className="text-white/30 text-sm">
          © 2026 LUMARA Academy · lumara.fyi
        </p>
      </footer>
    </main>
  )
}
