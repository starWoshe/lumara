'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProfileData {
  fullName:  string | null
  gender:    string | null
  birthDate: string | null
  birthTime: string | null
  birthPlace: string | null
  goal:      string | null
}

const GENDER_OPTIONS = [
  { value: '',       label: 'Не вказано' },
  { value: 'Жінка', label: 'Жінка' },
  { value: 'Чоловік', label: 'Чоловік' },
  { value: 'Інше',  label: 'Інше / Не бінарне' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [form, setForm] = useState<ProfileData>({
    fullName: '', gender: '', birthDate: '', birthTime: '', birthPlace: '', goal: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setForm({
            fullName:  data.fullName  ?? '',
            gender:    data.gender    ?? '',
            birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
            birthTime: data.birthTime ?? '',
            birthPlace: data.birthPlace ?? '',
            goal:      data.goal      ?? '',
          })
        }
        setLoading(false)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        alert('Помилка збереження: ' + (data.details || data.error || 'невідома помилка'))
      } else if (data.error) {
        alert('Помилка: ' + (data.details || data.error))
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
        // Оновлюємо форму з відповіді сервера
        if (data) {
          setForm({
            fullName:  data.fullName  ?? '',
            gender:    data.gender    ?? '',
            birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
            birthTime: data.birthTime ?? '',
            birthPlace: data.birthPlace ?? '',
            goal:      data.goal      ?? '',
          })
        }
      }
    } catch (err) {

      alert('Не вдалося зберегти профіль. Перевір консоль.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-2xl">
        <div className="text-white/40 text-sm">Завантаження...</div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">Мій профіль</h1>
        <p className="text-white/50 text-sm">Ці дані допомагають магам давати точніші персоналізовані відповіді</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">

        {/* Повне ім'я */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            {`Повне ім'я`} <span className="text-white/30 font-normal">(для нумерологічного аналізу)</span>
          </label>
          <input
            type="text"
            value={form.fullName ?? ''}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Як у документах або яке вважаєш своїм"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-lumara-400/50 transition-colors"
          />
        </div>

        {/* Стать */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Стать</label>
          <div className="flex gap-2 flex-wrap">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, gender: opt.value || null })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  (form.gender ?? '') === opt.value
                    ? 'bg-lumara-500/30 border-lumara-400/50 text-lumara-300'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:bg-white/8'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Дата народження */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Дата народження</label>
          <input
            type="date"
            value={form.birthDate ?? ''}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-lumara-400/50 transition-colors [color-scheme:dark]"
          />
        </div>

        {/* Час народження */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Час народження <span className="text-white/30 font-normal">(підвищує точність астрологічного аналізу)</span>
          </label>
          <input
            type="time"
            value={form.birthTime ?? ''}
            onChange={(e) => setForm({ ...form, birthTime: e.target.value })}
            className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-lumara-400/50 transition-colors [color-scheme:dark]"
          />
        </div>

        {/* Місце народження */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Місце народження</label>
          <input
            type="text"
            value={form.birthPlace ?? ''}
            onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
            placeholder="Наприклад: Київ, Україна"
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-lumara-400/50 transition-colors"
          />
        </div>

        {/* Основний запит */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            З чим ти до нас прийшов? <span className="text-white/30 font-normal">(необов&apos;язково)</span>
          </label>
          <textarea
            value={form.goal ?? ''}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
            placeholder="Наприклад: хочу зрозуміти свою місію, шукаю ясності у відносинах, цікавлюсь самопізнанням..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-lumara-400/50 transition-colors resize-none"
          />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-lumara-500/30 hover:bg-lumara-500/40 border border-lumara-400/30 text-lumara-300 font-medium py-3 px-8 rounded-xl transition-all duration-200 disabled:opacity-60"
          >
            {saving ? 'Зберігаємо...' : 'Зберегти'}
          </button>
          {saved && (
            <span className="text-green-400 text-sm">✓ Збережено</span>
          )}
        </div>
      </form>

      <button
        onClick={() => router.back()}
        className="mt-6 text-white/40 hover:text-white/60 text-sm transition-colors"
      >
        ← Назад
      </button>
    </div>
  )
}
