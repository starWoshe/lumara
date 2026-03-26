'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'

type AgentType = 'LUNA' | 'ARCAS' | 'NUMI' | 'UMBRA'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const agentInfo: Record<AgentType, { emoji: string; name: string; role: string; placeholder: string }> = {
  LUNA:  { emoji: '🌙', name: 'LUNA',  role: 'Астрологія',    placeholder: 'Запитай LUNA про своє небесне послання...' },
  ARCAS: { emoji: '🔮', name: 'ARCAS', role: 'Таро',          placeholder: 'Запитай ARCAS — символи вже відповідають...' },
  NUMI:  { emoji: '✨', name: 'NUMI',  role: 'Нумерологія',   placeholder: 'Запитай NUMI про числовий код твоєї долі...' },
  UMBRA: { emoji: '🌑', name: 'UMBRA', role: 'Езо-психологія',placeholder: 'Поділись з UMBRA — тінь несе мудрість...' },
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

  // Автоскрол до останнього повідомлення
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)

    // Додаємо повідомлення користувача одразу
    setMessages((prev) => [...prev, { role: 'user', content: text }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType, content: text, conversationId }),
      })

      if (!res.ok) throw new Error('Помилка сервера')

      // Стрімінг відповіді
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
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Вибач, сталась помилка. Спробуй ще раз.' }])
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
    <div className="flex flex-col h-screen">
      {/* Заголовок */}
      <header className="border-b border-white/5 bg-black/10 backdrop-blur-sm px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <span className="text-2xl">{agent.emoji}</span>
        <div>
          <h1 className="font-semibold text-white">{agent.name}</h1>
          <p className="text-xs text-white/40">{agent.role}</p>
        </div>
      </header>

      {/* Повідомлення */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{agent.emoji}</div>
            <p className="text-white/40 text-lg">Привіт! Я {agent.name}.</p>
            <p className="text-white/30 text-sm mt-1">{agent.placeholder}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-lumara-600/60 text-white rounded-br-sm'
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
      <div className="border-t border-white/5 bg-black/10 p-4 flex-shrink-0">
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
