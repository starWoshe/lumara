import { AsyncLocalStorage } from 'async_hooks'
import type { SessionUser } from './auth'

type SessionStoreValue = {
  session: SessionUser | null
  fetched: boolean
}

const sessionAsyncLocalStorage = new AsyncLocalStorage<SessionStoreValue>()

export function getSessionFromStore(): SessionUser | null | undefined {
  const store = sessionAsyncLocalStorage.getStore()
  if (!store?.fetched) return undefined
  return store.session
}

export function setSessionInStore(session: SessionUser | null) {
  const store = sessionAsyncLocalStorage.getStore()
  if (store) {
    store.session = session
    store.fetched = true
  }
}

export function ensureSessionStore(): void {
  const store = sessionAsyncLocalStorage.getStore()
  if (!store) {
    throw new Error('SessionStore not initialized. Wrap request handler with withSessionStore()')
  }
}

export async function withSessionStore<T>(
  fn: () => Promise<T>
): Promise<T> {
  return sessionAsyncLocalStorage.run(
    { session: null, fetched: false },
    fn
  )
}
