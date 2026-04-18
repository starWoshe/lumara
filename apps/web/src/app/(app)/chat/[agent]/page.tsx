'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

type AgentType = 'LUNA' | 'ARCAS' | 'NUMI' | 'UMBRA'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Детерміновані частинки для кожного мага
const PARTICLES: Record<AgentType, Array<{ x: number; y: number; delay: number; dur: number; size: number }>> = {
  LUNA: [
    { x: 12, y: 75, delay: 0,   dur: 7,   size: 2 },
    { x: 28, y: 60, delay: 1.5, dur: 9,   size: 1 },
    { x: 45, y: 80, delay: 3,   dur: 6,   size: 2 },
    { x: 63, y: 70, delay: 0.8, dur: 8,   size: 1 },
    { x: 78, y: 65, delay: 2.2, dur: 7,   size: 2 },
    { x: 88, y: 78, delay: 4,   dur: 9,   size: 1 },
    { x: 20, y: 85, delay: 1,   dur: 6,   size: 1 },
    { x: 55, y: 90, delay: 2.8, dur: 8,   size: 2 },
    { x: 35, y: 55, delay: 0.5, dur: 10,  size: 1 },
    { x: 70, y: 88, delay: 3.5, dur: 7,   size: 1 },
  ],
  ARCAS: [
    { x: 15, y: 80, delay: 0,   dur: 8,   size: 2 },
    { x: 32, y: 70, delay: 2,   dur: 6,   size: 1 },
    { x: 50, y: 85, delay: 1,   dur: 9,   size: 2 },
    { x: 68, y: 75, delay: 3,   dur: 7,   size: 1 },
    { x: 82, y: 82, delay: 0.5, dur: 8,   size: 2 },
    { x: 25, y: 90, delay: 1.8, dur: 6,   size: 1 },
    { x: 42, y: 60, delay: 3.5, dur: 10,  size: 1 },
    { x: 60, y: 88, delay: 0.3, dur: 7,   size: 2 },
    { x: 75, y: 65, delay: 2.5, dur: 9,   size: 1 },
    { x: 90, y: 78, delay: 4,   dur: 6,   size: 1 },
  ],
  NUMI: [
    { x: 10, y: 82, delay: 0,   dur: 6,   size: 2 },
    { x: 27, y: 68, delay: 1.2, dur: 8,   size: 1 },
    { x: 44, y: 78, delay: 2.5, dur: 7,   size: 2 },
    { x: 61, y: 85, delay: 0.7, dur: 9,   size: 1 },
    { x: 77, y: 72, delay: 3.2, dur: 6,   size: 2 },
    { x: 92, y: 80, delay: 1.5, dur: 8,   size: 1 },
    { x: 18, y: 88, delay: 4,   dur: 7,   size: 1 },
    { x: 52, y: 92, delay: 0.4, dur: 9,   size: 2 },
    { x: 36, y: 62, delay: 2,   dur: 6,   size: 1 },
    { x: 83, y: 90, delay: 3.8, dur: 8,   size: 1 },
  ],
  UMBRA: [
    { x: 20, y: 78, delay: 0,   dur: 10,  size: 2 },
    { x: 38, y: 65, delay: 2.5, dur: 12,  size: 1 },
    { x: 55, y: 82, delay: 1,   dur: 9,   size: 2 },
    { x: 72, y: 72, delay: 3.5, dur: 11,  size: 1 },
    { x: 85, y: 85, delay: 0.8, dur: 10,  size: 2 },
    { x: 12, y: 90, delay: 2,   dur: 8,   size: 1 },
    { x: 45, y: 58, delay: 4,   dur: 12,  size: 1 },
    { x: 62, y: 88, delay: 1.5, dur: 9,   size: 2 },
    { x: 30, y: 75, delay: 3,   dur: 11,  size: 1 },
    { x: 78, y: 62, delay: 0.3, dur: 10,  size: 1 },
  ],
}

