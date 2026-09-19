import { describe, expect, it, vi } from 'vitest'
import { checkForUpdates, decideStatus, startUpdateChecks, type BuildInfo } from './updateLogic'

const running: BuildInfo = { version: '0.3.0', buildTime: '2026-09-19T08:24:00.000Z', commit: 'abc1234' }
const newer: BuildInfo = { version: '0.3.1', buildTime: '2026-09-20T10:00:00.000Z', commit: 'def5678' }

function fakeDoc(visibility = 'visible') {
  const listeners = new Set<() => void>()
  return {
    visibilityState: visibility,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    fire() {
      listeners.forEach((fn) => fn())
    },
    listeners,
  }
}

function fakeTimers() {
  let tick: (() => void) | null = null
  return {
    setInterval: vi.fn((fn: () => void) => {
      tick = fn
      return 1
    }),
    clearInterval: vi.fn(),
    tick: () => tick?.(),
  }
}

describe('automatic update checks', () => {
  it('calls registration.update() when the app becomes visible again', () => {
    const reg = { update: vi.fn().mockResolvedValue(undefined) }
    const doc = fakeDoc('hidden')
    startUpdateChecks(reg, doc, fakeTimers())
    doc.fire()
    expect(reg.update).not.toHaveBeenCalled()
    doc.visibilityState = 'visible'
    doc.fire()
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('also checks on an interval, only while visible', () => {
    const reg = { update: vi.fn().mockResolvedValue(undefined) }
    const doc = fakeDoc('visible')
    const timers = fakeTimers()
    startUpdateChecks(reg, doc, timers)
    expect(timers.setInterval).toHaveBeenCalledWith(expect.any(Function), 60_000)
    timers.tick()
    expect(reg.update).toHaveBeenCalledTimes(1)
    doc.visibilityState = 'hidden'
    timers.tick()
    expect(reg.update).toHaveBeenCalledTimes(1)
  })

  it('swallows failures (offline), whether rejected or thrown', async () => {
    const rejecting = { update: vi.fn().mockRejectedValue(new Error('offline')) }
    const throwing = {
      update: vi.fn(() => {
        throw new Error('invalid state')
      }),
    }
    const doc = fakeDoc('visible')
    startUpdateChecks(rejecting, doc, fakeTimers())
    startUpdateChecks(throwing, doc, fakeTimers())
    expect(() => doc.fire()).not.toThrow()
    await Promise.resolve()
  })

  it('cleans up its listener and interval', () => {
    const doc = fakeDoc()
    const timers = fakeTimers()
    const stop = startUpdateChecks({ update: vi.fn().mockResolvedValue(undefined) }, doc, timers)
    expect(doc.listeners.size).toBe(1)
    stop()
    expect(doc.listeners.size).toBe(0)
    expect(timers.clearInterval).toHaveBeenCalledWith(1)
  })
})

describe('Check for updates button', () => {
  const deps = (patch: Partial<Parameters<typeof checkForUpdates>[0]> = {}) => ({
    registration: { update: vi.fn().mockResolvedValue(undefined) },
    running,
    fetchLatest: vi.fn().mockResolvedValue(running),
    settle: vi.fn().mockResolvedValue(undefined),
    isWaiting: () => false,
    ...patch,
  })

  it('calls registration.update() and reports up to date', async () => {
    const registration = { update: vi.fn().mockResolvedValue(undefined) }
    const result = await checkForUpdates(deps({ registration }))
    expect(registration.update).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ status: 'up-to-date', latest: running })
  })

  it('reports an update ready when a new worker is waiting', async () => {
    expect((await checkForUpdates(deps({ fetchLatest: vi.fn().mockResolvedValue(newer), isWaiting: () => true }))).status).toBe('update-ready')
  })

  it('reports downloading when a newer build is deployed but not installed yet', async () => {
    expect((await checkForUpdates(deps({ fetchLatest: vi.fn().mockResolvedValue(newer) }))).status).toBe('downloading')
  })

  it('reports offline calmly instead of throwing', async () => {
    const result = await checkForUpdates(
      deps({
        registration: { update: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) },
        fetchLatest: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      }),
    )
    expect(result).toEqual({ status: 'offline', latest: null })
  })

  it('without a service worker, a newer deployed build means reload to update', async () => {
    expect((await checkForUpdates(deps({ registration: null, fetchLatest: vi.fn().mockResolvedValue(newer) }))).status).toBe('update-ready')
    expect((await checkForUpdates(deps({ registration: null }))).status).toBe('up-to-date')
  })
})

describe('decideStatus', () => {
  it('a waiting worker always wins', () => {
    expect(decideStatus({ waiting: true, swChecked: false, latest: null, running })).toBe('update-ready')
  })
  it('an older or equal deployed build is up to date', () => {
    expect(decideStatus({ waiting: false, swChecked: true, latest: running, running })).toBe('up-to-date')
  })
})
