import { useEffect } from 'react'

let ctx: AudioContext | null = null

/** Must be called from a tap first, so iOS lets us play sound later. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

export function chime() {
  try {
    navigator.vibrate?.([120, 60, 120])
  } catch {
    // Vibration not supported.
  }
  if (!ctx) return
  const now = ctx.currentTime
  ;[880, 1320].forEach((freq, i) => {
    const osc = ctx!.createOscillator()
    const gain = ctx!.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.14
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    osc.connect(gain).connect(ctx!.destination)
    osc.start(t)
    osc.stop(t + 0.55)
  })
}

/** Keep the screen on while brewing. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        // Denied (low battery, not visible). Not critical.
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && void acquire()
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}

export const mmss = (s: number) => {
  const sec = Math.max(0, Math.round(s))
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}