const agentInfo: Record<AgentType, {
  emoji: string
  name: string
  role: string
  placeholder: string
  avatar?: string
  avatarPos?: string
  room: string
  roomPos: string
  bgColor: string
  accentColor: string
  headerBg: string
  overlayColor: string
  candleColors: string[]
  particleColor: string
  particleGlow: string
  glowColor: string
  glowPos: string
  borderColor: string
}> = {
  LUNA: {
    emoji: '🌙',
    name: 'LUNA',
    role: 'Астрологія',
    placeholder: 'Запитай LUNA про своє небесне послання...',
    avatar: '/luna-avatar.png',
    avatarPos: 'object-top',
    room: '/luna-room.png',
    roomPos: 'object-top md:object-[50%_55%]',
    bgColor: 'from-blue-950 via-indigo-950 to-slate-950',
    accentColor: 'bg-blue-600/60',
    headerBg: 'bg-blue-950/80',
    overlayColor: 'from-blue-950/80 via-indigo-950/60 to-slate-950/85',
    candleColors: [
      'rgba(251,146,60,0.18)',
      'rgba(251,191,36,0.12)',
      'rgba(99,102,241,0.20)',
      'rgba(147,197,253,0.12)',
    ],
    particleColor: 'rgba(165,180,252,0.9)',
    particleGlow: '0 0 6px 2px rgba(165,180,252,0.6)',
    glowColor: 'rgba(99,102,241,0.25)',
    glowPos: '30% 70%',
    borderColor: 'border-blue-400/40',
  },
  ARCAS: {
    emoji: '🔮',
    name: 'ARCAS',
    role: 'Таро / Оракул',
    placeholder: 'Запитай ARCAS — символи вже відповідають...',
    avatar: '/arcas-portrait-1.png',
    avatarPos: 'object-[50%_35%]',
    room: '/arcas-room.png',
    roomPos: 'object-top md:object-[50%_45%]',
    bgColor: 'from-purple-950 via-violet-950 to-slate-950',
    accentColor: 'bg-purple-600/60',
    headerBg: 'bg-purple-950/80',
    overlayColor: 'from-purple-950/80 via-violet-950/65 to-slate-950/88',
    candleColors: [
      'rgba(251,146,60,0.14)',
      'rgba(251,191,36,0.10)',
      'rgba(139,92,246,0.22)',
      'rgba(167,139,250,0.15)',
    ],
    particleColor: 'rgba(196,181,253,0.9)',
    particleGlow: '0 0 6px 2px rgba(196,181,253,0.6)',
    glowColor: 'rgba(139,92,246,0.30)',
    glowPos: '50% 40%',
    borderColor: 'border-purple-400/40',
  },
  NUMI: {
    emoji: '✨',
    name: 'NUMI',
    role: 'Нумерологія',
    placeholder: 'Запитай NUMI про числовий код твоєї долі...',
    avatar: '/numi-portrait-1.png',
    avatarPos: 'object-[50%_50%]',
    room: '/numi-room.png',
    roomPos: 'object-top md:object-[50%_55%]',
    bgColor: 'from-amber-950 via-yellow-950 to-slate-950',
    accentColor: 'bg-amber-600/60',
    headerBg: 'bg-amber-950/80',
    overlayColor: 'from-amber-950/80 via-yellow-950/60 to-slate-950/85',
    candleColors: [
      'rgba(251,191,36,0.22)',
      'rgba(245,158,11,0.18)',
      'rgba(251,146,60,0.20)',
      'rgba(217,119,6,0.12)',
    ],
    particleColor: 'rgba(252,211,77,0.9)',
    particleGlow: '0 0 6px 2px rgba(252,211,77,0.6)',
    glowColor: 'rgba(245,158,11,0.28)',
    glowPos: '60% 60%',
    borderColor: 'border-amber-400/40',
  },
  UMBRA: {
    emoji: '🌑',
    name: 'UMBRA',
    role: 'Езо-психологія',
    placeholder: 'Поділись з UMBRA — тінь несе мудрість...',
    avatar: '/umbra-portrait-1.png',
    avatarPos: 'object-[50%_40%]',
    room: '/umbra-room.png',
    roomPos: 'object-top md:object-[50%_30%]',
    bgColor: 'from-slate-900 via-gray-900 to-zinc-950',
    accentColor: 'bg-slate-600/60',
    headerBg: 'bg-slate-900/80',
    overlayColor: 'from-slate-900/60 via-gray-900/45 to-zinc-950/70',
    candleColors: [
      'rgba(251,146,60,0.18)',
      'rgba(148,163,184,0.18)',
      'rgba(100,116,139,0.28)',
      'rgba(71,85,105,0.22)',
    ],
    particleColor: 'rgba(148,163,184,0.7)',
    particleGlow: '0 0 4px 1px rgba(148,163,184,0.4)',
    glowColor: 'rgba(100,116,139,0.20)',
    glowPos: '40% 55%',
    borderColor: 'border-slate-500/40',
  },
}

