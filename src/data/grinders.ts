import type { GrinderDef } from './types'

/*
 * Grind maps: [coarseness, dial] pairs. Coarseness anchors used by the brewers:
 *   25 moka · 40 AeroPress · 50 V60 · 60 Chemex · 75 French press · 82 cold brew
 * These are starting points from common community charts. The dial-in feedback after each
 * brew nudges them per brewer, so they end up right for your beans and your taste.
 */
export const GRINDERS: GrinderDef[] = [
  {
    id: 'k6',
    name: 'KINGrinder K6',
    kind: 'hand',
    unit: 'clicks',
    points: [[15, 40], [25, 52], [40, 72], [50, 88], [60, 100], [75, 118], [85, 130]],
    min: 0,
    max: 240,
    nudge: 4,
    capacity: 35,
    note: 'Clicks counted from zero (burrs touching).',
  },
  {
    id: 'wancle',
    name: 'Wancle electric burr (28 settings)',
    kind: 'electric',
    unit: 'setting',
    points: [[15, 1], [25, 4], [40, 10], [50, 14], [60, 18], [75, 23], [85, 27]],
    min: 1,
    max: 28,
    nudge: 1,
    note: 'Setting 1 is finest, 28 is coarsest.',
  },
  {
    id: 'comandante',
    name: 'Comandante C40',
    kind: 'hand',
    unit: 'clicks',
    points: [[15, 12], [25, 16], [40, 20], [50, 25], [60, 28], [75, 32], [85, 35]],
    min: 0,
    max: 50,
    nudge: 1,
    capacity: 40,
  },
  {
    id: 'timemore-c2',
    name: 'Timemore C2 / C3',
    kind: 'hand',
    unit: 'clicks',
    points: [[15, 8], [25, 10], [40, 13], [50, 16], [60, 19], [75, 22], [85, 25]],
    min: 0,
    max: 36,
    nudge: 1,
    capacity: 25,
  },
  {
    id: 'encore',
    name: 'Baratza Encore',
    kind: 'electric',
    unit: 'setting',
    points: [[15, 4], [25, 8], [40, 12], [50, 15], [60, 19], [75, 28], [85, 34]],
    min: 1,
    max: 40,
    nudge: 2,
  },
  {
    id: 'burr-other',
    name: 'Other burr grinder',
    kind: 'electric',
    note: 'Match the texture description, then fine-tune by taste.',
  },
  {
    id: 'blade',
    name: 'Blade grinder',
    kind: 'blade',
    note: 'Pulse in short bursts and shake between pulses for a more even grind.',
  },
  {
    id: 'preground',
    name: 'Pre-ground coffee',
    kind: 'preground',
  },
]

export const grinderById = (id: string) => GRINDERS.find((g) => g.id === id)
