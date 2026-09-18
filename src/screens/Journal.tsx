import { motion } from 'motion/react'
import { BrewerArt } from '../components/Art'
import { Button, Chevron, Hand, Screen } from '../components/ui'
import { BREWERS } from '../data/brewers'
import { mmss } from '../lib/device'
import { go } from '../lib/router'
import { setState, useStore } from '../lib/store'

const TASTE = {
  sour: { label: 'Too sour', cls: 'bg-sunk text-ink' },
  right: { label: 'Just right', cls: 'bg-accent-soft text-accent' },
  bitter: { label: 'Too bitter', cls: 'bg-sunk text-ink' },
}

export function Journal() {
  const journal = useStore((s) => s.journal)
  const remove = (id: string) => setState((s) => ({ ...s, journal: s.journal.filter((j) => j.id !== id) }))

  return (
    <Screen
      header={
        <>
          <button onClick={() => go('', true)} className="-ml-2 flex items-center gap-1 rounded-full py-1 pr-2 pl-1 text-sm" aria-label="Back to home">
            <Chevron dir="left" /> Home
          </button>
          <span className="h-px w-8 bg-muted/50" />
          <span className="tabular ml-auto text-sm text-muted">
            {journal.length} {journal.length === 1 ? 'brew' : 'brews'}
          </span>
        </>
      }
      cta={
        <Button className="w-full" arrow onClick={() => go('', true)}>
          Brew another
        </Button>
      }
      footer={['Same beans', 'brighter days']}
    >
      <h1 className="mt-4 font-serif text-[40px] leading-[1.05]">Your brew journal</h1>
      <p className="mt-2 text-[17px] text-muted">Every cup teaches your recipe something.</p>

      {journal.length === 0 && <Hand className="mt-10 text-center">Nothing here yet. Your first brew is waiting.</Hand>}

      <ul className="mt-6 space-y-3">
        {journal.map((j, i) => (
          <motion.li
            key={j.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 8) * 0.04 }}
            className="flex gap-3 rounded-2xl border border-line bg-card p-3"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-sunk/60">
              <BrewerArt type={j.type} className="h-14 w-14" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-serif text-xl">{BREWERS[j.type].name}</p>
                <time className="shrink-0 text-xs text-muted" dateTime={new Date(j.at).toISOString()}>
                  {new Date(j.at).toLocaleDateString([], { day: 'numeric', month: 'short' })},{' '}
                  {new Date(j.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
              <p className="tabular text-sm text-muted">
                {j.coffee} g · {j.water} g · {j.grind}
                {j.seconds > 0 && ` · ${mmss(j.seconds)}`}
              </p>
              {j.beans && <p className="mt-0.5 truncate text-sm">{j.beans}</p>}
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TASTE[j.taste].cls}`}>{TASTE[j.taste].label}</span>
                <span className="text-xs text-muted">
                  {j.people} {j.people === 1 ? 'cup' : 'cups'} · {j.strength}
                </span>
                <button onClick={() => remove(j.id)} className="ml-auto text-xs text-muted underline-offset-2 hover:underline" aria-label="Delete this brew">
                  Delete
                </button>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
    </Screen>
  )
}
