import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AppVersion } from '../components/AppVersion'
import { BrewerArt, CupArt } from '../components/Art'
import { Button, Chevron, Chip, Hand, Screen, Segmented, StepHeader } from '../components/ui'
import { BREWER_ORDER, BREWERS } from '../data/brewers'
import { GRINDERS } from '../data/grinders'
import type { BrewerType, Kit, ScaleType } from '../data/types'
import { go } from '../lib/router'
import { getState, setState, uid } from '../lib/store'
import { SYNC_ENABLED } from '../lib/sync'

const EMPTY_KIT: Kit = {
  brewers: [],
  grinders: [],
  scales: [],
  kettle: { gooseneck: false, tempControl: false },
  cupSize: 250,
}

const PAGES = ['brewers', 'grinders', 'tools', 'cup'] as const

export function KitSetup() {
  const existing = getState().kit
  const [kit, setKit] = useState<Kit>(existing ?? EMPTY_KIT)
  const [page, setPage] = useState(0)
  const name = PAGES[page]

  const finish = () => {
    setState((s) => ({ ...s, kit }))
    go('', true)
  }
  const next = () => (page < PAGES.length - 1 ? setPage(page + 1) : finish())
  const prev = () => (page > 0 ? setPage(page - 1) : existing ? go('', true) : undefined)

  const canContinue = name !== 'brewers' || kit.brewers.length > 0

  return (
    <Screen
      header={<StepHeader label={existing ? 'My kit' : 'Setup'} step={page + 1} onBack={page > 0 || existing ? prev : undefined} />}
      cta={
        <Button className="w-full" arrow disabled={!canContinue} onClick={next}>
          {page === PAGES.length - 1 ? (existing ? 'Save my kit' : "Let's brew") : 'Continue'}
        </Button>
      }
      footer={['Good tools', 'brighter days']}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={name}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
        >
          {name === 'brewers' && <BrewersPage kit={kit} setKit={setKit} fresh={!existing} />}
          {name === 'grinders' && <GrindersPage kit={kit} setKit={setKit} />}
          {name === 'tools' && <ToolsPage kit={kit} setKit={setKit} />}
          {name === 'cup' && <CupPage kit={kit} setKit={setKit} />}
        </motion.div>
      </AnimatePresence>
    </Screen>
  )
}

interface PageProps {
  kit: Kit
  setKit: (k: Kit) => void
}

function Title({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mt-4 mb-6">
      <h1 className="font-serif text-[40px] leading-[1.05]">{title}</h1>
      <p className="mt-2 text-[17px] text-muted">{sub}</p>
    </div>
  )
}

