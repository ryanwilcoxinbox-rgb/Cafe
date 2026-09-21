import { describe, expect, it } from 'vitest'
import type { Kit } from '../data/types'
import { beansInTbsp, buildRecipe, interpolate } from './recipe'

const kit: Kit = {
  brewers: [
    { uid: 'a', type: 'v60', sizeId: '02' },
    { uid: 'b', type: 'aeropress', sizeId: 'std' },
    { uid: 'c', type: 'moka', sizeId: '3' },
    { uid: 'd', type: 'frenchpress', sizeId: '450' },
    { uid: 'e', type: 'frenchpress', sizeId: '1000' },
    { uid: 'f', type: 'chemex', sizeId: '6' },
    { uid: 'g', type: 'coldbrew', sizeId: '1000' },
  ],
  grinders: ['k6', 'wancle'],
  scales: ['micro', 'timer'],
  kettle: { gooseneck: true, tempControl: false },
  cupSize: 250,
}

describe('interpolate', () => {
  it('interpolates and clamps', () => {
    const pts: [number, number][] = [[0, 0], [10, 100]]
    expect(interpolate(pts, 5)).toBe(50)
    expect(interpolate(pts, -5)).toBe(0)
    expect(interpolate(pts, 50)).toBe(100)
  })
})

describe('V60', () => {
  it('scales one cup at 1:16', () => {
    const r = buildRecipe({ type: 'v60', kit, people: 1, strength: 'balanced' })
    expect(r.water).toBe(250)
    expect(r.coffee).toBe(15.6)
    expect(r.rounds).toBe(1)
    expect(r.grind.grinder?.id).toBe('k6')
    expect(r.grind.setting).toBe(88)
    expect(r.steps[0].target).toBe(45)
    expect(r.steps.at(-2)?.target).toBe(250)
  })

  it('splits into rounds past the dripper capacity', () => {
    const r = buildRecipe({ type: 'v60', kit, people: 3, strength: 'balanced' })
    expect(r.rounds).toBe(2)
    expect(r.water).toBe(375)
  })

  it('applies strength and learned dial-in', () => {
    const r = buildRecipe({ type: 'v60', kit, people: 1, strength: 'stronger', dialIn: { 'v60:k6': -4 } })
    expect(r.ratio).toBe(14.5)
    expect(r.grind.setting).toBe(84)
  })
})

describe('French press', () => {
  it('picks the smallest press that fits', () => {
    expect(buildRecipe({ type: 'frenchpress', kit, people: 1, strength: 'balanced' }).size.id).toBe('450')
    expect(buildRecipe({ type: 'frenchpress', kit, people: 3, strength: 'balanced' }).size.id).toBe('1000')
  })

  it('switches to the electric grinder for big doses', () => {
    const r = buildRecipe({ type: 'frenchpress', kit, people: 3, strength: 'balanced' })
    expect(r.coffee).toBeGreaterThan(30)
    expect(r.grind.grinder?.id).toBe('wancle')
  })
})

describe('AeroPress', () => {
  it('brews a concentrate and bypass for two', () => {
    const r = buildRecipe({ type: 'aeropress', kit, people: 2, strength: 'balanced' })
    expect(r.rounds).toBe(1)
    expect(r.water).toBe(200)
    expect(r.bypass).toBe(300)
    expect(r.steps.at(-1)?.title).toMatch(/Top up/)
  })

  it('needs a second press for three', () => {
    expect(buildRecipe({ type: 'aeropress', kit, people: 3, strength: 'balanced' }).rounds).toBe(2)
  })
})

describe('Moka', () => {
  it('uses the fixed basket dose', () => {
    const r = buildRecipe({ type: 'moka', kit, people: 2, strength: 'balanced' })
    expect(r.coffee).toBe(16)
    expect(r.water).toBe(150)
    expect(r.rounds).toBe(1)
    expect(buildRecipe({ type: 'moka', kit, people: 3, strength: 'balanced' }).rounds).toBe(2)
  })
})

