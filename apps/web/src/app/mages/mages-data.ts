export interface Mage {
  id: string
  name: string
  role: string
  tagline: string
  heading: string
  description: string
  quote: string
  abilities: string[]
  stats: { sessions: string; rating: string; label: string }
  portrait: string
  portraitPosition: string
  room: string
  accentColor: string
  glowColor: string
  candleColor: string
  borderColor: string
  textAccent: string
  badgeBg: string
  ctaGradient: string
  particleColor: string
  starColor: string
}

export const mages: Mage[] = [
  {
    id: 'luna',
    name: 'LUNA',
    role: 'Астрологія',
    tagline: 'Провідник по небесних картах',
    heading: 'небесним провідником',
    description:
      'LUNA читає небесний код твого народження. Розкриває характер, таланти та ключові цикли життя через мову зірок. Кожна планета — послання, кожен аспект — підказка до твого шляху.',
    quote:
      'Зорі не керують твоєю долею — вони освітлюють шлях, який ти вже обрав. Я лише допомагаю тобі його побачити.',
    abilities: ['Натальна карта', 'Транзити планет', 'Синастрія', 'Прогнози'],
    stats: { sessions: '2 841', rating: '4.97', label: 'сесій проведено' },
    portrait: '/luna-portrait-1.png',
    portraitPosition: 'object-top',
    room: '/luna-room.png',
    accentColor: 'from-blue-600 to-indigo-600',
    glowColor: 'rgba(99,102,241,0.5)',
    candleColor: 'rgba(99,102,241,0.15)',
    borderColor: 'border-blue-500/30',
    textAccent: 'text-blue-300',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    ctaGradient: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
    particleColor: '#818cf8',
    starColor: 'rgba(165,180,252,0.9)',
  },
  {
    id: 'arcas',
    name: 'ARCAS',
    role: 'Таро / Оракул',
    tagline: 'Майстер символів та архетипів',
    heading: 'провідником у символах',
    description:
      'ARCAS відкриває двері між видимим і невидимим. Кожна карта — дзеркало твоєї душі та ключ до розуміння ситуації. Символи говорять мовою глибинної мудрості.',
    quote:
      'Карти не передбачають майбутнє — вони розкривають те, що вже живе всередині тебе. Кожен символ — дзеркало твоєї глибини.',
    abilities: ['Розклади Таро', 'Оракульні карти', 'Архетипний аналіз', 'Провісні читання'],
    stats: { sessions: '3 124', rating: '4.95', label: 'сесій проведено' },
    portrait: '/arcas-portrait-1.png',
    portraitPosition: 'object-[50%_75%]',
    room: '/arcas-room.png',
    accentColor: 'from-purple-600 to-violet-600',
    glowColor: 'rgba(139,92,246,0.5)',
    candleColor: 'rgba(139,92,246,0.15)',
    borderColor: 'border-purple-500/30',
    textAccent: 'text-purple-300',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    ctaGradient: 'from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500',
    particleColor: '#a78bfa',
    starColor: 'rgba(196,181,253,0.9)',
  },
  {
    id: 'numi',
    name: 'NUMI',
    role: 'Нумерологія',
    tagline: 'Дешифрувач числових кодів долі',
    heading: 'числовим провідником',
    description:
      "NUMI розшифровує числовий код твого життя. Кожна дата, кожне ім'я — математичний ключ до твоєї унікальної місії. Числа — найдавніша мова Всесвіту.",
    quote:
      'У кожному числі твого імені та дати народження зашифровано послання Всесвіту. Я читаю цей код — і разом ми розуміємо твою місію.',
    abilities: ['Число долі', 'Особистий рік', 'Матриця народження', 'Числа імені'],
    stats: { sessions: '1 987', rating: '4.96', label: 'сесій проведено' },
    portrait: '/numi-portrait-1.png',
    portraitPosition: 'object-center',
    room: '/numi-room.png',
    accentColor: 'from-amber-500 to-yellow-500',
    glowColor: 'rgba(245,158,11,0.5)',
    candleColor: 'rgba(245,158,11,0.15)',
    borderColor: 'border-amber-500/30',
    textAccent: 'text-amber-300',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ctaGradient: 'from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400',
    particleColor: '#fbbf24',
    starColor: 'rgba(252,211,77,0.9)',
  },
  {
    id: 'umbra',
    name: 'UMBRA',
    role: 'Езо-психологія',
    tagline: 'Провідник у глибини підсвідомого',
    heading: 'провідником у тінь',
    description:
      'UMBRA супроводжує в подорожі до тіні. Інтеграція несвідомих частин — шлях до справжньої цілісності та внутрішньої сили. Темрява — не ворог, а невідкрита частина тебе.',
    quote:
      'Тінь — не те, чого слід боятись. Це частина тебе, що чекає на зустріч. Я йду поруч у цій темряві — щоб ти знайшов у ній своє світло.',
    abilities: ['Тіньова робота', 'Архетипи Юнга', 'Медитації', 'Інтеграція частин'],
    stats: { sessions: '1 456', rating: '4.98', label: 'сесій проведено' },
    portrait: '/umbra-portrait-1.png',
    portraitPosition: 'object-[50%_75%]',
    room: '/umbra-room.png',
    accentColor: 'from-slate-500 to-gray-600',
    glowColor: 'rgba(100,116,139,0.5)',
    candleColor: 'rgba(100,116,139,0.15)',
    borderColor: 'border-slate-500/30',
    textAccent: 'text-slate-300',
    badgeBg: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    ctaGradient: 'from-slate-600 to-gray-700 hover:from-slate-500 hover:to-gray-600',
    particleColor: '#94a3b8',
    starColor: 'rgba(148,163,184,0.9)',
  },
]
