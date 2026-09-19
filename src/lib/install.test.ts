import { describe, expect, it } from 'vitest'
import { getInstallOffer, iosBrowser, isIOS, type InstallEnv } from './install'

// Real-world user agents (iOS 17/18, Android 14, Windows/macOS desktop).
const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/126.2592.56 Mobile/15E148 Safari/605.1.15',
  iphoneGoogleApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/321.0.645787488 Mobile/15E148 Safari/604.1',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.3.24.104 (iPhone15,2; iOS 17_5; en_GB; en; scale=3.00; 1179x2556; 612223960)',
  // iPadOS 13+ Safari in its default "desktop website" mode.
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  desktopFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
}

const env = (patch: Partial<InstallEnv>): InstallEnv => ({
  ua: UA.iphoneSafari,
  maxTouchPoints: 5,
  displayStandalone: false,
  navigatorStandalone: false,
  hasPrompt: false,
  dismissed: false,
  ...patch,
})

describe('iOS detection', () => {
  it('spots iPhones and iPads that pretend to be Macs', () => {
    expect(isIOS(UA.iphoneSafari, 5)).toBe(true)
    expect(isIOS(UA.macSafari, 5)).toBe(true)
    expect(isIOS(UA.macSafari, 0)).toBe(false)
    expect(isIOS(UA.androidChrome, 5)).toBe(false)
  })

  it('identifies the browser from wrapper tokens', () => {
    expect(iosBrowser(UA.iphoneSafari)).toBe('safari')
    expect(iosBrowser(UA.iphoneChrome)).toBe('chrome')
    expect(iosBrowser(UA.iphoneFirefox)).toBe('firefox')
    expect(iosBrowser(UA.iphoneEdge)).toBe('edge')
    expect(iosBrowser(UA.iphoneGoogleApp)).toBe('google')
    expect(iosBrowser(UA.iphoneInstagram)).toBe('other')
  })
})

describe('getInstallOffer', () => {
  it('iPhone Safari gets Safari Share-sheet instructions', () => {
    expect(getInstallOffer(env({ ua: UA.iphoneSafari }))).toEqual({ kind: 'ios', browser: 'safari' })
  })

  it('iPhone Chrome, Firefox and Edge get their own Share-sheet instructions, not "use Safari"', () => {
    expect(getInstallOffer(env({ ua: UA.iphoneChrome }))).toEqual({ kind: 'ios', browser: 'chrome' })
    expect(getInstallOffer(env({ ua: UA.iphoneFirefox }))).toEqual({ kind: 'ios', browser: 'firefox' })
    expect(getInstallOffer(env({ ua: UA.iphoneEdge }))).toEqual({ kind: 'ios', browser: 'edge' })
  })

  it('iPad identifying as a Mac is treated as iOS', () => {
    expect(getInstallOffer(env({ ua: UA.macSafari, maxTouchPoints: 5 }))).toEqual({ kind: 'ios', browser: 'safari' })
  })

  it('a real Mac without touch is desktop', () => {
    expect(getInstallOffer(env({ ua: UA.macSafari, maxTouchPoints: 0 }))).toEqual({ kind: 'desktop', canPrompt: false })
  })

  it('Android with beforeinstallprompt gets an Install button', () => {
    expect(getInstallOffer(env({ ua: UA.androidChrome, maxTouchPoints: 5, hasPrompt: true }))).toEqual({ kind: 'prompt' })
  })

  it('Android without beforeinstallprompt gets manual menu instructions', () => {
    expect(getInstallOffer(env({ ua: UA.androidFirefox, maxTouchPoints: 5 }))).toEqual({ kind: 'android-manual' })
    expect(getInstallOffer(env({ ua: UA.androidChrome, maxTouchPoints: 5 }))).toEqual({ kind: 'android-manual' })
  })

  it('desktop Chromium with a prompt gets the phone nudge plus an optional install', () => {
    expect(getInstallOffer(env({ ua: UA.desktopChrome, maxTouchPoints: 0, hasPrompt: true }))).toEqual({ kind: 'desktop', canPrompt: true })
  })

  it('an ordinary desktop browser without a prompt gets the low-key phone nudge', () => {
    expect(getInstallOffer(env({ ua: UA.desktopFirefox, maxTouchPoints: 0 }))).toEqual({ kind: 'desktop', canPrompt: false })
  })

  it('shows nothing when already installed via display-mode: standalone', () => {
    expect(getInstallOffer(env({ ua: UA.androidChrome, displayStandalone: true, hasPrompt: true }))).toEqual({ kind: 'none' })
  })

  it('shows nothing when already installed via navigator.standalone (iOS)', () => {
    expect(getInstallOffer(env({ ua: UA.iphoneSafari, navigatorStandalone: true }))).toEqual({ kind: 'none' })
  })

  it('shows nothing once the banner has been dismissed', () => {
    expect(getInstallOffer(env({ ua: UA.iphoneChrome, dismissed: true }))).toEqual({ kind: 'none' })
    expect(getInstallOffer(env({ ua: UA.androidChrome, hasPrompt: true, dismissed: true }))).toEqual({ kind: 'none' })
  })
})
