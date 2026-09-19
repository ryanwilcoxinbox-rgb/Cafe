import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { checkForUpdates, startUpdateChecks, type BuildInfo, type UpdateState } from './updateLogic'

/** What's running right now, baked in at build time. */
export const RUNNING: BuildInfo = __BUILD__

interface PwaState extends UpdateState {
  /** "Later" on the update banner, for this session only. */
  snoozed: boolean
}

let state: PwaState = { status: 'idle', latest: null, checkedAt: null, snoozed: false }
const listeners = new Set<() => void>()
const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

let registration: ServiceWorkerRegistration | null = null
let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null
let stopChecks: (() => void) | null = null

/**
 * We register the service worker ourselves (injectRegister: null) so we hold the registration and
 * can call registration.update() on a timer and on resume, not just on page navigation.
 */
export function initPWA() {
  try {
    if (!('serviceWorker' in navigator)) return
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh() {
        set({ status: 'update-ready' })
      },
      onRegisteredSW(_url, reg) {
        if (!reg) return
        registration = reg
        stopChecks?.()
        stopChecks = startUpdateChecks(reg, document, window)
      },
      onRegisterError() {
        // Private mode or blocked storage: the app still works, just without offline/updates.
      },
    })
  } catch {
    // Never let update plumbing break the app.
  }
}

async function fetchLatest(): Promise<BuildInfo> {
  const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`version.json ${res.status}`)
  const data = (await res.json()) as Partial<BuildInfo>
  if (typeof data.buildTime !== 'string') throw new Error('bad version.json')
  return { version: String(data.version ?? ''), buildTime: data.buildTime, commit: String(data.commit ?? '') }
}

/** Wait for a worker that update() just found to finish installing (max 20 s). */
function settle(): Promise<void> {
  const worker = registration?.installing
  if (!worker) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      worker.removeEventListener('statechange', onChange)
      resolve()
    }
    const onChange = () => {
      if (worker.state !== 'installing') done()
    }
    const timer = setTimeout(done, 20_000)
    worker.addEventListener('statechange', onChange)
  })
}

export async function checkNow() {
  if (state.status === 'checking') return
  set({ status: 'checking' })
  const result = await checkForUpdates({
    registration,
    running: RUNNING,
    fetchLatest,
    settle,
    isWaiting: () => !!registration?.waiting || state.status === 'update-ready',
  })
  set({ ...result, checkedAt: Date.now(), snoozed: false })
}

export function updateAndReload() {
  if (registration?.waiting && applyUpdate) void applyUpdate(true)
  else window.location.reload()
}

export const snoozeUpdate = () => set({ snoozed: true })

export function useUpdateState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
