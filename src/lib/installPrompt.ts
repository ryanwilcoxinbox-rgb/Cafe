import { useSyncExternalStore } from 'react'
import { getInstallOffer, type InstallEnv, type InstallOffer } from './install'
import { useStore } from './store'

/*
 * Browser side of the install banner. The listeners below are registered at MODULE SCOPE (this
 * module is imported by main.tsx before React renders) so an early beforeinstallprompt can't be
 * missed before a component subscribes.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedNow = false
let version = 0
const listeners = new Set<() => void>()
const notify = () => {
  version++
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  try {
    window.addEventListener('beforeinstallprompt', (event) => {
      // Stop the browser's own mini-infobar competing with our banner.
      event.preventDefault()
      deferredPrompt = event as BeforeInstallPromptEvent
      notify()
    })
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null
      installedNow = true
      notify()
    })
  } catch {
    // No event support: the manual instructions still work.
  }
}

/** Read everything defensively: a missing API must never break the app. */
export function readInstallEnv(dismissed: boolean): InstallEnv {
  const safe = <T,>(read: () => T, fallback: T): T => {
    try {
      return read()
    } catch {
      return fallback
    }
  }
  return {
    ua: safe(() => navigator.userAgent, ''),
    maxTouchPoints: safe(() => navigator.maxTouchPoints ?? 0, 0),
    displayStandalone: installedNow || safe(() => window.matchMedia('(display-mode: standalone)').matches, false),
    navigatorStandalone: safe(() => (navigator as Navigator & { standalone?: boolean }).standalone === true, false),
    hasPrompt: deferredPrompt !== null,
    dismissed,
  }
}

/** Only call from a real tap. The event is single-use, so it's cleared before prompting. */
export async function promptInstall() {
  const event = deferredPrompt
  if (!event) return
  deferredPrompt = null
  notify()
  try {
    await event.prompt()
    await event.userChoice
  } catch {
    // Prompt refused or already used: the banner falls back to manual instructions.
  }
}

export function useInstallOffer(): InstallOffer {
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => version,
  )
  const dismissed = useStore((s) => s.installPromptDismissed)
  return getInstallOffer(readInstallEnv(dismissed))
}
