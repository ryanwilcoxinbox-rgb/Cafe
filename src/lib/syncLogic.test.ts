import { describe, expect, it } from 'vitest'
import type { Kit } from '../data/types'
import { DEFAULTS, type BrewLog, type State } from './store'
import { merge, NO_META, pick, runSync, type Remote, type Synced, type SyncMeta } from './syncLogic'

const kit = (grinder: string): Kit => ({
  brewers: [{ uid: 'a', type: 'v60', sizeId: '02' }],
  grinders: [grinder],
  scales: [],
  kettle: { gooseneck: true, tempControl: false },
  cupSize: 250,
})
const brew = (id: string, at: number) => ({ id, at, type: 'v60', taste: 'right' }) as BrewLog
const bean = (id: string, name = id) => ({ id, name, roast: 'light' as const, addedAt: 1 })

/** An in-memory cloud row with a server clock, like the real table. */
class FakeCloud implements Remote {
  row: { data: Synced; updatedAt: string } | null = null
  clock = Date.parse('2026-09-22T10:00:00Z')
  writes = 0
  /** Simulate another device writing between our read and our write. */
  interfere: (() => void) | null = null
  private stamp() {
    this.clock += 1000
    return new Date(this.clock).toISOString()
  }
  put(data: Synced) {
    this.row = { data: structuredClone(data), updatedAt: this.stamp() }
  }
  async fetch() {
    const row = this.row && structuredClone(this.row)
    this.interfere?.()
    this.interfere = null
    return row
  }
  async insert(data: Synced) {
    if (this.row) return null
    this.writes++
    this.put(data)
    return this.row!.updatedAt
  }
  async update(data: Synced, expected: string) {
    if (!this.row || this.row.updatedAt !== expected) return null
    this.writes++
    this.put(data)
    return this.row.updatedAt
  }
}

function device(initial: Partial<State> = {}) {
  let state: State = { ...DEFAULTS, ...initial }
  let meta: SyncMeta = NO_META
  let version = 0
  return {
    get state() {
      return state
    },
    get meta() {
      return meta
    },
    edit(patch: Partial<State>) {
      state = { ...state, ...patch }
      version++
      meta = { ...meta, dirty: true, localAt: Date.parse('2026-09-22T12:00:00Z') }
    },
    async sync(cloud: Remote, userId = 'u1') {
      meta = await runSync({
        userId,
        meta,
        local: () => state,
        apply: (s) => (state = { ...state, ...s }),
        remote: cloud,
        version: () => version,
        now: () => Date.parse('2026-09-22T12:00:00Z'),
      })
    },
  }
}

