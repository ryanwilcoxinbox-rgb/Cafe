import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BrewerArt } from '../components/Art'
import { Button, Chip, Hand, Screen, Segmented, StepHeader, Stepper } from '../components/ui'
import { brewerName } from '../data/brewers'
import { grinderById } from '../data/grinders'
import type { BrewerType, Kit, Strength } from '../data/types'
import { beansInTbsp, COLD_BREW_GLASS, dialKey, totalSeconds } from '../lib/recipe'
import { go } from '../lib/router'
import { setState, useStore, type BrewPrefs } from '../lib/store'
import { useRecipe } from '../lib/useRecipe'
import { mmss } from '../lib/device'

export function Recipe({ type, kit }: { type: BrewerType; kit: Kit }) {
  const [draft, setDraft] = useState<Partial<BrewPrefs>>({})
  const { recipe: r, prefs } = useRecipe(type, kit, draft)
  const dialIn = useStore((s) => s.dialIn)
  const def = r.brewer
  const precise = kit.scales.includes('micro')
  const hasScale = kit.scales.length > 0
  const offset = r.grind.grinder ? dialIn[dialKey(type, r.grind.grinder.id)] ?? 0 : 0
  const ownedGrinders = kit.grinders.map(grinderById).filter((g) => !!g)
  const update = (p: Partial<BrewPrefs>) => setDraft((d) => ({ ...d, ...p }))

  const start = () => {
    setState((s) => ({ ...s, prefs: { ...s.prefs, [type]: prefs } }))
    go(`brew/${type}`)
  }

  const resetDial = () =>
    setState((s) => {
      const next = { ...s.dialIn }
      delete next[dialKey(type, r.grind.grinder!.id)]
      return { ...s, dialIn: next }
    })

  const timed = totalSeconds(r.steps)
  const isCold = type === 'coldbrew'

  return (
    <Screen
      header={<StepHeader step={2} onBack={() => go('', true)} />}
      cta={
        <Button className="w-full" arrow onClick={start}>
          Start brewing
        </Button>
      }
      footer={['Good tools', 'brighter days']}
    >
      <div className="mt-4 mb-6 flex items-start gap-3">
        <div className="flex-1">
          <h1 className="font-serif text-[40px] leading-[1.05]">Make it yours</h1>
          <p className="mt-2 text-[17px] text-muted">
            Built for your {brewerName(type, r.size)}.
          </p>
        </div>
        <BrewerArt type={type} className="-mt-1 h-20 w-20 shrink-0" />
      </div>

      <div className="space-y-3">
        <Stepper
          value={prefs.people}
          onChange={(people) => update({ people })}
          max={isCold ? 10 : 8}
          unit={(n) => (isCold ? (n === 1 ? 'glass' : 'glasses') : n === 1 ? 'person' : 'people')}
        />
        <Segmented<Strength>
          label="Strength"
          value={prefs.strength}
          onChange={(strength) => update({ strength })}
          options={[
            { value: 'lighter', label: 'Lighter' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'stronger', label: 'Stronger' },
          ]}
        />
      </div>

      <AnimatePresence>
        {r.notes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-1.5 rounded-2xl bg-accent-soft px-4 py-3 text-[15px]">
              {r.notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 divide-y divide-line border-y border-line">
        <Row icon={<BeanIcon />} value={`${precise ? r.coffee.toFixed(1) : r.coffee} g`} label="coffee" aside={hasScale ? `About ${beansInTbsp(r.coffee)} of whole beans` : `${beansInTbsp(r.coffee)} of whole beans`} />
        <Row
          icon={<DropIcon />}
          value={`${r.water} ${hasScale ? 'g' : 'ml'}`}
          label={def.type === 'moka' ? 'water, to the valve' : r.bypass ? 'water to brew' : 'water'}
          aside={r.bypass ? `Plus ${r.bypass} ml to top up` : isCold ? 'Cold and filtered' : 'Use filtered water'}
        />
        <Row icon={<ThermoIcon />} value={r.temp.value} label={isCold ? 'water' : 'temperature'} aside={r.temp.hint} />
        <Row
          icon={<GrindIcon />}
          value={r.grind.display}
          label={r.grind.grinder && r.grind.setting !== null ? r.grind.grinder.name.split(' (')[0] : 'grind'}
          aside={r.grind.setting !== null ? `${def.grindLabel}. ${def.grindLike}.` : r.grind.hint}
          extra={
            offset !== 0 && (
              <div className="mt-1 flex items-center gap-2">
                <Hand className="!text-lg">
                  Dialled in: {offset > 0 ? '+' : ''}
                  {offset} from the start
                </Hand>
                <button onClick={resetDial} className="text-xs text-muted underline underline-offset-2">
                  reset
                </button>
              </div>
            )
          }
        />
        <Row icon={<ClockIcon />} value={def.totalTime} label="brew time" aside={timed ? `${mmss(timed).replace(/^0/, '')} of timed steps` : 'Watch it, not the clock'} small />
      </div>

      {ownedGrinders.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">Grinding with</p>
          <div className="flex flex-wrap gap-2">
            {ownedGrinders.map((g) => (
              <Chip key={g.id} active={r.grind.grinder?.id === g.id} onClick={() => update({ grinderId: g.id })}>
                {g.name.split(' (')[0]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {r.servingNote && <p className="mt-4 text-[15px] text-muted">{r.servingNote}</p>}

      <section className="mt-6 rounded-2xl border border-line bg-sunk/50 p-4">
        <p className="eyebrow mb-2">Best beans for this</p>
        <p className="font-serif text-xl">{def.beans.roast}</p>
        <p className="mt-0.5 text-[15px]">{def.beans.origins}</p>
        <p className="mt-2 text-sm text-muted">{def.beans.why}</p>
      </section>

      {isCold && <Hand className="mt-4 text-center">One glass = {COLD_BREW_GLASS} ml over ice.</Hand>}
    </Screen>
  )
}

function Row({ icon, value, label, aside, extra, small }: { icon: ReactNode; value: string; label: string; aside: string; extra?: ReactNode; small?: boolean }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <span className="w-6 shrink-0 text-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <motion.p key={value} initial={{ opacity: 0.3 }} animate={{ opacity: 1 }} className={`tabular font-medium ${small ? 'text-lg' : 'text-[22px]'} leading-tight`}>
          {value}
        </motion.p>
        <p className="text-sm text-muted">{label}</p>
        {extra}
      </div>
      <p className="w-[42%] text-right text-sm leading-snug text-muted">{aside}</p>
    </div>
  )
}

const I = ({ children }: { children: ReactNode }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const BeanIcon = () => (
  <I>
    <ellipse cx="12" cy="12" rx="6.5" ry="9" transform="rotate(35 12 12)" fill="currentColor" stroke="none" />
    <path d="M8.5 17.5c2-3 1-6 3.5-8.5s3-3 3.5-4" stroke="var(--card)" strokeWidth="1.4" />
  </I>
)
const DropIcon = () => (
  <I>
    <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" fill="currentColor" stroke="none" />
  </I>
)
const ThermoIcon = () => (
  <I>
    <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0z" />
    <path d="M12 9v7" />
  </I>
)
const GrindIcon = () => (
  <I>
    {[
      [7, 6], [12, 5], [17, 7], [5, 11], [10, 10], [15, 12], [19, 11], [7, 16], [12, 15], [17, 17], [10, 19], [14, 20],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill="currentColor" stroke="none" />
    ))}
  </I>
)
const ClockIcon = () => (
  <I>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </I>
)
