import { BREWERS } from '../data/brewers'
import { brewTemp } from './recipe'
import { go } from './router'
import { setState, type BrewLog } from './store'

/** Load a past brew's settings (people, strength, grinder, beans, fine-tune) and open its recipe. */
export function brewAgain(log: BrewLog) {
  setState((s) => {
    const def = BREWERS[log.type]
    const bean = s.beans.find((b) => b.id === log.beanId && !b.finished)
    const defaultTemp = brewTemp(def, bean?.roast)
    return {
      ...s,
      activeBeanId: bean ? bean.id : s.activeBeanId,
      prefs: {
        ...s.prefs,
        [log.type]: {
          people: log.people,
          strength: log.strength,
          grinderId: log.grinderId,
          // Only carry over fine-tuning, not values that were BrewPrint's defaults at the time.
          ratio: log.ratio !== undefined && log.ratio !== def.ratio ? log.ratio : undefined,
          tempC: log.tempC !== undefined && log.tempC !== defaultTemp ? log.tempC : undefined,
        },
      },
    }
  })
  go(`recipe/${log.type}`)
}

export function toggleFavourite(id: string) {
  setState((s) => ({ ...s, journal: s.journal.map((j) => (j.id === id ? { ...j, favourite: !j.favourite } : j)) }))
}
