import { brewerName, BREWERS, sizeOf } from '../data/brewers'
import { grinderById } from '../data/grinders'
import type {
  Bean,
  BrewerDef,
  BrewerSize,
  BrewerType,
  GrinderDef,
  GrindResult,
  Kit,
  Recipe,
  Roast,
  Step,
  Strength,
} from '../data/types'

export const STRENGTH_SHIFT: Record<Strength, number> = { lighter: 1.5, balanced: 0, stronger: -1.5 }
export const COLD_BREW_GLASS = 200
const GRAMS_PER_TBSP = 6 // whole beans, level tablespoon

export interface RecipeInput {
  type: BrewerType
  kit: Kit
  people: number
  strength: Strength
  grinderId?: string
  dialIn?: Record<string, number>
  bean?: Pick<Bean, 'id' | 'roast' | 'roastedOn'> | null
  /** Fine-tune overrides from the user. */
  custom?: { ratio?: number; tempC?: number }
  /** For tests. */
  now?: number
}

/** Dial-in keys: per brewer + grinder, and optionally per bag of beans. */
export const dialKey = (type: BrewerType, grinderId: string, beanId?: string) =>
  beanId ? `${type}:${grinderId}:${beanId}` : `${type}:${grinderId}`

/** A bean's own dial-in wins; a new bag starts from the brewer's general one. */
export function dialOffset(dialIn: Record<string, number> | undefined, type: BrewerType, grinderId: string, beanId?: string) {
  if (!dialIn) return 0
  return (beanId ? dialIn[dialKey(type, grinderId, beanId)] : undefined) ?? dialIn[dialKey(type, grinderId)] ?? 0
}

export const ROAST_TEMP: Record<Roast, number> = { light: 2, medium: 0, dark: -3 }

export function restDays(roastedOn: string | undefined, now = Date.now()) {
  if (!roastedOn) return null
  const t = Date.parse(roastedOn + 'T00:00:00')
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((now - t) / 86_400_000))
}

export function interpolate(points: [number, number][], x: number) {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]
    if (x <= x1) {
      const [x0, y0] = points[i - 1]
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return points[points.length - 1][1]
}

const round5 = (n: number) => Math.round(n / 5) * 5
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Owned sizes of this brewer type, smallest first. */
function ownedSizes(kit: Kit, type: BrewerType): BrewerSize[] {
  const sizes = kit.brewers.filter((b) => b.type === type).map((b) => sizeOf(type, b.sizeId))
  if (!sizes.length) sizes.push(sizeOf(type, BREWERS[type].defaultSizeId))
  return sizes.sort((a, b) => a.maxWater - b.maxWater)
}

/** Smallest owned size that fits, else the largest split into rounds. */
function fit(sizes: BrewerSize[], need: (s: BrewerSize) => number) {
  const size = sizes.find((s) => need(s) <= 1) ?? sizes[sizes.length - 1]
  return { size, rounds: Math.max(1, Math.ceil(need(size) - 1e-9)) }
}

export function defaultGrinder(kit: Kit, coffee: number): GrinderDef | null {
  const owned = kit.grinders.map(grinderById).filter((g): g is GrinderDef => !!g)
  const electric = owned.find((g) => g.kind === 'electric')
  const hand = owned.find((g) => g.kind === 'hand')
  // Big batches go to the electric grinder. Hand grinders win on everything else.
  if (coffee > 30 && electric) return electric
  return hand ?? electric ?? owned.find((g) => g.kind === 'blade') ?? owned[0] ?? null
}

