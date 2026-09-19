/*
 * Pure "Add to Home Screen" decisions. No browser access in here: everything comes in as plain
 * inputs so it can be unit tested with real user-agent strings. Browser glue lives in installPrompt.ts.
 */

export type IOSBrowser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'opera' | 'google' | 'other'

export type InstallOffer =
  | { kind: 'none' }
  /** The browser gave us a beforeinstallprompt event: show our own Install button. */
  | { kind: 'prompt' }
  | { kind: 'ios'; browser: IOSBrowser }
  | { kind: 'android-manual' }
  /** BrewPrint is built for the phone at the kettle; desktop gets a low-key nudge. */
  | { kind: 'desktop'; canPrompt: boolean }
  | { kind: 'generic' }

export interface InstallEnv {
  ua: string
  maxTouchPoints: number
  /** matchMedia('(display-mode: standalone)').matches */
  displayStandalone: boolean
  /** iOS's non-standard navigator.standalone */
  navigatorStandalone: boolean
  /** A deferred beforeinstallprompt event is available. */
  hasPrompt: boolean
  /** The user dismissed our banner before. */
  dismissed: boolean
}

export const isInstalled = (env: Pick<InstallEnv, 'displayStandalone' | 'navigatorStandalone'>) =>
  env.displayStandalone || env.navigatorStandalone

/** iPadOS 13+ can report itself as a Mac, so a "Mac" with a touch screen is an iPad. */
export const isIOS = (ua: string, maxTouchPoints: number) =>
  /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)

export const isAndroid = (ua: string) => /Android/.test(ua)

const isMobileUA = (ua: string) => /Mobi|Android|iPhone|iPad|iPod|Tablet|Silk|KAIOS/i.test(ua)

/** Wrapper tokens identify the browser. They tailor the copy; they never mean "can't install". */
export function iosBrowser(ua: string): IOSBrowser {
  if (/CriOS\//.test(ua)) return 'chrome'
  if (/FxiOS\//.test(ua)) return 'firefox'
  if (/EdgiOS\//.test(ua)) return 'edge'
  if (/OPiOS\/|OPT\//.test(ua)) return 'opera'
  if (/GSA\//.test(ua)) return 'google'
  if (/Version\/[\d.]+.*Safari\//.test(ua)) return 'safari'
  return 'other'
}

export function getInstallOffer(env: InstallEnv): InstallOffer {
  if (isInstalled(env) || env.dismissed) return { kind: 'none' }
  const ios = isIOS(env.ua, env.maxTouchPoints)
  if (ios) return { kind: 'ios', browser: iosBrowser(env.ua) }
  const mobile = isMobileUA(env.ua)
  if (!mobile) return { kind: 'desktop', canPrompt: env.hasPrompt }
  if (env.hasPrompt) return { kind: 'prompt' }
  if (isAndroid(env.ua)) return { kind: 'android-manual' }
  return { kind: 'generic' }
}

export const IOS_BROWSER_NAME: Record<IOSBrowser, string> = {
  safari: 'Safari',
  chrome: 'Chrome',
  firefox: 'Firefox',
  edge: 'Edge',
  opera: 'Opera',
  google: 'the Google app',
  other: 'your browser',
}
