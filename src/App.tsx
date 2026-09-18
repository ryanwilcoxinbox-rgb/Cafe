import { AnimatePresence } from 'motion/react'
import { BREWERS } from './data/brewers'
import type { BrewerType } from './data/types'
import { go, useRoute } from './lib/router'
import { useStore } from './lib/store'
import { Brew } from './screens/Brew'
import { Done } from './screens/Done'
import { Home } from './screens/Home'
import { Journal } from './screens/Journal'
import { KitSetup } from './screens/KitSetup'
import { Recipe } from './screens/Recipe'

export function App() {
  const kit = useStore((s) => s.kit)
  const [page, param] = useRoute()
  const type = param as BrewerType
  const owns = kit && param && param in BREWERS && kit.brewers.some((b) => b.type === type)

  let screen
  if (!kit || page === 'kit') screen = <KitSetup key="kit" />
  else if (page === 'recipe' && owns) screen = <Recipe key={`recipe-${type}`} type={type} kit={kit} />
  else if (page === 'brew' && owns) screen = <Brew key={`brew-${type}`} type={type} kit={kit} />
  else if (page === 'done' && owns) screen = <Done key={`done-${type}`} type={type} kit={kit} />
  else if (page === 'journal') screen = <Journal key="journal" />
  else {
    if (page) queueMicrotask(() => go('', true))
    screen = <Home key="home" kit={kit} />
  }

  return (
    <div className="md:flex md:min-h-dvh md:flex-col md:items-center md:justify-center md:py-10">
      <div className="mb-8 hidden text-center md:block">
        <p className="font-serif text-5xl">A better cup, one step at a time.</p>
        <p className="eyebrow mt-4">Good coffee brightens ordinary days</p>
      </div>
      <div className="min-h-dvh bg-card md:min-h-0 md:w-[420px] md:overflow-hidden md:rounded-[32px] md:border md:border-line md:shadow-[0_30px_80px_-30px_rgba(60,35,20,0.35)]">
        <AnimatePresence mode="wait">{screen}</AnimatePresence>
      </div>
    </div>
  )
}