export function grindFor(
  def: BrewerDef,
  grinder: GrinderDef | null,
  coffee: number,
  offset = 0,
): GrindResult {
  const base = { grinder, setting: null, display: def.grindLabel, hint: def.grindLike, loads: 1 }
  if (!grinder) return base
  const loads = grinder.capacity ? Math.ceil(coffee / grinder.capacity) : 1
  if (grinder.points && grinder.unit) {
    const raw = Math.round(interpolate(grinder.points, def.coarseness) + offset)
    const setting = clamp(raw, grinder.min ?? 0, grinder.max ?? 999)
    return {
      grinder,
      setting,
      display: grinder.unit === 'clicks' ? `${setting} clicks` : `Setting ${setting}`,
      hint: `${def.grindLabel} · ${def.grindLike.toLowerCase()}`,
      loads,
    }
  }
  if (grinder.kind === 'blade') {
    const secs = def.coarseness <= 30 ? 20 : def.coarseness <= 55 ? 12 : def.coarseness <= 65 ? 10 : 7
    return { ...base, hint: `${def.grindLike}. Pulse about ${secs}s in total, shaking between bursts.`, loads }
  }
  if (grinder.kind === 'preground') {
    const bag =
      def.type === 'moka' ? '"moka" or "espresso"' : def.coarseness >= 70 ? '"cafetière" or coarse' : '"filter"'
    return { ...base, display: 'Pre-ground', hint: `Look for ${bag} grind on the bag.` }
  }
  return { ...base, loads }
}

/** Brew temperature: the user's fine-tune, else the brewer's default nudged by roast. */
export function brewTemp(def: BrewerDef, roast?: Roast, custom?: number): number | null {
  if (def.tempC === 'cold' || def.tempC === 'machine' || def.type === 'moka') return null
  if (custom) return custom
  return Math.min(100, def.tempC + (roast ? ROAST_TEMP[roast] : 0))
}

export function tempFor(def: BrewerDef, kit: Kit, t: number | null) {
  if (def.tempC === 'cold') return { value: 'Cold', hint: 'Filtered water, fridge-cold is fine' }
  if (def.tempC === 'machine') return { value: 'Machine', hint: 'It heats the water for you' }
  if (t === null) return { value: 'Just boiled', hint: 'Hot water goes into the base' }
  const wait = t >= 97 ? 'Straight off the boil' : t >= 95 ? 'Boil, then wait ~30 s' : t >= 92 ? 'Boil, then wait ~1 min' : 'Boil, then wait ~2 min'
  return { value: `${t}°C`, hint: kit.kettle.tempControl ? `Set your kettle to ${t}°C` : wait }
}

export function beansInTbsp(coffee: number) {
  const tbsp = Math.max(0.5, Math.round((coffee / GRAMS_PER_TBSP) * 2) / 2)
  const whole = Math.floor(tbsp)
  return `${whole || ''}${tbsp > whole ? '½' : ''} tbsp`
}

