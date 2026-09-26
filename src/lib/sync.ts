import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getState, onLocalChange, setState } from './store'
import { NO_META, runSync, type Remote, type Synced, type SyncMeta } from './syncLogic'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
/** Built without Supabase settings, BrewPrint is exactly the on-device app it always was. */
export const SYNC_ENABLED = !!(URL && KEY)

export type SyncStatus = 'signed-out' | 'syncing' | 'synced' | 'offline' | 'error'

export interface SyncState {
  /** False until we know whether there's a saved session (avoids flashing "Sign in"). */
  ready: boolean
  email: string | null
  status: SyncStatus
  syncedAt: number | null
}

let state: SyncState = { ready: false, email: null, status: 'signed-out', syncedAt: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useSync() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

// ---- Sync bookkeeping, per device ----

const META_KEY = 'brewprint:sync'

function loadMeta(): SyncMeta {
  try {
    return { ...NO_META, ...JSON.parse(localStorage.getItem(META_KEY) ?? '{}') }
  } catch {
    return NO_META
  }
}

function saveMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    // Storage blocked: we'll just do a full merge next time.
  }
}

// ---- Supabase, loaded after first paint so it never slows the app down ----

let clientPromise: Promise<SupabaseClient> | null = null
function client() {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(URL!, KEY!, {
      // Sign-in is by typed code, never a link, so the hash router keeps the URL to itself.
      auth: { storageKey: 'brewprint:auth', detectSessionInUrl: false },
    }),
  )
  return clientPromise
}

function remote(sb: SupabaseClient, userId: string): Remote {
  return {
    async fetch() {
      const { data, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', userId).maybeSingle()
      if (error) throw error
      return data ? { data: data.data, updatedAt: data.updated_at as string } : null
    },
    async insert(s: Synced) {
      const { data, error } = await sb.from('user_data').insert({ user_id: userId, data: s }).select('updated_at').single()
      if (error?.code === '23505') return null // another device created it first
      if (error) throw error
      return data.updated_at as string
    },
    async update(s: Synced, expected: string) {
      const { data, error } = await sb.from('user_data').update({ data: s }).eq('user_id', userId).eq('updated_at', expected).select('updated_at')
      if (error) throw error
      return (data?.[0]?.updated_at as string | undefined) ?? null
    },
  }
}

// ---- The sync loop ----

let userId: string | null = null
let version = 0
let running: Promise<void> | null = null
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

function schedule(ms: number) {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), ms)
}

export function syncNow(): Promise<void> {
  if (!userId) return Promise.resolve()
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      const uid: string | null = userId
      if (!uid) break
      set({ status: 'syncing' })
      try {
        const sb = await client()
        const meta = await runSync({
          userId: uid,
          meta: loadMeta(),
          local: getState,
          apply: (s) => setState((cur) => ({ ...cur, ...s }), { fromSync: true }),
          remote: remote(sb, uid),
          version: () => version,
        })
        if (userId !== uid) break // signed out mid-sync
        saveMeta({ ...meta, localAt: Math.max(meta.localAt, loadMeta().localAt) })
        set({ status: 'synced', syncedAt: Date.now() })
        if (meta.dirty) again = true
      } catch {
        set({ status: navigator.onLine ? 'error' : 'offline' })
        schedule(60_000)
      }
    } while (again && userId)
  })().finally(() => {
    running = null
  })
  return running
}

export function initSync() {
  if (!SYNC_ENABLED) return
  try {
    onLocalChange(() => {
      version++
      const meta = loadMeta()
      // Track edits for whoever this device last synced as, even before their session loads.
      if (meta.userId) saveMeta({ ...meta, dirty: true, localAt: Date.now() })
      if (userId) schedule(1500)
    })
    // Coming back to the app is when another device's brews are most likely waiting.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') schedule(0)
    })
    window.addEventListener('online', () => schedule(0))

    client().then(
      (sb) => {
        sb.auth.onAuthStateChange((event, session) => {
          const user = session?.user ?? null
          userId = user?.id ?? null
          set({
            ready: true,
            email: user?.email ?? null,
            ...(!user ? { status: 'signed-out' as const } : state.status === 'signed-out' ? { status: 'syncing' as const } : {}),
          })
          // Never await Supabase inside this callback; schedule instead.
          if (user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) schedule(0)
        })
      },
      () => set({ ready: true }),
    )
  } catch {
    // Sync must never break the app.
  }
}

// ---- Sign in / out ----

/** Emails a one-time code. The code (not a link) keeps sign-in inside a Home Screen app. */
export async function sendCode(email: string) {
  const sb = await client()
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  if (error) throw error
}

export async function verifyCode(email: string, code: string) {
  const sb = await client()
  const { data, error } = await sb.auth.verifyOtp({ email, token: code, type: 'email' })
  if (error) throw error
  userId = data.user?.id ?? null
  set({ ready: true, email: data.user?.email ?? email })
  await syncNow()
}

/** Signs this device out. Everything stays on the phone; it just stops syncing. */
export async function signOut() {
  const sb = await client()
  await sb.auth.signOut({ scope: 'local' })
  userId = null
  saveMeta(NO_META)
  set({ status: 'signed-out', email: null, syncedAt: null })
}
