'use client'

import { useEffect, useState } from 'react'

interface GossipItem {
  id: string
  text: string
  active: boolean
  sortOrder: number
  createdAt: string
}

export default function GossipPage() {
  const [items, setItems] = useState<GossipItem[]>([])
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/gossip')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function add() {
    const text = newText.trim()
    if (!text) return
    await fetch('/api/gossip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    setNewText('')
    load()
  }

  async function toggleActive(item: GossipItem) {
    await fetch(`/api/gossip/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Видалити пліт?')) return
    await fetch(`/api/gossip/${id}`, { method: 'DELETE' })
    load()
  }

  async function saveEdit(id: string) {
    const text = editText.trim()
    if (!text) return
    await fetch(`/api/gossip/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    setEditingId(null)
    load()
  }

  async function move(item: GossipItem, dir: -1 | 1) {
    const idx = items.findIndex(i => i.id === item.id)
    const target = items[idx + dir]
    if (!target) return
    await Promise.all([
      fetch(`/api/gossip/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: target.sortOrder }),
      }),
      fetch(`/api/gossip/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: item.sortOrder }),
      }),
    ])
    load()
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-purple-400 mb-1">Плітки Академії</h1>
        <p className="text-gray-400 text-sm mb-8">
          Живі новини що маги вплітають органічно в розмови. Оновлюй щомісяця.
        </p>

        {/* Форма додавання */}
        <div className="flex gap-3 mb-8">
          <textarea
            className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            rows={2}
            placeholder="Новий пліт академії..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } }}
          />
          <button
            onClick={add}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition"
          >
            Додати
          </button>
        </div>

        {/* Список */}
        {loading ? (
          <p className="text-gray-500 text-sm">Завантаження...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-sm">Плітків ще немає. Додай перший.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition ${
                  item.active
                    ? 'bg-gray-900 border-gray-700'
                    : 'bg-gray-950 border-gray-800 opacity-50'
                }`}
              >
                {editingId === item.id ? (
                  <div className="flex gap-2">
                    <textarea
                      className="flex-1 rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 resize-none"
                      rows={2}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-xs font-medium transition"
                      >
                        Зберегти
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition"
                      >
                        Скасувати
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    {/* Стрілки сортування */}
                    <div className="flex flex-col gap-1 pt-0.5 shrink-0">
                      <button
                        onClick={() => move(item, -1)}
                        disabled={idx === 0}
                        className="text-gray-600 hover:text-gray-300 disabled:opacity-20 text-xs leading-none"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(item, 1)}
                        disabled={idx === items.length - 1}
                        className="text-gray-600 hover:text-gray-300 disabled:opacity-20 text-xs leading-none"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Текст */}
                    <p className="flex-1 text-sm text-gray-200 leading-relaxed">{item.text}</p>

                    {/* Дії */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`text-xs px-2 py-1 rounded font-medium transition ${
                          item.active
                            ? 'bg-green-900/40 text-green-300 hover:bg-green-900/60'
                            : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                        }`}
                      >
                        {item.active ? 'Активний' : 'Вимкнено'}
                      </button>
                      <button
                        onClick={() => { setEditingId(item.id); setEditText(item.text) }}
                        className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition"
                      >
                        Ред.
                      </button>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-xs px-2 py-1 rounded bg-gray-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-gray-600">
          Активні плітки показуються магам у розмовах (для авторизованих користувачів, рівень 1+).
          Вимкнені — зберігаються але не використовуються.
        </p>
      </div>
    </main>
  )
}
