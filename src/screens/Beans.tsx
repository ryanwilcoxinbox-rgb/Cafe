import { useState } from 'react'
import { motion } from 'motion/react'
import { Button, Chevron, Chip, Hand, Screen, Segmented } from '../components/ui'
import type { Bean, Roast } from '../data/types'
import { restDays } from '../lib/recipe'
import { back, go } from '../lib/router'
import { getState, setState, uid, useStore } from '../lib/store'

export const ROAST_LABEL: Record<Roast, string> = { light: 'Light roast', medium: 'Medium roast', dark: 'Dark roast' }

export function beanAge(bean: Pick<Bean, 'roastedOn'>) {
  const d = restDays(bean.roastedOn)
  if (d === null) return null
  return d === 0 ? 'roasted today' : d === 1 ? 'roasted yesterday' : `${d} days off roast`
}

function Header({ label, onBack, right }: { label: string; onBack: () => void; right?: string }) {
  return (
    <>
      <button onClick={onBack} className="-ml-2 flex items-center gap-1 rounded-full py-1 pr-2 pl-1 text-sm" aria-label={`Back to ${label.toLowerCase()}`}>
        <Chevron dir="left" /> {label}
      </button>
      <span className="h-px w-8 bg-muted/50" />
      {right && <span className="tabular ml-auto text-sm text-muted">{right}</span>}
    </>
  )
}

