import { useState } from 'react'
import { motion } from 'motion/react'
import { BrewerArt, Mark } from '../components/Art'
import { Button, Hand, Radio, Screen } from '../components/ui'
import { BREWER_ORDER, BREWERS } from '../data/brewers'
import type { BrewerType, Kit } from '../data/types'
import { go } from '../lib/router'
import { useStore } from '../lib/store'

const TASTE_WORD = { sour: 'a bit sour', right: 'just right', bitter: 'a bit bitter' }

export function Home({ kit }: { kit: Kit }) {
  const journal = useStore((s) => s.journal)
  const types = BREWER_ORDER.filter((t) => kit.brewers.some((b) => b.type === t))
  const last = journal[0]
  const [picked, setPicked] = useState<BrewerType>(last && types.includes(last.type) ? last.type : types[0])

  return (
    <Screen
      header={
        <>
          <Mark className="h-7 w-7" />
          <span className="font-serif text-xl">BrewPrint</span>
          <nav className="ml-auto flex gap-1">
            <IconLink label="Brew journal" onClick={() => go('journal')}>
              <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z M5 17a3 3 0 0 1 3-3h11 M9 8h6" />
            </IconLink>
            <IconLink label="My kit" onClick={() => go('kit')}>
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4" />
            </IconLink>
          </nav>
        </>
      }
      cta={
        <Button className="w-full" arrow onClick={() => go(`recipe/${picked}`)}>
          Choose {BREWERS[picked].name}
        </Button>
      }
    >
      <div className="mt-4 mb-6">
        <h1 className="font-serif text-[44px] leading-[1.02]">
          How are you
          <br />
          brewing?
        </h1>
        <p className="mt-2 text-[17px] text-muted">Choose a method to get started.</p>
      </div>

      <div role="radiogroup" aria-label="Brew method" className="space-y-3">
        {types.map((type, i) => {
          const def = BREWERS[type]
          const on = type === picked
          return (
            <motion.button
              key={type}
              role="radio"
              aria-checked={on}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => setPicked(type)}
              onDoubleClick={() => go(`recipe/${type}`)}
              className={`flex w-full items-center gap-4 rounded-2xl border p-3 pr-5 text-left transition-colors ${on ? 'border-accent bg-accent-soft/70 shadow-sm' : 'border-line bg-card'}`}
            >
              <span className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-xl transition-colors ${on ? 'bg-card/70' : 'bg-sunk/60'}`}>
                <BrewerArt type={type} className="h-20 w-20" />
              </span>
              <span className="flex-1">
                <span className="block font-serif text-2xl">{def.name}</span>
                <span className="text-[15px] leading-snug text-muted">{def.tagline}</span>
              </span>
              <Radio checked={on} />
            </motion.button>
          )
        })}
      </div>

      {last && (
        <Hand className="mt-6 text-center">
          Last time: {BREWERS[last.type].name}, {TASTE_WORD[last.taste]}.
        </Hand>
      )}
    </Screen>
  )
}

function IconLink({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-sunk">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  )
}