export function buildRecipe(input: RecipeInput): Recipe {
  const { type, kit, strength } = input
  const def = BREWERS[type]
  const people = clamp(Math.round(input.people), 1, 12)
  const sizes = ownedSizes(kit, type)
  const baseRatio = input.custom?.ratio ?? def.ratio
  const ratio = baseRatio + STRENGTH_SHIFT[strength]
  const tempC = brewTemp(def, input.bean?.roast, input.custom?.tempC)
  const days = restDays(input.bean?.roastedOn, input.now)
  const notes: string[] = []
  let size: BrewerSize
  let rounds = 1
  let water: number
  let coffee: number
  let bypass = 0
  let servingNote: string | undefined

  switch (def.scaling) {
    case 'ratio': {
      const total = people * kit.cupSize
      ;({ size, rounds } = fit(sizes, (s) => total / s.maxWater))
      water = round5(total / rounds)
      if (size.minWater && water < size.minWater) {
        water = size.minWater
        notes.push(`The ${def.name} works best with at least ${size.minWater} g of water, so there'll be a little extra.`)
      }
      coffee = water / ratio
      break
    }
    case 'aeropress': {
      const total = people * kit.cupSize
      ;({ size, rounds } = fit(sizes, (s) => total / (s.maxWater * 2)))
      const perPress = total / rounds
      if (perPress <= size.maxWater) {
        water = round5(perPress)
      } else {
        // Concentrate: brew strong, top up with hot water after pressing.
        water = round5(size.maxWater * 0.8)
        bypass = round5(perPress - water)
      }
      coffee = round5(perPress) / ratio
      break
    }
    case 'moka': {
      ;({ size, rounds } = fit(sizes, (s) => people / (s.serves ?? 1)))
      water = size.maxWater
      coffee = size.fixedCoffee!
      const share = Math.min(people, size.serves ?? 1)
      const yieldMl = round5(water * 0.85)
      const topUp = strength === 'stronger' ? 0 : round5(Math.max(0, kit.cupSize * (strength === 'lighter' ? 0.8 : 0.5) - yieldMl / share))
      servingNote =
        share > 1
          ? `Makes about ${yieldMl} ml of strong coffee. Split it between ${share}.`
          : `Makes about ${yieldMl} ml of strong coffee.`
      if (topUp > 0) servingNote += ` For a longer drink, top each cup up with ~${topUp} ml of hot water or milk.`
      else servingNote += ' Drink it short and strong.'
      if (strength !== 'balanced') notes.push("A moka pot's basket sets the dose, so strength comes from how much you top it up.")
      break
    }
    case 'coldbrew': {
      const total = people * COLD_BREW_GLASS
      ;({ size, rounds } = fit(sizes, (s) => total / s.maxWater))
      water = clamp(round5(total / rounds), size.minWater ?? 0, size.maxWater)
      coffee = water / ratio
      servingNote =
        strength === 'stronger'
          ? 'This is a concentrate. Serve over ice, mixed 1:1 with water or milk.'
          : 'Serve over ice, straight or with a splash of milk.'
      break
    }
  }

  const precise = kit.scales.includes('micro')
  coffee = precise ? Math.round(coffee * 10) / 10 : Math.round(coffee)

  const grinder = input.grinderId ? grinderById(input.grinderId) ?? null : defaultGrinder(kit, coffee)
  const offset = grinder ? dialOffset(input.dialIn, type, grinder.id, input.bean?.id) : 0
  const grind = grindFor(def, grinder, coffee, offset)

  if (rounds > 1) {
    const what = def.scaling === 'moka' ? 'pots' : def.scaling === 'aeropress' ? 'presses' : 'rounds'
    notes.unshift(`Your ${brewerName(type, size)} can't brew it all at once, so this is ${rounds} ${what}. All amounts below are for one.`)
  }
  if (grind.loads > 1 && grind.grinder) {
    notes.push(`The ${grind.grinder.name} holds about ${grind.grinder.capacity} g, so grind in ${grind.loads} loads.`)
  }

  const ctx: Ctx = {
    def,
    kit,
    coffee,
    water,
    bypass,
    people: Math.ceil(people / rounds),
    grind,
    hasScale: kit.scales.length > 0,
    gooseneck: kit.kettle.gooseneck,
    tempC,
    fresh: days !== null && days < 4,
  }
  return {
    brewer: def,
    size,
    people,
    strength,
    rounds,
    coffee,
    water,
    bypass,
    ratio: def.scaling === 'moka' ? Math.round((water / coffee) * 10) / 10 : ratio,
    baseRatio,
    tempC,
    temp: tempFor(def, kit, tempC),
    beanNotes: beanNotes(def, input.bean?.roast, days, tempC, !!input.custom?.tempC),
    grind,
    prep: prepFor(ctx),
    steps: STEPS[type](ctx),
    notes,
    servingNote,
  }
}

interface Ctx {
  def: BrewerDef
  kit: Kit
  coffee: number
  water: number
  bypass: number
  people: number
  grind: GrindResult
  hasScale: boolean
  gooseneck: boolean
  tempC: number | null
  fresh: boolean
}

const POUR_OVER: BrewerType[] = ['v60', 'chemex']

