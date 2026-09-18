import type { Recipe, Strength } from '../data/types'
import type { Body, Taste } from './store'

export interface Advice {
  headline: string
  detail: string
  /** Change to the grind dial, in the grinder's own units. Negative = finer. */
  grindDelta: number
  strength: Strength
}

const STRENGTHS: Strength[] = ['lighter', 'balanced', 'stronger']

const EXTRA: Record<Recipe['brewer']['type'], { sour: string; bitter: string }> = {
  v60: { sour: 'Slightly hotter water helps too.', bitter: 'Pour a touch more gently as well.' },
  chemex: { sour: 'Slightly hotter water helps too.', bitter: 'Pour a touch more gently as well.' },
  aeropress: { sour: 'Or steep 30 seconds longer.', bitter: 'Or steep 30 seconds less.' },
  frenchpress: { sour: 'Or leave the first steep a minute longer.', bitter: 'And pour it all off the grounds straight away.' },
  moka: { sour: 'Keep the heat steady so it flows the whole time.', bitter: 'Take it off the heat as soon as it turns pale.' },
  coldbrew: { sour: 'Steep 2–4 hours longer, too.', bitter: 'Steep a few hours less, too.' },
}

export function advise(recipe: Recipe, taste: Taste, body?: Body): Advice {
  const g = recipe.grind
  const nudge = g.grinder?.nudge ?? 0
  const grindDelta = taste === 'sour' ? -nudge : taste === 'bitter' ? nudge : 0
  const i = STRENGTHS.indexOf(recipe.strength)
  const strength = body === 'weak' ? STRENGTHS[Math.min(2, i + 1)] : body === 'strong' ? STRENGTHS[Math.max(0, i - 1)] : recipe.strength

  const parts: string[] = []
  let headline = 'Locked in.'
  if (taste === 'right') {
    parts.push("We'll brew it exactly like this next time.")
  } else {
    const dir = taste === 'sour' ? 'finer' : 'coarser'
    headline = taste === 'sour' ? 'Sour means under-extracted.' : 'Bitter means over-extracted.'
    if (grindDelta && g.setting !== null && g.grinder?.unit) {
      parts.push(`Grind ${nudge} ${g.grinder.unit} ${dir} next time (${g.setting} → ${g.setting + grindDelta}).`)
    } else {
      parts.push(`Grind a little ${dir} next time.`)
    }
    parts.push(EXTRA[recipe.brewer.type][taste])
  }
  if (strength !== recipe.strength) {
    parts.push(body === 'weak' ? "We'll make it a bit stronger." : "We'll make it a bit lighter.")
  }
  return { headline, detail: parts.join(' '), grindDelta, strength }
}
