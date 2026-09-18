import type { BrewerDef, BrewerSize, BrewerType } from './types'

export const BREWERS: Record<BrewerType, BrewerDef> = {
  v60: {
    type: 'v60',
    name: 'V60',
    tagline: 'Clean, bright and expressive.',
    scaling: 'ratio',
    sizes: [
      { id: '01', label: 'Size 01', maxWater: 300, minWater: 200 },
      { id: '02', label: 'Size 02', maxWater: 500, minWater: 200 },
      { id: '03', label: 'Size 03', maxWater: 750, minWater: 300 },
    ],
    defaultSizeId: '02',
    ratio: 16,
    tempC: 94,
    coarseness: 50,
    grindLabel: 'Medium-fine',
    grindLike: 'Like table salt',
    totalTime: '3–3½ min',
    beans: {
      roast: 'Light to medium roast',
      origins: 'Washed Ethiopia, Kenya or Colombia',
      why: 'A V60 is clear and clean, so fruity, floral coffees really come through.',
    },
  },
  aeropress: {
    type: 'aeropress',
    name: 'AeroPress',
    tagline: 'Smooth, balanced and versatile.',
    scaling: 'aeropress',
    sizes: [
      { id: 'std', label: 'Original', maxWater: 250 },
      { id: 'xl', label: 'XL', maxWater: 500 },
    ],
    defaultSizeId: 'std',
    ratio: 15,
    tempC: 92,
    coarseness: 40,
    grindLabel: 'Medium-fine',
    grindLike: 'A touch finer than table salt',
    totalTime: '3 min',
    beans: {
      roast: 'Medium roast',
      origins: 'Colombia, Guatemala or a natural Ethiopia',
      why: 'An AeroPress forgives a lot. Medium roasts come out sweet and round.',
    },
  },
  moka: {
    type: 'moka',
    name: 'Moka pot',
    tagline: 'Bold, rich and stovetop-strong.',
    scaling: 'moka',
    sizes: [
      { id: '1', label: '1-cup', maxWater: 60, fixedCoffee: 7, serves: 1 },
      { id: '2', label: '2-cup', maxWater: 100, fixedCoffee: 11, serves: 1 },
      { id: '3', label: '3-cup', maxWater: 150, fixedCoffee: 16, serves: 2 },
      { id: '6', label: '6-cup', maxWater: 300, fixedCoffee: 28, serves: 4 },
      { id: '9', label: '9-cup', maxWater: 450, fixedCoffee: 42, serves: 6 },
      { id: '12', label: '12-cup', maxWater: 600, fixedCoffee: 55, serves: 8 },
    ],
    defaultSizeId: '3',
    ratio: 9.5,
    tempC: 100,
    coarseness: 25,
    grindLabel: 'Fine',
    grindLike: 'Like fine sand, just coarser than espresso',
    totalTime: '5 min',
    beans: {
      roast: 'Medium-dark roast',
      origins: 'Brazil, Sumatra or an Italian-style espresso blend',
      why: 'A moka pot is intense, and chocolatey, nutty coffees handle that without turning sharp.',
    },
  },
  frenchpress: {
    type: 'frenchpress',
    name: 'French press',
    tagline: 'Rich, full-bodied and classic.',
    scaling: 'ratio',
    sizes: [
      { id: '350', label: '35 cl', maxWater: 320, minWater: 200 },
      { id: '450', label: '45 cl', maxWater: 400, minWater: 200 },
      { id: '600', label: '60 cl', maxWater: 540, minWater: 250 },
      { id: '800', label: '80 cl', maxWater: 720, minWater: 300 },
      { id: '1000', label: '1 L', maxWater: 900, minWater: 350 },
      { id: '1500', label: '1.5 L', maxWater: 1350, minWater: 500 },
    ],
    defaultSizeId: '1000',
    ratio: 16,
    tempC: 96,
    coarseness: 75,
    grindLabel: 'Medium-coarse',
    grindLike: 'Like rough sea salt',
    totalTime: '9–12 min (mostly waiting)',
    beans: {
      roast: 'Medium to medium-dark roast',
      origins: 'Brazil, Guatemala or Sumatra',
      why: 'A press keeps the oils in, so heavier chocolatey coffees taste lush.',
    },
  },
  chemex: {
    type: 'chemex',
    name: 'Chemex',
    tagline: 'Silky, sweet and crystal clear.',
    scaling: 'ratio',
    sizes: [
      { id: '3', label: '3-cup', maxWater: 450, minWater: 250 },
      { id: '6', label: '6-cup classic', maxWater: 800, minWater: 300 },
      { id: '8', label: '8-cup', maxWater: 1000, minWater: 400 },
      { id: '10', label: '10-cup', maxWater: 1300, minWater: 500 },
    ],
    defaultSizeId: '6',
    ratio: 16,
    tempC: 94,
    coarseness: 60,
    grindLabel: 'Medium',
    grindLike: 'Like coarse sand',
    totalTime: '4–5 min',
    beans: {
      roast: 'Light to medium roast',
      origins: 'Washed Central America or Ethiopia',
      why: 'The thick filter makes a very clean cup, which suits delicate, sweet coffees.',
    },
  },
  coldbrew: {
    type: 'coldbrew',
    name: 'Cold brew',
    tagline: 'Smooth, sweet and low in acid.',
    scaling: 'coldbrew',
    sizes: [
      { id: '600', label: 'Hario 600 ml', maxWater: 600, minWater: 300 },
      { id: '1000', label: 'Hario 1 L', maxWater: 1000, minWater: 400 },
    ],
    defaultSizeId: '1000',
    ratio: 12.5,
    tempC: 'cold',
    coarseness: 82,
    grindLabel: 'Coarse',
    grindLike: 'Like raw cane sugar',
    totalTime: '8–12 hours in the fridge',
    beans: {
      roast: 'Medium to medium-dark roast',
      origins: 'Brazil or Colombia (a natural Ethiopia for a berry twist)',
      why: 'Cold water brings out chocolate and caramel. Very light roasts can taste flat.',
    },
  },
}

export const BREWER_ORDER: BrewerType[] = ['v60', 'aeropress', 'chemex', 'frenchpress', 'moka', 'coldbrew']

/** Friendly name for a specific brewer: "V60 02", "45 cl French press", "AeroPress XL". */
export function brewerName(type: BrewerType, size: BrewerSize) {
  const def = BREWERS[type]
  if (type === 'v60') return `V60 ${size.id}`
  if (type === 'aeropress') return size.id === 'std' ? 'AeroPress' : 'AeroPress XL'
  if (type === 'coldbrew') return `${size.label} cold brew jug`
  if (type === 'chemex') return `${size.label} Chemex`
  return `${size.label} ${def.name.toLowerCase()}`
}

export function sizeOf(type: BrewerType, sizeId: string) {
  const def = BREWERS[type]
  return def.sizes.find((s) => s.id === sizeId) ?? def.sizes.find((s) => s.id === def.defaultSizeId)!
}
