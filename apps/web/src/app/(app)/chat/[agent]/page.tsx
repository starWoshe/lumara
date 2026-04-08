'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

type AgentType = 'LUNA' | 'ARCAS' | 'NUMI' | 'UMBRA'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const agentInfo: Record<AgentType, {
  emoji: string
  name: string
  role: string
  placeholder: string
  avatar?: string
  bgColor: string
  accentColor: string
  headerBg: string
}> = {
  LUNA: {
    emoji: '🌙',
    name: 'LUNA',
    role: 'Астрологія',
    placeholder: 'Запитай LUNA про своє небесне послання...',
    avatar: '/luna-avatar.png',
    bgColor: 'from-blue-950 via-indigo-950 to-slate-950',
    accentColor: 'bg-blue-600/60',
    headerBg: 'bg-blue-950/80',
  },
  ARCAS: {
    emoji: '🔮',
    name: 'ARCAS',
    role: 'Таро',
    placeholder: 'Запитай ARCAS — символи вже відповідають...',
    bgColor: 'from-purple-950 via-violet-950 to-slate-950',
    accentColor: 'bg-purple-600/60',
    headerBg: 'bg-purple-950/80',
  },
  NUMI: {
    emoji: '✨',
    name: 'NUMI',
    role: 'Нумерологія',
    placeholder: 'Запитай NUMI про числовий код твоєї долі...',
    bgColor: 'from-amber-950 via-yellow-950 to-slate-950',
    accentColor: 'bg-amber-600/60',
    headerBg: 'bg-amber-950/80',
  },
  UMBRA: {
    emoji: '🌑',
    name: 'UMBRA',
    role: 'Езо-психологія',
    placeholder: 'Поділись з UMBRA — тінь несе мудрість...',
    bgColor: 'from-slate-950 via-gray-950 to-zinc-950',
    accentColor: 'bg-slate-600/60',
    headerBg: 'bg-slate-950/80',
  },
}

export default function ChatPage() {
  const params = useParams()
  const agentType = (params.agent as string).toUpperCase() as AgentType
  const agent = agentInfo[agentType] ?? agentInfo.LUNA

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: text }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType, content: text, conversationId }),
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
    <div className={`flex flex-col h-screen bg-gradient-to-b ${agent.bgColor} relative`}>

      {/* Фон тільки для LUNA */}
      {agentType === 'LUNA' && (
        <>
          <Image
            src="/luna-room.png"
            alt=""
            fill
            className="object-cover object-center opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/70 via-indigo-950/60 to-slate-950/90" />
        </>
      )}

      {/* Заголовок */}
      <header className={`relative z-10 border-b border-white/10 ${agent.headerBg} backdrop-blur-md px-6 py-4 flex items-center gap-4 flex-shrink-0`}>
        {agent.avatar ? (
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-400/40 flex-shrink-0">
            <Image
              src={agent.avatar}
              alt={agent.name}
              width={40}
              height={40}
              className="object-cover object-top w-full h-full"
            />
          </div>
        ) : (
          <span className="text-2xl">{agent.emoji}</span>
        )}
        <div>
          <h1 className="font-semibold text-white">{agent.name}</h1>
          <p className="text-xs text-white/40">{agent.role}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/30">онлайн</span>
        </div>
      </header>

      {/* Повідомлення */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            {agent.avatar ? (
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-blue-400/30 mx-auto mb-4 shadow-[0_0_30px_rgba(96,165,250,0.2)]">
                <Image
                  src={agent.avatar}
                  alt={agent.name}
                  width={96}
                  height={96}
                  className="object-cover object-top w-full h-full"
                />
              </div>
            ) : (
              <div className="text-5xl mb-4">{agent.emoji}</div>
            )}
            <p className="text-white/60 text-lg font-display">Привіт! Я {agent.name}.</p>
            <p className="text-white/30 text-sm mt-1 max-w-xs mx-auto">{agent.placeholder}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Аватар агента зліва */}
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 flex-shrink-0 mt-1">
                {agent.avatar ? (
                  <Image src={agent.avatar} alt={agent.name} width={28} height={28} className="object-cover object-top w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">{agent.emoji}</div>
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

      {/* Поле вводу */}
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
    </div>
  )
}
