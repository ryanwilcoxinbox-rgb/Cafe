import { useCallback, useEffect, useState } from 'react'

interface Watch {
  base: number
  since: number | null
}

/** A pausable stopwatch built on timestamps, so it stays accurate when the tab sleeps. */
export function useStopwatch() {
  const [w, setW] = useState<Watch>({ base: 0, since: null })
  const [, tick] = useState(0)
  const running = w.since !== null

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => tick((t) => t + 1), 200)
    return () => clearInterval(id)
  }, [running])

  const elapsed = w.base + (w.since !== null ? Date.now() - w.since : 0)

  return {
    elapsed,
    running,
    start: useCallback(() => setW({ base: 0, since: Date.now() }), []),
    pause: useCallback(() => setW((s) => (s.since === null ? s : { base: s.base + Date.now() - s.since, since: null })), []),
    resume: useCallback(() => setW((s) => (s.since !== null ? s : { ...s, since: Date.now() })), []),
    reset: useCallback(() => setW({ base: 0, since: null }), []),
  }
}

/** Handoff from the brew screen to the "enjoy" screen. In memory only. */
export const lastBrew = { seconds: 0 }