function BrewersPage({ kit, setKit, fresh }: PageProps & { fresh: boolean }) {
  const owned = (type: BrewerType) => kit.brewers.filter((b) => b.type === type)
  const toggleType = (type: BrewerType) => {
    const has = owned(type).length > 0
    setKit({
      ...kit,
      brewers: has
        ? kit.brewers.filter((b) => b.type !== type)
        : [...kit.brewers, { uid: uid(), type, sizeId: BREWERS[type].defaultSizeId }],
    })
  }
  const toggleSize = (type: BrewerType, sizeId: string) => {
    const match = kit.brewers.find((b) => b.type === type && b.sizeId === sizeId)
    setKit({
      ...kit,
      brewers: match ? kit.brewers.filter((b) => b !== match) : [...kit.brewers, { uid: uid(), type, sizeId }],
    })
  }

  return (
    <>
      <Title title={fresh ? "What's in your kit?" : 'Your brewers'} sub="Tap everything you brew with. Recipes are built around it." />
      {fresh && SYNC_ENABLED && (
        <button
          onClick={() => go('account')}
          className="-mt-2 mb-5 flex w-full items-center gap-3 rounded-2xl bg-sunk/70 px-4 py-3 text-left text-[15px]"
        >
          <span className="flex-1">
            Used BrewPrint before? <span className="font-medium text-accent">Sign in to restore</span> your kit and journal.
          </span>
          <Chevron />
        </button>
      )}
      <div className="space-y-3">
        {BREWER_ORDER.map((type) => {
          const def = BREWERS[type]
          const mine = owned(type)
          const on = mine.length > 0
          return (
            <div key={type} className={`rounded-2xl border transition-colors ${on ? 'border-accent bg-accent-soft/60' : 'border-line bg-card'}`}>
              <button onClick={() => toggleType(type)} className="flex w-full items-center gap-4 p-3 text-left" aria-pressed={on}>
                <BrewerArt type={type} className="h-16 w-16 shrink-0" />
                <span className="flex-1">
                  <span className="block font-serif text-xl">{def.name}</span>
                  <span className="text-sm text-muted">{def.tagline}</span>
                </span>
                <Check on={on} />
              </button>
              {on && def.sizes.length > 1 && (
                <div className="flex flex-wrap gap-2 px-3 pb-3">
                  {def.sizes.map((s) => (
                    <Chip key={s.id} active={mine.some((b) => b.sizeId === s.id)} onClick={() => toggleSize(type, s.id)}>
                      {s.label}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <Hand className="mt-5">Got two sizes? Tap both. We'll pick the right one for the job.</Hand>
      {!fresh && <AppVersion />}
    </>
  )
}

function GrindersPage({ kit, setKit }: PageProps) {
  const toggle = (id: string) =>
    setKit({ ...kit, grinders: kit.grinders.includes(id) ? kit.grinders.filter((g) => g !== id) : [...kit.grinders, id] })
  return (
    <>
      <Title title="How do you grind?" sub="We'll give you exact settings for your grinder, not vague words." />
      <div className="space-y-2.5">
        {GRINDERS.map((g) => {
          const on = kit.grinders.includes(g.id)
          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              aria-pressed={on}
              className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors ${on ? 'border-accent bg-accent-soft/60' : 'border-line bg-card'}`}
            >
              <span className="flex-1">
                <span className="block font-medium">{g.name}</span>
                <span className="text-sm text-muted">
                  {g.kind === 'hand' ? 'Hand grinder' : g.kind === 'electric' ? 'Electric' : g.kind === 'blade' ? 'Blade' : 'No grinder'}
                  {g.unit ? ` · exact ${g.unit}` : ''}
                </span>
              </span>
              <Check on={on} />
            </button>
          )
        })}
      </div>
      <Hand className="mt-5">Hand + electric? Big batches go to the electric one automatically.</Hand>
    </>
  )
}

function ToolsPage({ kit, setKit }: PageProps) {
  const scales: { id: ScaleType; name: string; sub: string }[] = [
    { id: 'micro', name: 'Micro scale', sub: '0.1 g precision for dosing beans' },
    { id: 'timer', name: 'Scale with timer', sub: 'Sits under the brewer while you pour' },
    { id: 'basic', name: 'Kitchen scale', sub: 'Any scale that reads grams' },
  ]
  const toggle = (id: ScaleType) =>
    setKit({ ...kit, scales: kit.scales.includes(id) ? kit.scales.filter((s) => s !== id) : [...kit.scales, id] })
  const kettle = (key: 'gooseneck' | 'tempControl', v: boolean) => setKit({ ...kit, kettle: { ...kit.kettle, [key]: v } })

  return (
    <>
      <Title title="Scales & kettle" sub="These change how we write the steps." />
      <div className="space-y-2.5">
        {scales.map((s) => {
          const on = kit.scales.includes(s.id)
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              aria-pressed={on}
              className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-colors ${on ? 'border-accent bg-accent-soft/60' : 'border-line bg-card'}`}
            >
              <span className="flex-1">
                <span className="block font-medium">{s.name}</span>
                <span className="text-sm text-muted">{s.sub}</span>
              </span>
              <Check on={on} />
            </button>
          )
        })}
      </div>
      {kit.scales.length === 0 && <Hand className="mt-3">No scale? No problem. We'll use spoons and ml.</Hand>}

      <h2 className="mt-8 mb-3 font-serif text-2xl">Your kettle</h2>
      <div className="space-y-3">
        <div>
          <p className="mb-2 text-sm text-muted">Spout</p>
          <Segmented
            label="Kettle spout"
            value={kit.kettle.gooseneck ? 'goose' : 'std'}
            onChange={(v) => kettle('gooseneck', v === 'goose')}
            options={[
              { value: 'goose', label: 'Gooseneck' },
              { value: 'std', label: 'Regular' },
            ]}
          />
        </div>
        <div>
          <p className="mb-2 text-sm text-muted">Temperature</p>
          <Segmented
            label="Kettle temperature"
            value={kit.kettle.tempControl ? 'set' : 'boil'}
            onChange={(v) => kettle('tempControl', v === 'set')}
            options={[
              { value: 'boil', label: 'Just boils' },
              { value: 'set', label: 'Can set °C' },
            ]}
          />
        </div>
      </div>
    </>
  )
}

function CupPage({ kit, setKit }: PageProps) {
  return (
    <>
      <Title title="How big is your cup?" sub="When you brew for 3, we make 3 of these." />
      <CupArt className="mx-auto mb-6 h-44 w-44" />
      <Segmented
        label="Cup size"
        value={kit.cupSize}
        onChange={(v) => setKit({ ...kit, cupSize: v })}
        options={[
          { value: 180, label: 'Small' },
          { value: 250, label: 'Regular' },
          { value: 350, label: 'Big mug' },
        ]}
      />
      <p className="tabular mt-3 text-center text-muted">{kit.cupSize} ml of coffee each</p>
    </>
  )
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${on ? 'border-accent bg-accent text-accent-ink' : 'border-muted/40'}`}
    >
      {on && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
    </span>
  )
}
