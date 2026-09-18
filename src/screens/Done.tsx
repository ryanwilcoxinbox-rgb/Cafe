import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CupArt } from '../components/Art'
import { Button, Chip, Hand, Screen, StepHeader } from '../components/ui'
import type { BrewerType, Kit } from '../data/types'
import { advise } from '../lib/dialin'
import { dialKey } from '../lib/recipe'
import { go } from '../lib/router'
import { lastBrew } from '../lib/stopwatch'
import { setState, uid, type Body, type Taste } from '../lib/store'
import { useRecipe } from '../lib/useRecipe'

export function Done({ type, kit }: { type: BrewerType; kit: Kit }) {
  const { recipe: r, prefs } = useRecipe(type, kit)
  const [taste, setTaste] = useState<Taste | null>(null)
  const [body, setBody] = useState<Body>('good')
  const [beans, setBeans] = useState('')
  const [remember, setRemember] = useState(true)
  const advice = taste ? advise(r, taste, body) : null

  const save = () => {
    if (!taste || !advice) return
    setState((s) => {
      const next = { ...s }
      next.journal = [
        {
          id: uid(),
          at: Date.now(),
          type,
          people: r.people,
          strength: r.strength,
          coffee: r.coffee,
          water: r.water + r.bypass,
          grind: r.grind.display,
          grinderId: r.grind.grinder?.id,
          seconds: lastBrew.seconds,
          taste,
          body,
          beans: beans.trim() || undefined,
        },
        ...s.journal,
      ]
      if (remember) {
        const g = r.grind.grinder
        if (g && advice.grindDelta) {
          const key = dialKey(type, g.id)
          next.dialIn = { ...s.dialIn, [key]: (s.dialIn[key] ?? 0) + advice.grindDelta }
        }
        next.prefs = { ...s.prefs, [type]: { ...prefs, strength: advice.strength } }
      }
      return next
    })
    go('journal', true)
  }

  return (
    <Screen
      header={<StepHeader step={4} label="Brew" />}
      cta={
        <Button className="w-full" arrow disabled={!taste} onClick={save}>
          Save this brew
        </Button>
      }
      footer={['A small ritual', 'a brighter you']}
    >
      <h1 className="mt-4 font-serif text-[40px] leading-[1.05]">Enjoy your coffee.</h1>
      <p className="mt-2 text-[17px] text-muted">A small ritual, made yours.</p>

      <div className="relative my-4 flex justify-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
          <CupArt className="h-48 w-48" />
        </motion.div>
        <Hand className="absolute top-6 right-0 w-24 rotate-6 text-center">
          Good coffee,
          <br />
          brighter days
        </Hand>
      </div>

      <h2 className="font-serif text-2xl">How did it taste?</h2>
      <div className="mt-3 grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Taste">
        <TasteButton on={taste === 'sour'} onClick={() => setTaste('sour')} label="Too sour" face={<SourFace />} />
        <TasteButton on={taste === 'right'} onClick={() => setTaste('right')} label="Just right" face={<HappyFace />} />
        <TasteButton on={taste === 'bitter'} onClick={() => setTaste('bitter')} label="Too bitter" face={<BitterFace />} />
      </div>

      <AnimatePresence>
        {advice && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            <div className="mt-4 rounded-2xl bg-accent-soft p-4">
              <p className="font-medium">{advice.headline}</p>
              <p className="mt-1 text-[15px] leading-snug">{advice.detail}</p>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                Remember this for next time
              </label>
            </div>

            <p className="mt-5 mb-2 text-sm text-muted">Strength</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['weak', 'Too weak'],
                  ['good', 'Spot on'],
                  ['strong', 'Too strong'],
                ] as const
              ).map(([v, label]) => (
                <Chip key={v} active={body === v} onClick={() => setBody(v)}>
                  {label}
                </Chip>
              ))}
            </div>

            <label className="mt-5 block text-sm text-muted" htmlFor="beans">
              Which beans? <span className="opacity-70">(optional)</span>
            </label>
            <input
              id="beans"
              value={beans}
              onChange={(e) => setBeans(e.target.value)}
              placeholder="e.g. Ethiopia Guji, Square Mile"
              className="mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 text-[16px] placeholder:text-muted/60"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  )
}

function TasteButton({ on, onClick, label, face }: { on: boolean; onClick: () => void; label: string; face: ReactNode }) {
  return (
    <motion.button
      role="radio"
      aria-checked={on}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-2xl border py-4 text-sm transition-colors ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-card'}`}
    >
      {face}
      <span className={on ? 'font-medium' : ''}>{label}</span>
    </motion.button>
  )
}

const Face = ({ children }: { children: ReactNode }) => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <circle cx="15" cy="15" r="12.5" />
    <circle cx="10.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="19.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    {children}
  </svg>
)
const SourFace = () => (
  <Face>
    <path d="M9.5 20.5c1.2-1.2 2.4-1.2 3.6 0s2.4 1.2 3.6 0 2.4-1.2 3.6 0" />
  </Face>
)
const HappyFace = () => (
  <Face>
    <path d="M9.5 18c3 3.5 8 3.5 11 0" />
  </Face>
)
const BitterFace = () => (
  <Face>
    <path d="M10 21c3-3 7-3 10 0" />
  </Face>
)
