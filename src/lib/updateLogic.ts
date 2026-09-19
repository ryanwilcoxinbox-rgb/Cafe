/*
 * Update checking, kept free of browser globals so it can be tested with fakes.
 * The browser glue (service-worker registration, React state) lives in pwa.ts.
 */

export interface BuildInfo {
  version: string
  /** ISO timestamp of the build. */
  buildTime: string
  /** Short git SHA, or "dev". */
  commit: string
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  /** A new service worker is installed and waiting: "Update and reload". */
  | 'update-ready'
  /** version.json says a newer build is deployed, but it hasn't finished downloading yet. */
  | 'downloading'
  | 'offline'
  /** No service worker (dev server, private mode, old browser). */
  | 'unsupported'

export interface UpdateState {
  status: UpdateStatus
  latest: BuildInfo | null
  checkedAt: number | null
}

export interface Updatable {
  update(): Promise<unknown>
}

interface DocLike {
  visibilityState: string
  addEventListener(type: 'visibilitychange', fn: () => void): void
  removeEventListener(type: 'visibilitychange', fn: () => void): void
}

interface TimerLike {
  setInterval(fn: () => void, ms: number): unknown
  clearInterval(id: unknown): void
}

export const CHECK_EVERY_MS = 60_000

/** Ask the service worker to look for a new version. Never throws: being offline is normal. */
export function quietUpdate(reg: Updatable) {
  try {
    return reg.update().then(
      () => true,
      () => false,
    )
  } catch {
    return Promise.resolve(false)
  }
}

/**
 * Check about once a minute while the app is open, and every time it comes back to the
 * foreground. The foreground check matters most: a Home Screen app can sit suspended in the app
 * switcher for days and be resumed without ever navigating.
 */
export function startUpdateChecks(reg: Updatable, doc: DocLike, timers: TimerLike, everyMs = CHECK_EVERY_MS) {
  const onVisible = () => {
    if (doc.visibilityState === 'visible') void quietUpdate(reg)
  }
  const id = timers.setInterval(onVisible, everyMs)
  doc.addEventListener('visibilitychange', onVisible)
  return () => {
    timers.clearInterval(id)
    doc.removeEventListener('visibilitychange', onVisible)
  }
}

export const isNewer = (latest: BuildInfo | null, running: BuildInfo) =>
  !!latest && Date.parse(latest.buildTime) > Date.parse(running.buildTime)

export function decideStatus(input: {
  waiting: boolean
  swChecked: boolean
  latest: BuildInfo | null
  running: BuildInfo
}): UpdateStatus {
  if (input.waiting) return 'update-ready'
  if (!input.swChecked && !input.latest) return 'offline'
  if (isNewer(input.latest, input.running)) return 'downloading'
  return 'up-to-date'
}

export interface ManualCheckDeps {
  registration: Updatable | null
  running: BuildInfo
  fetchLatest: () => Promise<BuildInfo>
  /** Resolves once any worker found by update() has finished installing (or gave up). */
  settle: () => Promise<void>
  isWaiting: () => boolean
}

/** The "Check for updates" button. Always resolves with a status; never throws. */
export async function checkForUpdates(deps: ManualCheckDeps): Promise<{ status: UpdateStatus; latest: BuildInfo | null }> {
  const [swChecked, latest] = await Promise.all([
    deps.registration ? quietUpdate(deps.registration) : Promise.resolve(false),
    deps.fetchLatest().then(
      (b) => b,
      () => null,
    ),
  ])
  if (swChecked) {
    try {
      await deps.settle()
    } catch {
      // Installation hiccup: report what we know.
    }
  }
  if (!deps.registration) {
    // No service worker caching this page, so a plain reload fetches the newer build.
    if (!latest) return { status: 'unsupported', latest }
    return { status: isNewer(latest, deps.running) ? 'update-ready' : 'up-to-date', latest }
  }
  return { status: decideStatus({ waiting: deps.isWaiting(), swChecked, latest, running: deps.running }), latest }
}

export function formatBuildTime(iso: string, locale?: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale ?? [], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
