import { useSyncExternalStore } from 'react'

/** Tiny hash router: "#/recipe/v60" → ["recipe", "v60"]. Hash routing keeps the PWA host-agnostic. */
const subscribe = (l: () => void) => {
  window.addEventListener('hashchange', l)
  return () => window.removeEventListener('hashchange', l)
}

export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean)
}

export function go(path: string, replace = false) {
  const url = `#/${path.replace(/^\//, '')}`
  if (replace) window.location.replace(url)
  else window.location.hash = url
}

export function back(fallback = '') {
  if (window.history.length > 1) window.history.back()
  else go(fallback, true)
}
