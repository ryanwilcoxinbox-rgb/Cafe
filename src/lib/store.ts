import { useSyncExternalStore } from 'react'
import type { Bean, BrewerType, Kit, Strength } from '../data/types'

export type Taste = 'sour' | 'right' | 'bitter'
export type Body = 'weak' | 'good' | 'strong'

export interface BrewLog {
  id: string
  at: number
  type: BrewerType
  people: number
  strength: Strength
  coffee: number
  water: number
  grind: string
  grinderId?: string
  seconds: number
  taste: Taste
  body?: Body
  /** Bean name at the time of brewing (kept even if the bag is deleted). */
  beans?: string
  beanId?: string
  ratio?: number
  tempC?: number
  favourite?: boolean
  notes?: string
}

export interface BrewPrefs {
  people: number
  strength: Strength
  grinderId?: string
  /** Fine-tune overrides. Absent = BrewPrint's recipe. */
  ratio?: number
  tempC?: number
}

export interface State {
  kit: Kit | null
  /** Grind offsets learned from feedback, keyed "brewer:grinder" or "brewer:grinder:bean". */
  dialIn: Record<string, number>
  prefs: Partial<Record<BrewerType, BrewPrefs>>
  journal: BrewLog[]
  beans: Bean[]
  activeBeanId?: string
  /** The user closed the "Add to Home Screen" banner. Permanent. */
  installPromptDismissed: boolean
}

const KEY = 'brewprint:v1'
export const DEFAULTS: State = { kit: null, dialIn: {}, prefs: {}, journal: [], beans: [], installPromptDismissed: false }

/**
 * Saved data from any earlier version is merged over the current defaults, so a new preference
 * never resets someone's kit, beans or journal. Corrupt data falls back to defaults.
 */
export function hydrate(raw: string | null): State {
  if (!raw) return DEFAULTS
  try {
    const saved = JSON.parse(raw)
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return DEFAULTS
    return { ...DEFAULTS, ...saved }
  } catch {
    return DEFAULTS
  }
}

function load(): State {
  try {
    return hydrate(localStorage.getItem(KEY))
  } catch {
    return DEFAULTS
  }
}

let state: State = load()
const listeners = new Set<() => void>()

export function setState(update: (s: State) => State) {
  state = update(state)
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Private mode or storage full: keep working in memory.
  }
  listeners.forEach((l) => l())
}

export function getState() {
  return state
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => select(state),
  )
}

export const uid = () => Math.random().toString(36).slice(2, 10)