describe('Cold brew', () => {
  it('fills the Hario 1 L at 1:12.5', () => {
    const r = buildRecipe({ type: 'coldbrew', kit, people: 5, strength: 'balanced' })
    expect(r.water).toBe(1000)
    expect(r.coffee).toBe(80)
    expect(r.grind.grinder?.id).toBe('wancle')
  })
})

describe('no scale', () => {
  it('talks in tablespoons and ml', () => {
    const r = buildRecipe({ type: 'v60', kit: { ...kit, scales: [] }, people: 1, strength: 'balanced' })
    expect(r.prep.join(' ')).toMatch(/tbsp/)
    expect(r.steps[0].body).toMatch(/ml/)
    expect(beansInTbsp(15)).toBe('2½ tbsp')
    expect(beansInTbsp(2)).toBe('½ tbsp')
  })
})

describe('beans', () => {
  const now = Date.parse('2026-09-18T12:00:00')
  const light = { id: 'b1', roast: 'light' as const, roastedOn: '2026-09-16' }

  it('runs light roasts hotter and extends the bloom for fresh beans', () => {
    const r = buildRecipe({ type: 'v60', kit, people: 1, strength: 'balanced', bean: light, now })
    expect(r.tempC).toBe(96)
    expect(r.steps[0].seconds).toBe(60)
    expect(r.beanNotes.join(' ')).toMatch(/very fresh/)
  })

  it('cools the water and warns for dark roasts in a V60', () => {
    const r = buildRecipe({ type: 'v60', kit, people: 1, strength: 'balanced', bean: { id: 'b2', roast: 'dark' }, now })
    expect(r.tempC).toBe(91)
    expect(r.beanNotes[0]).toMatch(/harsh/)
  })

  it('prefers the bean dial-in, falling back to the brewer one', () => {
    const dialIn = { 'v60:k6': 2, 'v60:k6:b1': -6 }
    expect(buildRecipe({ type: 'v60', kit, people: 1, strength: 'balanced', dialIn, bean: light, now }).grind.setting).toBe(82)
    expect(buildRecipe({ type: 'v60', kit, people: 1, strength: 'balanced', dialIn, bean: { id: 'new', roast: 'medium' }, now }).grind.setting).toBe(90)
  })
})

describe('fine-tune', () => {
  it('uses a custom ratio and temperature', () => {
    const r = buildRecipe({ type: 'v60', kit, people: 1, strength: 'stronger', custom: { ratio: 17, tempC: 90 } })
    expect(r.baseRatio).toBe(17)
    expect(r.ratio).toBe(15.5)
    expect(r.tempC).toBe(90)
    expect(r.prep[0]).toMatch(/90°C/)
  })
})

describe('Filter machine', () => {
  const drip: Kit = { ...kit, brewers: [{ uid: 'm', type: 'drip', sizeId: '10' }] }

  it('scales a pot for four at 1:16.5, with the machine heating the water', () => {
    const r = buildRecipe({ type: 'drip', kit: drip, people: 4, strength: 'balanced' })
    expect(r.water).toBe(1000)
    expect(r.coffee).toBe(60.6)
    expect(r.tempC).toBeNull()
    expect(r.temp.value).toBe('Machine')
    expect(r.prep[0]).toMatch(/Fill the tank with 1000 ml/)
    expect(r.grind.grinder?.id).toBe('wancle')
    expect(r.steps[0].seconds).toBe(390)
  })

  it('tops up small pots to the minimum and suggests the 1–4 cup setting', () => {
    const r = buildRecipe({ type: 'drip', kit: drip, people: 1, strength: 'balanced' })
    expect(r.water).toBe(400)
    expect(r.notes.join(' ')).toMatch(/at least 400 g/)
    expect(r.steps[0].body).toMatch(/1–4 cup setting/)
  })

  it('splits a big crowd into two pots', () => {
    const r = buildRecipe({ type: 'drip', kit: drip, people: 8, strength: 'balanced' })
    expect(r.rounds).toBe(2)
    expect(r.notes[0]).toMatch(/10-cup filter machine/)
  })
})
