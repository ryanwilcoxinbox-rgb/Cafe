export type BrewerType = 'v60' | 'aeropress' | 'moka' | 'frenchpress' | 'chemex' | 'coldbrew'

export type Strength = 'lighter' | 'balanced' | 'stronger'

export type ScaleType = 'micro' | 'timer' | 'basic'

export type Roast = 'light' | 'medium' | 'dark'

export interface Bean {
  id: string
  name: string
  roaster?: string
  roast: Roast
  process?: 'washed' | 'natural' | 'honey' | 'other'
  /** YYYY-MM-DD */
  roastedOn?: string
  notes?: string
  finished?: boolean
  addedAt: number
}

/** One physical brewer the user owns. People can own two of the same type (e.g. a 45cl and a 1L press). */
export interface OwnedBrewer {
  uid: string
  type: BrewerType
  sizeId: string
}

export interface Kit {
  brewers: OwnedBrewer[]
  grinders: string[]
  scales: ScaleType[]
  kettle: { gooseneck: boolean; tempControl: boolean }
  /** Water per person, in grams (= ml). */
  cupSize: number
}

export interface BrewerSize {
  id: string
  label: string
  /** Most brew water this size handles comfortably, in grams. */
  maxWater: number
  /** Below this the brew gets awkward (e.g. a shallow bed in a Chemex). */
  minWater?: number
  /** Moka pots: the basket decides the dose. */
  fixedCoffee?: number
  /** Moka pots: how many people one pot shares between. */
  serves?: number
}

export interface BeanAdvice {
  roast: string
  origins: string
  why: string
}

export interface BrewerDef {
  type: BrewerType
  name: string
  tagline: string
  /** How the people count turns into water. */
  scaling: 'ratio' | 'aeropress' | 'moka' | 'coldbrew'
  sizes: BrewerSize[]
  defaultSizeId: string
  /** Grams of water per gram of coffee at "balanced". */
  ratio: number
  tempC: number | 'cold'
  /** 0 (Turkish) → 100 (coarsest). Grinders map this onto their own dial. */
  coarseness: number
  grindLabel: string
  grindLike: string
  totalTime: string
  /** Roast levels that suit this brewer. */
  roasts: Roast[]
  beans: BeanAdvice
}

export interface GrinderDef {
  id: string
  name: string
  kind: 'hand' | 'electric' | 'blade' | 'preground'
  /** Word used for the dial ("clicks", "setting"). Absent = no numeric dial. */
  unit?: string
  /** [coarseness, dial setting] pairs, ascending. Interpolated linearly. */
  points?: [number, number][]
  min?: number
  max?: number
  /** A sensible dial-in nudge for this grinder. */
  nudge?: number
  /** Beans the grinder holds in one go, grams. */
  capacity?: number
  note?: string
}

export interface Step {
  title: string
  body: string
  /** Countdown for this step, seconds. Absent = waits for "Next". */
  seconds?: number
  /** What the scale should read at the end of this step, grams. */
  target?: number
  /** One line on why this step matters. */
  why?: string
  /** Short handwritten aside shown next to the step. */
  aside?: string
}

export interface Recipe {
  brewer: BrewerDef
  size: BrewerSize
  people: number
  strength: Strength
  rounds: number
  coffee: number
  water: number
  /** AeroPress concentrate: hot water added after pressing. */
  bypass: number
  ratio: number
  /** Ratio before the strength shift (BrewPrint's or the user's fine-tune). */
  baseRatio: number
  /** Numeric brew temperature, null for moka/cold. */
  tempC: number | null
  temp: { value: string; hint: string }
  /** Advice about the chosen beans (roast match, freshness). */
  beanNotes: string[]
  grind: GrindResult
  prep: string[]
  steps: Step[]
  notes: string[]
  servingNote?: string
}

export interface GrindResult {
  grinder: GrinderDef | null
  setting: number | null
  display: string
  hint: string
  loads: number
}
