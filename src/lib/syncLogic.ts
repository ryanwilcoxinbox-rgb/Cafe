/*
 * Cloud sync rules, kept free of Supabase and browser globals so they can be tested with fakes.
 * The glue (auth, timers, status for the UI) lives in sync.ts.
 *
 * The phone is always the source of truth for the app; the cloud row is a copy that follows the
 * user between devices. Nothing here ever deletes local data.
 */
import { hydrate, type State } from './store'

/** Everything that follows the user between devices. Banner dismissals etc. stay per-device. */
export type Synced = Pick<State, 'kit' | 'dialIn' | 'prefs' | 'journal' | 'beans' | 'activeBeanId'>

export interface SyncMeta {
  /** Who this device last synced as. A different user means "first sync here". */
  userId: string | null
  /** The cloud row's updated_at when we last read or wrote it. */
  remoteAt: string | null
  /** Local changes not yet in the cloud. */
  dirty: boolean
  /** When the last local change happened (ms). Only used to break ties in a merge. */
  localAt: number
}

export const NO_META: SyncMeta = { userId: null, remoteAt: null, dirty: false, localAt: 0 }

export interface Remote {
  fetch(): Promise<{ data: unknown; updatedAt: string } | null>
  /** Returns the new updated_at, or null if a row already exists (someone beat us to it). */
  insert(data: Synced): Promise<string | null>
  /** Writes only if the row is still at `expected`. Returns the new updated_at, or null if it moved. */
  update(data: Synced, expected: string): Promise<string | null>
}

export interface SyncDeps {
  userId: string
  meta: SyncMeta
  local: () => State
  /** Replace the synced fields locally without marking them as a local change. */
  apply: (s: Synced) => void
  remote: Remote
  /** Bumps on every local change, so edits made mid-sync stay dirty. */
  version: () => number
  now?: () => number
}

export const pick = (s: State): Synced => ({
  kit: s.kit,
  dialIn: s.dialIn,
  prefs: s.prefs,
  journal: s.journal,
  beans: s.beans,
  activeBeanId: s.activeBeanId,
})

export const hasData = (s: Synced) => !!s.kit || s.journal.length > 0 || s.beans.length > 0

/** Cloud JSON from any app version, filled out with today's defaults. */
export const fromCloud = (data: unknown): Synced => pick(hydrate(JSON.stringify(data ?? null)))

function unionById<T extends { id: string }>(first: T[], second: T[]): T[] {
  const seen = new Set(first.map((x) => x.id))
  return [...first, ...second.filter((x) => !seen.has(x.id))]
}

/**
 * Both sides changed since they last agreed. Lists are combined so no brew or bag is lost;
 * for everything else the side changed most recently wins.
 */
export function merge(mine: Synced, theirs: Synced, mineIsNewer: boolean): Synced {
  const [a, b] = mineIsNewer ? [mine, theirs] : [theirs, mine]
  return {
    kit: a.kit ?? b.kit,
    dialIn: { ...b.dialIn, ...a.dialIn },
    prefs: { ...b.prefs, ...a.prefs },
    journal: unionById(a.journal, b.journal).sort((x, y) => y.at - x.at),
    beans: unionById(a.beans, b.beans),
    activeBeanId: a.activeBeanId ?? b.activeBeanId,
  }
}

/** One round of sync. Throws on network errors; returns the meta to save on success. */
export async function runSync(deps: SyncDeps): Promise<SyncMeta> {
  const now = deps.now ?? Date.now
  const first = deps.meta.userId !== deps.userId
  let dirty = first ? hasData(pick(deps.local())) : deps.meta.dirty
  let localAt = first ? now() : deps.meta.localAt
  const startVersion = deps.version()

  // A couple of retries covers another device writing between our read and our write.
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await deps.remote.fetch()
    const mine = pick(deps.local())
    const done = (remoteAt: string | null): SyncMeta => ({
      userId: deps.userId,
      remoteAt,
      dirty: deps.version() !== startVersion,
      localAt,
    })

    let push: Synced
    if (!row) {
      if (!hasData(mine)) return done(null)
      push = mine
    } else {
      const theirs = fromCloud(row.data)
      const changedElsewhere = first || row.updatedAt !== deps.meta.remoteAt
      if (!changedElsewhere && !dirty) return done(row.updatedAt)
      if (changedElsewhere && !dirty) {
        deps.apply(theirs)
        return done(row.updatedAt)
      }
      if (!changedElsewhere) push = mine
      else {
        push = merge(mine, theirs, localAt > Date.parse(row.updatedAt))
        deps.apply(push)
        dirty = true
        localAt = now()
      }
    }

    const at = row ? await deps.remote.update(push, row.updatedAt) : await deps.remote.insert(push)
    if (at) return done(at)
  }
  throw new Error('Cloud copy kept changing; will try again shortly.')
}
