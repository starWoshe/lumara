// Тимчасова головна сторінка — буде замінена на повний Landing page
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="glass-card p-12 text-center max-w-2xl w-full animate-fade-in">
        {/* Логотип */}
        <div className="mb-8">
          <span className="font-display text-6xl font-bold bg-gradient-to-r from-lumara-300 to-gold-400 bg-clip-text text-transparent">
            LUMARA
          </span>
          <p className="text-lumara-300 text-lg mt-2 tracking-[0.3em] uppercase">
            Academy
          </p>
        </div>

        {/* Підзаголовок */}
        <p className="text-white/60 text-lg mb-8">
          Академія містичного пізнання
        </p>

        {/* Агенти */}
        <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4">
          {[
            { name: 'LUNA', role: 'Астрологія', emoji: '🌙' },
            { name: 'ARCAS', role: 'Таро', emoji: '🔮' },
            { name: 'NUMI', role: 'Нумерологія', emoji: '✨' },
            { name: 'UMBRA', role: 'Езо-психологія', emoji: '🌑' },
          ].map((agent) => (
            <div key={agent.name} className="glass-card p-4 text-center">
              <div className="text-2xl mb-1">{agent.emoji}</div>
              <div className="font-semibold text-lumara-300 text-sm">{agent.name}</div>
              <div className="text-white/40 text-xs">{agent.role}</div>
            </div>
          ))}
        </div>

        {/* Статус */}
        <div className="inline-flex items-center gap-2 bg-lumara-950/50 border border-lumara-700/30 rounded-full px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-white/60">Розробка в процесі · MVP незабаром</span>
        </div>
      </div>
    </main>
  )
}