export function BeanList() {
  const beans = useStore((s) => s.beans)
  const activeId = useStore((s) => s.activeBeanId)
  const [showFinished, setShowFinished] = useState(false)
  const open = beans.filter((b) => !b.finished)
  const finished = beans.filter((b) => b.finished)
  const setActive = (id: string | undefined) => setState((s) => ({ ...s, activeBeanId: id }))

  return (
    <Screen
      header={<Header label="Home" onBack={() => go('', true)} right={`${open.length} ${open.length === 1 ? 'bag' : 'bags'}`} />}
      cta={
        <Button className="w-full" arrow onClick={() => go('beans/new')}>
          Add a bag
        </Button>
      }
      footer={['Same beans', 'brighter days']}
    >
      <h1 className="mt-4 font-serif text-[40px] leading-[1.05]">My beans</h1>
      <p className="mt-2 text-[17px] text-muted">Each bag learns its own grind. Tap one to brew with it.</p>

      {open.length === 0 && <Hand className="mt-10 text-center">No beans yet. Add the bag you're drinking now.</Hand>}

      <ul className="mt-6 space-y-3">
        {open.map((b, i) => (
          <motion.li key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <BeanCard bean={b} active={b.id === activeId} onSelect={() => setActive(b.id === activeId ? undefined : b.id)} />
          </motion.li>
        ))}
      </ul>

      {finished.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowFinished(!showFinished)} className="text-sm text-muted underline underline-offset-2">
            {showFinished ? 'Hide' : 'Show'} finished bags ({finished.length})
          </button>
          {showFinished && (
            <ul className="mt-3 space-y-3 opacity-70">
              {finished.map((b) => (
                <li key={b.id}>
                  <BeanCard bean={b} active={false} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Screen>
  )
}

function BeanCard({ bean, active, onSelect }: { bean: Bean; active: boolean; onSelect?: () => void }) {
  const age = beanAge(bean)
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${active ? 'border-accent bg-accent-soft/70' : 'border-line bg-card'}`}>
      <button onClick={onSelect} disabled={!onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-pressed={active}>
        <RoastDot roast={bean.roast} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-xl">{bean.name}</span>
          <span className="block truncate text-sm text-muted">
            {[bean.roaster, ROAST_LABEL[bean.roast], bean.process, age].filter(Boolean).join(' · ')}
          </span>
          {active && <span className="mt-1 inline-block text-xs font-medium text-accent">Brewing with this</span>}
        </span>
      </button>
      <button onClick={() => go(`beans/${bean.id}`)} className="rounded-full px-2 py-1 text-sm text-muted hover:bg-sunk" aria-label={`Edit ${bean.name}`}>
        Edit
      </button>
    </div>
  )
}

export function RoastDot({ roast }: { roast: Roast }) {
  const shade = { light: '#c8905a', medium: '#8a5634', dark: '#3b2419' }[roast]
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <ellipse cx="12" cy="12" rx="6.5" ry="9" transform="rotate(35 12 12)" fill={shade} />
      <path d="M8.5 17.5c2-3 1-6 3.5-8.5s3-3 3.5-4" stroke="var(--card)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const today = () => new Date().toISOString().slice(0, 10)

export function BeanForm({ id }: { id?: string }) {
  const existing = id ? getState().beans.find((b) => b.id === id) : undefined
  const [bean, setBean] = useState<Bean>(existing ?? { id: uid(), name: '', roast: 'medium', addedAt: Date.now() })
  const set = (patch: Partial<Bean>) => setBean((b) => ({ ...b, ...patch }))
  const valid = bean.name.trim().length > 0

  const save = () => {
    const clean = { ...bean, name: bean.name.trim(), roaster: bean.roaster?.trim() || undefined, notes: bean.notes?.trim() || undefined }
    setState((s) => ({
      ...s,
      beans: existing ? s.beans.map((b) => (b.id === clean.id ? clean : b)) : [clean, ...s.beans],
      // A new bag is almost always the one you're about to brew.
      activeBeanId: existing ? s.activeBeanId : clean.id,
    }))
    back('beans')
  }

  const finish = () => {
    setState((s) => ({
      ...s,
      beans: s.beans.map((b) => (b.id === bean.id ? { ...b, finished: !b.finished } : b)),
      activeBeanId: s.activeBeanId === bean.id ? undefined : s.activeBeanId,
    }))
    back('beans')
  }

  return (
    <Screen
      header={<Header label="Beans" onBack={() => back('beans')} />}
      cta={
        <Button className="w-full" arrow disabled={!valid} onClick={save}>
          {existing ? 'Save changes' : 'Add to my beans'}
        </Button>
      }
      footer={null}
    >
      <h1 className="mt-4 font-serif text-[40px] leading-[1.05]">{existing ? 'Edit bag' : 'New bag'}</h1>
      <p className="mt-2 text-[17px] text-muted">The roast and date change the recipe, so they're worth adding.</p>

      <div className="mt-6 space-y-5">
        <Field label="Name" htmlFor="bean-name">
          <input id="bean-name" autoFocus={!existing} value={bean.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Ethiopia Guji" className={INPUT} />
        </Field>
        <Field label="Roaster" optional htmlFor="bean-roaster">
          <input id="bean-roaster" value={bean.roaster ?? ''} onChange={(e) => set({ roaster: e.target.value })} placeholder="e.g. Square Mile" className={INPUT} />
        </Field>
        <Field label="Roast">
          <Segmented<Roast>
            label="Roast level"
            value={bean.roast}
            onChange={(roast) => set({ roast })}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'medium', label: 'Medium' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </Field>
        <Field label="Process" optional>
          <div className="flex flex-wrap gap-2">
            {(['washed', 'natural', 'honey', 'other'] as const).map((p) => (
              <Chip key={p} active={bean.process === p} onClick={() => set({ process: bean.process === p ? undefined : p })}>
                {p[0].toUpperCase() + p.slice(1)}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Roast date" optional htmlFor="bean-date">
          <input id="bean-date" type="date" max={today()} value={bean.roastedOn ?? ''} onChange={(e) => set({ roastedOn: e.target.value || undefined })} className={INPUT} />
          {bean.roastedOn && <p className="mt-1.5 text-sm text-muted">{beanAge(bean)}</p>}
        </Field>
        <Field label="Tasting notes" optional htmlFor="bean-notes">
          <input id="bean-notes" value={bean.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. blueberry, jasmine" className={INPUT} />
        </Field>
      </div>

      {existing && (
        <button onClick={finish} className="mt-8 w-full rounded-2xl border border-line py-3 text-[15px] text-muted">
          {existing.finished ? 'Put back on the shelf' : 'Bag finished'}
        </button>
      )}
    </Screen>
  )
}

const INPUT = 'w-full rounded-2xl border border-line bg-card px-4 py-3 text-[16px] placeholder:text-muted/60'

function Field({ label, optional, htmlFor, children }: { label: string; optional?: boolean; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm text-muted">
        {label} {optional && <span className="opacity-70">(optional)</span>}
      </label>
      {children}
    </div>
  )
}
