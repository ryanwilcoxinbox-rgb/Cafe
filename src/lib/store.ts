import { useSyncExternalStore } from 'react'
import type { BrewerType, Kit, Strength } from '../data/types'

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
  beans?: string
  notes?: string
}

export interface BrewPrefs {
  people: number
  strength: Strength
  grinderId?: string
}

export interface State {
  kit: Kit | null
  /** Grind offsets learned from feedback, keyed "brewer:grinder". */
  dialIn: Record<string, number>
  prefs: Partial<Record<BrewerType, BrewPrefs>>
  journal: BrewLog[]
}

const KEY = 'brewprint:v1'
const EMPTY: State = { kit: null, dialIn: {}, prefs: {}, journal: [] }

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
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
