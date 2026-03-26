'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const [isLoading, setIsLoading] = useState(false)

  async function handleGitHubSignIn() {
    setIsLoading(true)
    await signIn('github', { callbackUrl })
  }

  return (
    <div className="glass-card p-10 w-full max-w-md text-center animate-fade-in relative z-10">
      {/* Логотип */}
      <div className="mb-8">
        <span className="font-display text-5xl font-bold bg-gradient-to-r from-lumara-300 to-gold-400 bg-clip-text text-transparent">
          LUMARA
        </span>
        <p className="text-lumara-300/70 tracking-[0.3em] text-xs uppercase mt-1">Academy</p>
      </div>

      <h1 className="text-xl font-semibold text-white mb-2">Вхід до Академії</h1>
      <p className="text-white/50 text-sm mb-8">
        Відкрий свій шлях з AI-провідниками зірок
      </p>

      {/* Кнопка GitHub */}
      <button
        onClick={handleGitHubSignIn}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white border border-white/20 font-medium py-3 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        )}
        {isLoading ? 'Входимо...' : 'Увійти через GitHub'}
      </button>

      <p className="text-white/30 text-xs mt-6">
        Реєструючись, ти погоджуєшся з умовами використання LUMARA Academy
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