describe('runSync', () => {
  it('uploads an existing phone the first time the user signs in', async () => {
    const cloud = new FakeCloud()
    const phone = device({ kit: kit('k6'), journal: [brew('j1', 1)] })
    await phone.sync(cloud)
    expect(cloud.row?.data.kit).toEqual(kit('k6'))
    expect(cloud.row?.data.journal).toHaveLength(1)
    expect(phone.meta).toMatchObject({ userId: 'u1', dirty: false, remoteAt: cloud.row?.updatedAt })
  })

  it('restores everything onto a freshly installed app', async () => {
    const cloud = new FakeCloud()
    cloud.put({ ...pick(DEFAULTS), kit: kit('k6'), journal: [brew('j1', 1)], beans: [bean('b1')], activeBeanId: 'b1' })
    const phone = device({ installPromptDismissed: true })
    await phone.sync(cloud)
    expect(phone.state.kit).toEqual(kit('k6'))
    expect(phone.state.journal.map((j) => j.id)).toEqual(['j1'])
    expect(phone.state.activeBeanId).toBe('b1')
    expect(phone.state.installPromptDismissed).toBe(true) // per-device, never overwritten
    expect(cloud.writes).toBe(0)
  })

  it('does nothing for a brand-new user with an empty app', async () => {
    const cloud = new FakeCloud()
    const phone = device()
    await phone.sync(cloud)
    expect(cloud.row).toBeNull()
    expect(phone.meta.userId).toBe('u1')
  })

  it('merges instead of overwriting when signing in on a phone that already has data', async () => {
    const cloud = new FakeCloud()
    cloud.put({ ...pick(DEFAULTS), kit: kit('k6'), journal: [brew('old', 1)], beans: [bean('b1')] })
    const phone = device({ kit: kit('c40'), journal: [brew('new', 2)], beans: [bean('b2')] })
    await phone.sync(cloud)
    expect(phone.state.journal.map((j) => j.id)).toEqual(['new', 'old'])
    expect(phone.state.beans.map((b) => b.id).sort()).toEqual(['b1', 'b2'])
    expect(cloud.row?.data.journal).toHaveLength(2)
  })

  it('pushes local edits and pulls edits made on another device', async () => {
    const cloud = new FakeCloud()
    const phone = device({ kit: kit('k6') })
    const tablet = device()
    await phone.sync(cloud)
    await tablet.sync(cloud)
    expect(tablet.state.kit).toEqual(kit('k6'))

    tablet.edit({ journal: [brew('t1', 5)] })
    await tablet.sync(cloud)
    await phone.sync(cloud)
    expect(phone.state.journal.map((j) => j.id)).toEqual(['t1'])
  })

  it('keeps deletions: an unchanged device adopts the cloud copy rather than merging', async () => {
    const cloud = new FakeCloud()
    const phone = device({ kit: kit('k6'), beans: [bean('b1'), bean('b2')] })
    const tablet = device()
    await phone.sync(cloud)
    await tablet.sync(cloud)
    phone.edit({ beans: [bean('b1')] })
    await phone.sync(cloud)
    await tablet.sync(cloud)
    expect(tablet.state.beans.map((b) => b.id)).toEqual(['b1'])
  })

  it('combines brews logged on two devices while both were offline', async () => {
    const cloud = new FakeCloud()
    const phone = device({ kit: kit('k6') })
    const tablet = device()
    await phone.sync(cloud)
    await tablet.sync(cloud)
    phone.edit({ journal: [brew('p1', 10)] })
    tablet.edit({ journal: [brew('t1', 20)] })
    await phone.sync(cloud)
    await tablet.sync(cloud)
    await phone.sync(cloud)
    expect(tablet.state.journal.map((j) => j.id)).toEqual(['t1', 'p1'])
    expect(phone.state.journal.map((j) => j.id)).toEqual(['t1', 'p1'])
  })

  it('retries when another device writes between our read and our write', async () => {
    const cloud = new FakeCloud()
    const phone = device({ kit: kit('k6') })
    await phone.sync(cloud)
    phone.edit({ journal: [brew('p1', 10)] })
    cloud.interfere = () => cloud.put({ ...cloud.row!.data, journal: [brew('t1', 20)] })
    await phone.sync(cloud)
    expect(cloud.row?.data.journal.map((j) => j.id)).toEqual(['t1', 'p1'])
    expect(phone.state.journal.map((j) => j.id)).toEqual(['t1', 'p1'])
  })

  it('treats a different account on the same phone as a first sign-in', async () => {
    const cloud = new FakeCloud()
    const phone = device({ kit: kit('k6') })
    await phone.sync(cloud, 'u1')
    const other = new FakeCloud()
    await phone.sync(other, 'u2')
    expect(other.row?.data.kit).toEqual(kit('k6'))
  })

  it('fills in fields that older app versions never saved', async () => {
    const cloud = new FakeCloud()
    cloud.row = { data: { kit: kit('k6'), dialIn: {}, prefs: {}, journal: [] } as unknown as Synced, updatedAt: '2026-01-01T00:00:00Z' }
    const phone = device()
    await phone.sync(cloud)
    expect(phone.state.beans).toEqual([])
    expect(phone.state.kit).toEqual(kit('k6'))
  })
})

describe('merge', () => {
  it('lets the newer side win settings while keeping both lists', () => {
    const a = { ...pick(DEFAULTS), kit: kit('a'), dialIn: { x: 1 }, journal: [brew('1', 1)] }
    const b = { ...pick(DEFAULTS), kit: kit('b'), dialIn: { x: 2, y: 3 }, journal: [brew('2', 2)] }
    const m = merge(a, b, false)
    expect(m.kit).toEqual(kit('b'))
    expect(m.dialIn).toEqual({ x: 2, y: 3 })
    expect(m.journal.map((j) => j.id)).toEqual(['2', '1'])
  })

  it('never replaces a kit with nothing', () => {
    expect(merge({ ...pick(DEFAULTS), kit: kit('a') }, pick(DEFAULTS), false).kit).toEqual(kit('a'))
  })
})