function beanNotes(def: BrewerDef, roast: Roast | undefined, days: number | null, tempC: number | null, customTemp: boolean) {
  const notes: string[] = []
  const name = def.type === 'coldbrew' ? 'cold brew' : `a ${def.name}`
  if (roast && !def.roasts.includes(roast)) {
    if (roast === 'dark') {
      notes.push(`Dark roasts can turn harsh in ${name}.${tempC && !customTemp ? ` We've cooled the water to ${tempC}°C.` : ''} Go coarser if it tastes bitter.`)
    } else if (roast === 'light') {
      notes.push(
        def.type === 'coldbrew'
          ? 'Light roasts can taste flat as cold brew. Give it the full 12 hours.'
          : `Light roasts can taste thin or sour in ${name}. Grind a touch finer if it's sour.`,
      )
    }
  } else if (roast && tempC && !customTemp && ROAST_TEMP[roast]) {
    notes.push(
      roast === 'light'
        ? `Light roast, so the water is a touch hotter (${tempC}°C) to bring out the sweetness.`
        : `Dark roast, so the water is a little cooler (${tempC}°C) to keep it smooth.`,
    )
  }
  if (days !== null) {
    const ago = days === 0 ? 'Roasted today' : days === 1 ? 'Roasted yesterday' : `Roasted ${days} days ago`
    if (days < 4) {
      notes.push(
        POUR_OVER.includes(def.type)
          ? `${ago}: very fresh. It'll bloom a lot, so we've added 15 s to the bloom.`
          : `${ago}: very fresh. It can taste a bit sharp until it's rested for 4 days or so.`,
      )
    } else if (days <= 35) notes.push(`${ago}: right in the sweet spot.`)
    else if (days <= 60) notes.push(`${ago}: past its peak. Grind a touch finer to get the flavour out.`)
    else notes.push(`${ago}: pretty stale. Still drinkable, but a fresh bag will taste much better.`)
  }
  return notes
}

const g = (n: number) => `${n} g`
const upTo = (c: Ctx, grams: number) => (c.hasScale ? `until the scale reads ${g(grams)}` : `to about ${grams} ml in total`)
const pourStyle = (c: Ctx) =>
  c.gooseneck ? 'Pour in slow spirals from the centre out' : 'Pour slowly and steadily into the middle'

function prepFor(c: Ctx): string[] {
  const { def, kit } = c
  const heat =
    def.tempC === 'cold'
      ? `Measure out ${c.water} ml of cold, filtered water.`
      : def.tempC === 'machine'
        ? `Fill the tank with ${c.water} ml of cold, filtered water. Measure it with a jug, because the "cup" marks on the tank vary by brand.`
      : c.tempC === null
        ? 'Boil the kettle. Starting with hot water stops the coffee from cooking on the stove.'
        : `Heat your water to ${c.tempC}°C${kit.kettle.tempControl ? '' : ' (' + tempFor(def, kit, c.tempC).hint.toLowerCase() + ')'}.`
  const dose = c.hasScale ? g(c.coffee) : `${beansInTbsp(c.coffee)} of whole beans (${g(c.coffee)})`
  const where = c.grind.grinder && c.grind.setting !== null ? ` on your ${c.grind.grinder.name} at ${c.grind.display}` : ''
  const grind =
    c.grind.grinder?.kind === 'preground'
      ? `Measure ${dose} of ground coffee.`
      : `Grind ${dose}${where}: ${def.grindLabel.toLowerCase()}, ${def.grindLike.toLowerCase()}.`
  const tare = kit.scales.includes('timer')
    ? 'Put everything on the scale and tare it. Start your scale timer when BrewPrint starts.'
    : c.hasScale
      ? 'Put everything on the scale and tare it.'
      : ''

  const specific: Record<BrewerType, string[]> = {
    v60: ['Rinse the paper filter with hot water. This warms the brewer and gets rid of any papery taste. Pour away the rinse water.', 'Add the coffee and shake it level. Poke a small well in the middle.'],
    chemex: ['Open the filter with the thick, triple-layer side against the spout. Rinse it well with hot water and pour the rinse water away.', 'Add the coffee and shake it level.'],
    aeropress: ['Put a paper filter in the cap, rinse it, then twist it on. Stand the AeroPress on a sturdy mug.', 'Add the coffee.'],
    frenchpress: ['Warm the press with a splash of hot water, then tip it out.', 'Add the coffee.'],
    moka: [
      `Fill the base with hot water to just below the safety valve (about ${c.water} ml).`,
      "Fill the basket to the top with coffee and level it with a finger. Don't press it down. Wipe the rim clean.",
      'Screw the top on using a tea towel, because the base is hot.',
    ],
    coldbrew: ['Put the ground coffee into the mesh filter and fit the filter into the jug.'],
    drip: [
      "Put a paper filter in the basket (fold the seams first if it's a cone filter). If yours has a permanent mesh filter, just make sure it's clean.",
      'Add the coffee and give the basket a gentle shake to level it, so the water runs through evenly.',
      'Put the empty carafe on the hotplate, lid on.',
    ],
  }
  return [heat, grind, ...specific[def.type], tare].filter(Boolean)
}

const STEPS: Record<BrewerType, (c: Ctx) => Step[]> = {
  drip: (c) => [
    {
      title: 'Switch it on',
      why: 'The machine heats the water and showers it over the coffee for you.',
      body: `Press start${c.water <= 500 && c.def.sizes.some((s) => s.maxWater > 1000) ? '. For a small pot, use the 1–4 cup setting if your machine has one' : ''}. It's done when the dripping slows to the odd drop.`,
      // Roughly how long a typical 1,000 W machine takes for this much water.
      seconds: Math.round(90 + c.water * 0.3),
      aside: 'Kettle gets the day off.',
    },
    {
      title: 'Swirl & serve',
      why: 'The first and last drips come out at different strengths. A swirl evens them out.',
      body: `Give the carafe a gentle swirl and pour${c.people > 1 ? ` ${c.people} cups` : ''}. Don't leave it on the hotplate for more than about 20 minutes, because it stews and turns bitter. Keep any extra in a flask.`,
    },
  ],
  v60: (c) => {
    const bloom = round5(c.coffee * 3)
    return [
      {
        title: 'Let it bloom',
        why: 'This lets out CO₂, which gives a sweeter, more balanced cup.',
        body: `Pour gently ${upTo(c, bloom)}. Wet all the grounds, then give it a gentle swirl.`,
        seconds: c.fresh ? 60 : 45,
        target: bloom,
        aside: 'Good coffee takes a little patience.',
      },
      {
        title: 'First pour',
        body: `${pourStyle(c)} ${upTo(c, round5(c.water * 0.6))}.`,
        seconds: 30,
        target: round5(c.water * 0.6),
      },
      {
        title: 'Final pour',
        body: `Keep going, a little slower, ${upTo(c, c.water)}.`,
        seconds: 30,
        target: c.water,
      },
      {
        title: 'Swirl & drawdown',
        why: 'The swirl flattens the coffee bed so the water drains through evenly.',
        body: 'Give the V60 one gentle swirl, then let it drain. It should finish around 3:00–3:30.',
        seconds: Math.round(60 + c.water * 0.12),
        aside: 'Almost there…',
      },
    ]
  },
  chemex: (c) => {
    const bloom = Math.min(round5(c.coffee * 3), round5(c.water * 0.25))
    return [
      {
        title: 'Let it bloom',
        why: 'This lets out CO₂, so the rest of the water can extract evenly.',
        body: `Pour gently ${upTo(c, bloom)}, just enough to wet everything.`,
        seconds: c.fresh ? 60 : 45,
        target: bloom,
        aside: 'Watch it puff up.',
      },
      {
        title: 'First pour',
        body: `${pourStyle(c)} ${upTo(c, round5(c.water * 0.5))}.`,
        seconds: 45,
        target: round5(c.water * 0.5),
      },
      {
        title: 'Second pour',
        body: `Keep the water level steady and pour ${upTo(c, c.water)}.`,
        seconds: 60,
        target: c.water,
      },
      {
        title: 'Drawdown',
        why: "The thick filter is slow, and that's what makes it so clean.",
        body: "Let it drain. It should be done around 4:00–5:00. If it's much slower, grind coarser next time.",
        seconds: Math.round(90 + c.water * 0.1),
      },
    ]
  },
  aeropress: (c) => {
    const steps: Step[] = [
      {
        title: 'Add the water',
        body: `Pour all the water in ${c.hasScale ? `until the scale reads ${g(c.water)}` : `(about ${c.water} ml)`}. Make sure every ground gets wet.`,
        seconds: 15,
        target: c.water,
      },
      {
        title: 'Seal & steep',
        why: 'The seal stops it dripping through, so every drop steeps for the same time.',
        body: 'Put the plunger in about 1 cm to make a seal. Then leave it alone.',
        seconds: 120,
        aside: 'Hands off!',
      },
      {
        title: 'Swirl',
        body: 'Pick up the whole AeroPress, give it a gentle swirl and let the grounds settle.',
        seconds: 30,
      },
      {
        title: 'Press',
        body: 'Press down slowly and evenly. Stop when you hear a hiss.',
        seconds: 30,
      },
    ]
    if (c.bypass) {
      steps.push({
        title: 'Top up & share',
        why: 'You brewed a concentrate. Hot water turns it into full-size cups.',
        body: `Add ${c.bypass} ml of hot water and split between ${c.people} cups.`,
      })
    }
    return steps
  },
  frenchpress: (c) => [
    {
      title: 'Pour',
      body: `Pour all the water in quickly ${c.hasScale ? `until the scale reads ${g(c.water)}` : `(about ${c.water} ml)`} so every ground gets soaked.`,
      seconds: 20,
      target: c.water,
    },
    {
      title: 'Steep',
      why: 'A crust forms on top while the coffee extracts underneath.',
      body: "Leave it alone. No lid, and don't stir.",
      seconds: 240,
      aside: 'Kettle back on for a second cup?',
    },
    {
      title: 'Break the crust',
      body: 'Stir the crust gently with a spoon. Then scoop off the foam and any floating bits.',
      seconds: 30,
    },
    {
      title: 'Let it settle',
      why: 'Giving the grounds time to sink is the secret to a clean, silt-free press.',
      body: 'Put the lid on with the plunger up and wait. Waiting longer gives a cleaner cup.',
      seconds: 300,
      aside: 'Good things take time.',
    },
    {
      title: 'Plunge & pour',
      body: "Push the plunger just down to the surface, not all the way. Pour slowly, and pour all of it out so it doesn't turn bitter.",
    },
  ],
  moka: (c) => [
    {
      title: 'On the heat',
      body: 'Put it on medium-low heat with the lid open. Tap Next when coffee starts to flow, usually after 1–3 minutes.',
      aside: 'Low and slow.',
    },
    {
      title: 'Watch the flow',
      why: 'A slow, steady stream means an even extraction.',
      body: 'You want a slow stream the colour of honey. If it spits and splutters, turn the heat down.',
    },
    {
      title: 'Stop it early',
      why: 'The last bit to come through is harsh and bitter.',
      body: 'As soon as the stream turns pale and starts to gurgle, take it off the heat. Cool the base under a cold tap.',
    },
    {
      title: 'Stir & serve',
      body: `Stir the coffee in the top before pouring. ${c.people > 1 ? `Split it between ${c.people} cups.` : 'Enjoy.'}`,
    },
  ],
  coldbrew: (c) => [
    {
      title: 'Slow pour',
      body: `Pour cold water slowly over the grounds in circles ${upTo(c, c.water)}.`,
      seconds: 60,
      target: c.water,
    },
    {
      title: 'Stir gently',
      body: 'Stir gently with a long spoon so there are no dry pockets.',
      seconds: 20,
    },
    {
      title: 'Into the fridge',
      why: 'Cold water extracts slowly, which is where the smoothness comes from.',
      body: `Put the lid on and pop it in the fridge. It's ready from ${clock(8)}, and at its best by ${clock(12)}.`,
      aside: 'See you tomorrow.',
    },
    {
      title: 'Lift & enjoy',
      body: 'Lift the filter out and let it drain. It keeps for about a week in the fridge.',
    },
  ],
}

function clock(hoursFromNow: number) {
  const d = new Date(Date.now() + hoursFromNow * 3600_000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function totalSeconds(steps: Step[]) {
  return steps.reduce((t, s) => t + (s.seconds ?? 0), 0)
}
