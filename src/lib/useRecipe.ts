import { useMemo } from 'react'
import type { BrewerType, Kit } from '../data/types'
import { buildRecipe, COLD_BREW_GLASS } from './recipe'
import { useStore, type BrewPrefs, type State } from './store'
import { sizeOf } from '../data/brewers'

export function defaultPrefs(type: BrewerType, kit: Kit): BrewPrefs {
  if (type === 'coldbrew') {
    const jug = kit.brewers.find((b) => b.type === 'coldbrew')
    const max = jug ? sizeOf('coldbrew', jug.sizeId).maxWater : 1000
    return { people: Math.floor(max / COLD_BREW_GLASS), strength: 'balanced' }
  }
  return { people: 1, strength: 'balanced' }
}

export const activeBean = (s: State) => s.beans.find((b) => b.id === s.activeBeanId && !b.finished) ?? null

export function useRecipe(type: BrewerType, kit: Kit, override?: Partial<BrewPrefs>) {
  const saved = useStore((s) => s.prefs[type])
  const dialIn = useStore((s) => s.dialIn)
  const bean = useStore(activeBean)
  const prefs: BrewPrefs = { ...defaultPrefs(type, kit), ...saved, ...override }
  // Ignore a remembered grinder that has since been removed from the kit.
  const grinderId = prefs.grinderId && kit.grinders.includes(prefs.grinderId) ? prefs.grinderId : undefined
  const { people, strength, ratio, tempC } = prefs
  const recipe = useMemo(
    () => buildRecipe({ type, kit, people, strength, grinderId, dialIn, bean, custom: { ratio, tempC } }),
    [type, kit, people, strength, grinderId, dialIn, bean, ratio, tempC],
  )
  return { recipe, prefs, bean }
}
