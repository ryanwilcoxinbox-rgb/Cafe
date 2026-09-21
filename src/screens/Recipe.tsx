import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BrewerArt } from '../components/Art'
import { Button, Chevron, Chip, Hand, NumberStepper, Screen, Segmented, Sheet, StepHeader, Stepper } from '../components/ui'
import { brewerName } from '../data/brewers'
import { grinderById } from '../data/grinders'
import type { BrewerType, Kit, Strength } from '../data/types'
import { beansInTbsp, COLD_BREW_GLASS, dialKey, dialOffset, totalSeconds } from '../lib/recipe'
import { go } from '../lib/router'
import { setState, useStore, type BrewPrefs } from '../lib/store'
import { useRecipe } from '../lib/useRecipe'
import { mmss } from '../lib/device'
import { beanAge, ROAST_LABEL, RoastDot } from './Beans'

export function Recipe({ type, kit }: { type: BrewerType; kit: Kit }) {
  const [draft, setDraft] = useState<Partial<BrewPrefs>>({})
  const { recipe: r, prefs, bean } = useRecipe(type, kit, draft)
  const dialIn = useStore((s) => s.dialIn)
  const beans = useStore((s) => s.beans)
  const [picking, setPicking] = useState(false)
  const [tuning, setTuning] = useState(prefs.ratio !== undefined || prefs.tempC !== undefined)
  const def = r.brewer
  const precise = kit.scales.includes('micro')
  const hasScale = kit.scales.length > 0
  const grinderId = r.grind.grinder?.id
  const offset = grinderId ? dialOffset(dialIn, type, grinderId, bean?.id) : 0
  const beanSpecific = !!(grinderId && bean && dialKey(type, grinderId, bean.id) in dialIn)
  const ownedGrinders = kit.grinders.map(grinderById).filter((g) => !!g)
  const update = (p: Partial<BrewPrefs>) => setDraft((d) => ({ ...d, ...p }))

  const start = () => {
    setState((s) => ({ ...s, prefs: { ...s.prefs, [type]: prefs } }))
    go(`brew/${type}`)
  }

  const pickBean = (id: string | undefined) => {
    setState((s) => ({ ...s, activeBeanId: id }))
    setPicking(false)
  }

  const resetDial = () =>
    setState((s) => {
      const next = { ...s.dialIn }
      delete next[dialKey(type, grinderId!, beanSpecific ? bean!.id : undefined)]
      return { ...s, dialIn: next }
    })

  const custom = prefs.ratio !== undefined || prefs.tempC !== undefined
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

      <button
        onClick={() => (beans.some((b) => !b.finished) ? setPicking(true) : go('beans/new'))}
        className={`mb-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${bean ? 'border-line bg-card' : 'border-dashed border-muted/40'}`}
      >
        {bean ? <RoastDot roast={bean.roast} /> : <span className="flex h-7 w-7 items-center justify-center text-xl text-muted">+</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{bean ? bean.name : 'Which beans?'}</span>
          <span className="block truncate text-sm text-muted">
            {bean ? [ROAST_LABEL[bean.roast], beanAge(bean)].filter(Boolean).join(' · ') : 'Add your bag and the recipe adapts to it'}
          </span>
        </span>
        <span className="text-sm text-accent">{bean ? 'Change' : 'Add'}</span>
      </button>

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

      {r.beanNotes.length > 0 && (
        <div className="mt-4 space-y-1.5 rounded-2xl border border-line bg-sunk/50 px-4 py-3 text-[15px]">
          {r.beanNotes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
      )}

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
                  Dialled in{beanSpecific ? ' for this bag' : ''}: {offset > 0 ? '+' : ''}
                  {offset}
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

      {def.scaling !== 'moka' && (
        <div className="mt-4">
          <button onClick={() => setTuning(!tuning)} className="flex w-full items-center justify-between py-2 text-left" aria-expanded={tuning}>
            <span>
              <span className="font-medium">Fine-tune</span>
              <span className="ml-2 text-sm text-muted">{custom ? 'your recipe' : r.tempC !== null ? 'ratio & temperature' : 'ratio'}</span>
            </span>
            <span className={`text-muted transition-transform ${tuning ? 'rotate-90' : ''}`}>
              <Chevron />
            </span>
          </button>
          <AnimatePresence initial={false}>
            {tuning && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-3 pt-2 pb-1">
                  <NumberStepper
                    label="Ratio"
                    value={r.baseRatio}
                    step={0.5}
                    min={isCold ? 6 : 10}
                    max={isCold ? 18 : 20}
                    format={(v) => `1:${v}`}
                    onChange={(ratio) => update({ ratio })}
                  />
                  {r.tempC !== null && (
                    <NumberStepper label="Water" value={r.tempC} step={1} min={80} max={100} format={(v) => `${v}°C`} onChange={(tempC) => update({ tempC })} />
                  )}
                  <p className="text-sm text-muted">
                    {prefs.strength === 'balanced'
                      ? 'A lower ratio makes stronger coffee.'
                      : `${prefs.strength === 'stronger' ? 'Stronger' : 'Lighter'} brews at 1:${r.ratio}.`}
                    {custom && (
                      <button onClick={() => update({ ratio: undefined, tempC: undefined })} className="ml-2 underline underline-offset-2">
                        Reset to BrewPrint's recipe
                      </button>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

      <Sheet open={picking} onClose={() => setPicking(false)} title="Brewing with">
        <div className="space-y-2">
          {beans
            .filter((b) => !b.finished)
            .map((b) => (
              <button
                key={b.id}
                onClick={() => pickBean(b.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left ${b.id === bean?.id ? 'border-accent bg-accent-soft/70' : 'border-line'}`}
              >
                <RoastDot roast={b.roast} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{b.name}</span>
                  <span className="block truncate text-sm text-muted">{[b.roaster, ROAST_LABEL[b.roast], beanAge(b)].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            ))}
          <button
            onClick={() => pickBean(undefined)}
            className={`w-full rounded-2xl border px-4 py-3 text-left text-muted ${bean ? 'border-line' : 'border-accent bg-accent-soft/70'}`}
          >
            No particular bag
          </button>
        </div>
        <Button variant="soft" className="mt-4 w-full" onClick={() => go('beans/new')}>
          + Add a new bag
        </Button>
      </Sheet>
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