// Позиції та розміри свічок (детерміновані)
const CANDLE_POSITIONS = [
  { x: 8,  y: 88, w: 180, delay: 0,   dur: 3.5 },
  { x: 88, y: 85, w: 140, delay: 1.8, dur: 5.0 },
  { x: 48, y: 92, w: 280, delay: 0.5, dur: 7.0 },
  { x: 22, y: 90, w: 100, delay: 1.2, dur: 4.0 },
]

export default function ChatPage() {
  const params = useParams()
  const agentType = (params.agent as string).toUpperCase() as AgentType
  const agent = agentInfo[agentType] ?? agentInfo.LUNA
  const particles = PARTICLES[agentType]

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [hasInitiated, setHasInitiated] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initiateChat = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/chat/${agentType.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiate: true }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || errData.error || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))

          if (data.text) {
            assistantMessage += data.text
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
              return updated
            })
          }

          if (data.conversationId) {
            setConversationId(data.conversationId)
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Невідома помилка'
      setMessages((prev) => [...prev, { role: 'assistant', content: `Помилка: ${msg}` }])
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }, [agentType])

  useEffect(() => {
    if (!conversationId && messages.length === 0 && !isLoading && !hasInitiated) {
      setHasInitiated(true)
      initiateChat()
    }
  }, [conversationId, messages.length, isLoading, hasInitiated, initiateChat])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: text }])

    try {
      const res = await fetch(`/api/chat/${agentType.toLowerCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, conversationId }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (errData.error === 'OVERLOADED' || res.status === 503) {
          throw new Error('Сервіс тимчасово перевантажений. Зачекайте хвилину і спробуйте ще раз.')
        }
        throw new Error(errData.message || errData.error || `HTTP ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))

          if (data.error) {
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: `Помилка: ${data.error}` }
              return updated
            })
            break
          }

          if (data.text) {
            assistantMessage += data.text
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
              return updated
            })
          }

          if (data.conversationId) {
            setConversationId(data.conversationId)
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Невідома помилка'
      setMessages((prev) => [...prev, { role: 'assistant', content: `Помилка: ${msg}` }])
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={`flex flex-col h-dvh md:h-screen bg-gradient-to-b ${agent.bgColor} relative overflow-hidden`}>

      {/* ── Кімната мага ── */}
      <Image
        src={agent.room}
        alt=""
        fill
        className={`object-cover ${agent.roomPos} pointer-events-none`}
        style={{ opacity: agentType === 'UMBRA' ? 0.55 : 0.35 }}
        priority
      />
      {/* Накладка-градієнт поверх кімнати */}
      <div className={`absolute inset-0 bg-gradient-to-b ${agent.overlayColor} pointer-events-none`} />

      {/* ── Магічне сяйво (унікальне для кожного мага) ── */}
      <div
        className="chat-magic-glow absolute pointer-events-none"
        style={{
          left: agent.glowPos.split(' ')[0],
          top: agent.glowPos.split(' ')[1],
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${agent.glowColor} 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
        aria-hidden="true"
      />

      {/* ── Мерехтіння свічок ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {CANDLE_POSITIONS.map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full blur-3xl"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: `${c.w}px`,
              height: `${c.w}px`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${agent.candleColors[i] ?? agent.candleColors[0]} 0%, transparent 70%)`,
              animation: `chat-candle ${c.dur}s ${c.delay}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>

      {/* ── Плаваючі частинки ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: agent.particleColor,
              boxShadow: agent.particleGlow,
              opacity: 0,
              animation: `chat-particle ${p.dur}s ${p.delay}s infinite linear`,
            }}
          />
        ))}
      </div>

      {/* ── Туман знизу ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
        aria-hidden="true"
      />

      {/* ── LUNA: додаткові зорі ── */}
      {agentType === 'LUNA' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {[
            { x: 20, y: 15, s: 2, d: 2.1 }, { x: 45, y: 8,  s: 1, d: 3.5 },
            { x: 70, y: 20, s: 2, d: 1.8 }, { x: 85, y: 10, s: 1, d: 4.2 },
            { x: 10, y: 25, s: 1, d: 2.9 }, { x: 55, y: 18, s: 2, d: 3.1 },
            { x: 33, y: 30, s: 1, d: 1.6 }, { x: 92, y: 28, s: 2, d: 5.0 },
          ].map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-blue-100"
              style={{
                left: `${s.x}%`, top: `${s.y}%`,
                width: `${s.s}px`, height: `${s.s}px`,
                animation: `chat-twinkle ${s.d}s infinite linear`,
                animationDelay: `${-s.d * 0.4}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── ARCAS: пульсуюча куля-кристал (центр) ── */}
      {agentType === 'ARCAS' && messages.length === 0 && (
        <div
          className="absolute pointer-events-none"
          style={{ left: '50%', top: '45%', transform: 'translate(-50%, -50%)' }}
          aria-hidden="true"
        >
          <div
            className="w-40 h-40 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, rgba(139,92,246,0.05) 60%, transparent 100%)',
              animation: 'chat-pulse 4s infinite ease-in-out',
              filter: 'blur(20px)',
            }}
          />
        </div>
      )}

      {/* ── UMBRA: туманні тіні ── */}
      {agentType === 'UMBRA' && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {[
            { x: 15, y: 40, delay: 0,   dur: 12 },
            { x: 75, y: 55, delay: 4,   dur: 15 },
            { x: 45, y: 25, delay: 8,   dur: 10 },
          ].map((m, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${m.x}%`, top: `${m.y}%`,
                width: '300px', height: '200px',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(ellipse, rgba(71,85,105,0.12) 0%, transparent 70%)',
                filter: 'blur(30px)',
                animation: `chat-mist ${m.dur}s ${m.delay}s infinite ease-in-out`,
              }}
            />
          ))}
        </div>
      )}

      {/* ── NUMI: золоті числа ── */}
      {agentType === 'NUMI' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          {[
            { x: 8,  y: 70, num: '7',  delay: 0,   dur: 9  },
            { x: 88, y: 65, num: '3',  delay: 2,   dur: 11 },
            { x: 22, y: 80, num: '∞',  delay: 1,   dur: 8  },
            { x: 72, y: 75, num: '9',  delay: 3.5, dur: 10 },
            { x: 50, y: 85, num: '6',  delay: 1.5, dur: 7  },
          ].map((n, i) => (
            <span
              key={i}
              className="absolute text-xs font-bold"
              style={{
                left: `${n.x}%`, top: `${n.y}%`,
                color: 'rgba(252,211,77,0.35)',
                opacity: 0,
                animation: `chat-particle ${n.dur}s ${n.delay}s infinite linear`,
              }}
            >
              {n.num}
            </span>
          ))}
        </div>
      )}

      {/* ── Заголовок ── */}
      <header className={`relative z-10 border-b border-white/10 ${agent.headerBg} backdrop-blur-md px-6 py-4 flex items-center gap-4 flex-shrink-0`}>
        <div className={`w-10 h-10 rounded-full overflow-hidden border-2 ${agent.borderColor} flex-shrink-0`}>
          {agent.avatar ? (
            <Image
              src={agent.avatar}
              alt={agent.name}
              width={40}
              height={40}
              className={`object-cover w-full h-full ${agent.avatarPos ?? 'object-top'}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl bg-white/5">{agent.emoji}</div>
          )}
        </div>
        <div>
          <h1 className="font-semibold text-white">{agent.name}</h1>
          <p className="text-xs text-white/40">{agent.role}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/30">онлайн</span>
        </div>
      </header>

      {/* ── Повідомлення ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center">
              <div className={`w-24 h-24 rounded-full overflow-hidden border-2 ${agent.borderColor} mx-auto mb-4`}
                style={{ boxShadow: `0 0 30px ${agent.glowColor}` }}>
                {agent.avatar ? (
                  <Image
                    src={agent.avatar}
                    alt={agent.name}
                    width={96}
                    height={96}
                    className={`object-cover w-full h-full ${agent.avatarPos ?? 'object-top'}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-white/5">{agent.emoji}</div>
                )}
              </div>
              <p className="text-white/60 text-lg font-display">[{agent.name}] вже знає твоє ім&apos;я.</p>
              <p className="text-white/30 text-sm mt-1 max-w-xs mx-auto">Перші 15 повідомлень — повністю безкоштовно.</p>
            </div>
          </div>
        ) : (
        <div className="flex flex-col justify-end min-h-full space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className={`w-7 h-7 rounded-full overflow-hidden border ${agent.borderColor} flex-shrink-0 mt-1`}>
                {agent.avatar ? (
                  <Image src={agent.avatar} alt={agent.name} width={28} height={28} className={`object-cover w-full h-full ${agent.avatarPos ?? 'object-top'}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm bg-white/5">{agent.emoji}</div>
                )}
              </div>
            )}

            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? `${agent.accentColor} text-white rounded-br-sm`
                  : 'glass-card text-white/90 rounded-bl-sm'
              }`}
            >
              {msg.content || (
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-lumara-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-lumara-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-lumara-400 animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
        </div>
        )}
      </div>

      {/* ── Поле вводу ── */}
      <div className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-md p-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={agent.placeholder}
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm resize-none focus:outline-none focus:border-lumara-500/50 disabled:opacity-50 max-h-32"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-lumara-600 hover:bg-lumara-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-colors flex-shrink-0"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            )}
          </button>
        </div>
        <p className="text-center text-white/20 text-xs mt-2">Enter — надіслати · Shift+Enter — новий рядок</p>
      </div>

      {/* ── CSS анімації ── */}
      <style>{`
        /* Мерехтіння свічок */
        @keyframes chat-candle {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          25%       { opacity: 0.3; transform: translate(-50%, -50%) scale(1.1) skewX(1deg); }
          55%       { opacity: 0.7; transform: translate(-50%, -50%) scale(0.93); }
          80%       { opacity: 0.45; transform: translate(-50%, -50%) scale(1.06) skewX(-1deg); }
        }

        /* Плаваючі частинки */
        @keyframes chat-particle {
          0%   { opacity: 0; transform: translateY(0) scale(0); }
          15%  { opacity: 0.85; transform: translateY(-15px) scale(1); }
          75%  { opacity: 0.4; transform: translateY(-70px) scale(0.8); }
          100% { opacity: 0; transform: translateY(-100px) scale(0); }
        }

        /* Мерехтіння зірок (LUNA) */
        @keyframes chat-twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.7); }
          30%      { opacity: 0.9; transform: scale(1.4); box-shadow: 0 0 4px 2px rgba(165,180,252,0.7); }
          65%      { opacity: 0.3; transform: scale(0.9); }
        }

        /* Пульсуюче сяйво (ARCAS кристал) */
        @keyframes chat-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.8; transform: scale(1.2); }
        }

        /* Магічне сяйво */
        .chat-magic-glow {
          animation: chat-pulse 8s infinite ease-in-out;
        }

        /* Туманні тіні (UMBRA) */
        @keyframes chat-mist {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1) skewX(0deg); }
          33%      { opacity: 0.6; transform: translate(-52%, -48%) scale(1.1) skewX(2deg); }
          66%      { opacity: 0.2; transform: translate(-48%, -52%) scale(0.9) skewX(-1deg); }
        }
      `}</style>
    </div>
  )
}
