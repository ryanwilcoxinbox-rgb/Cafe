import { describe, expect, it } from 'vitest'
import { DEFAULTS, hydrate } from './store'

describe('hydrate', () => {
  it('upgrades data saved before installPromptDismissed existed, keeping everything else', () => {
    const v1 = {
      kit: { brewers: [{ uid: 'a', type: 'v60', sizeId: '02' }], grinders: ['k6'], scales: [], kettle: { gooseneck: true, tempControl: false }, cupSize: 250 },
      dialIn: { 'v60:k6': -4 },
      prefs: { v60: { people: 2, strength: 'stronger' } },
      journal: [{ id: 'j1' }],
      beans: [{ id: 'b1', name: 'Guji', roast: 'light', addedAt: 1 }],
      activeBeanId: 'b1',
    }
    const state = hydrate(JSON.stringify(v1))
    expect(state.installPromptDismissed).toBe(false)
    expect(state.kit).toEqual(v1.kit)
    expect(state.dialIn).toEqual(v1.dialIn)
    expect(state.prefs).toEqual(v1.prefs)
    expect(state.beans).toEqual(v1.beans)
    expect(state.activeBeanId).toBe('b1')
  })

  it('fills in fields missing from the very first version', () => {
    const state = hydrate(JSON.stringify({ kit: null, dialIn: {}, prefs: {}, journal: [] }))
    expect(state).toEqual(DEFAULTS)
  })

  it('keeps a saved dismissal', () => {
    expect(hydrate(JSON.stringify({ installPromptDismissed: true })).installPromptDismissed).toBe(true)
  })

  it('falls back to defaults for empty or corrupt data', () => {
    expect(hydrate(null)).toEqual(DEFAULTS)
    expect(hydrate('{not json')).toEqual(DEFAULTS)
    expect(hydrate('[]')).toEqual(DEFAULTS)
  })
})
