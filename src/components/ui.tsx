import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'motion/react'
import { Leaf } from './Art'

export function Screen({
  header,
  children,
  cta,
  footer = ['Better coffee', 'brighter days'],
}: {
  header: ReactNode
  children: ReactNode
  cta?: ReactNode
  footer?: [string, string] | null
}) {
  return (
    <motion.div
      className="flex min-h-dvh flex-col md:min-h-[820px]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="flex items-center gap-3 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">{header}</header>
      <main className="flex-1 px-6 pb-6">{children}</main>
      {cta && (
        <div className="sticky bottom-0 bg-gradient-to-t from-card from-65% to-transparent px-6 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">{cta}</div>
      )}
      {footer && (
        <div className="flex items-end justify-between px-6 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <p className="eyebrow leading-5">
            {footer[0]}
            <br />
            {footer[1]}
          </p>
          <Leaf className="h-7 w-7 text-muted" />
        </div>
      )}
    </motion.div>
  )
}

export function StepHeader({ step, of = 4, label = 'Brew', onBack }: { step: number; of?: number; label?: string; onBack?: () => void }) {
  return (
    <>
      {onBack ? (
        <button onClick={onBack} className="-ml-2 flex items-center gap-1 rounded-full py-1 pr-2 pl-1 text-sm text-ink" aria-label="Back">
          <Chevron dir="left" /> {label}
        </button>
      ) : (
        <span className="text-sm">{label}</span>
      )}
      <span className="h-px w-8 bg-muted/50" />
      <span className="tabular ml-auto text-sm text-muted">
        {step} / {of}
      </span>
    </>
  )
}

export function Button({
  children,
  variant = 'primary',
  arrow,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'ghost'; arrow?: boolean }) {
  const styles = {
    primary: 'bg-accent text-accent-ink shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--accent)_70%,transparent)]',
    soft: 'bg-sunk text-ink border border-line',
    ghost: 'text-ink',
  }[variant]
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`flex h-14 items-center justify-center gap-3 rounded-2xl px-6 text-[17px] font-medium transition-colors disabled:opacity-40 ${styles} ${className}`}
      {...(props as object)}
    >
      {children}
      {arrow && <Arrow />}
    </motion.button>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-2xl bg-sunk p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative flex-1 rounded-xl px-2 py-3 text-[15px] font-medium transition-colors ${active ? 'text-accent-ink' : 'text-ink'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-xl bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 8,
  unit,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  unit: (n: number) => string
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-sunk p-1">
      <RoundButton label="Fewer" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </RoundButton>
      <motion.div key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center">
        <span className="tabular font-serif text-3xl">{value}</span>
        <span className="ml-2 text-muted">{unit(value)}</span>
      </motion.div>
      <RoundButton label="More" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </RoundButton>
    </div>
  )
}

function RoundButton({ children, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-2xl text-ink shadow-sm disabled:opacity-30"
      {...(props as object)}
    >
      {children}
    </motion.button>
  )
}

export function Hand({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`font-hand text-xl leading-tight text-muted ${className}`}>{children}</p>
}

export function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${active ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-card text-muted'}`}
    >
      {children}
    </button>
  )
}

export function Arrow() {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 6h17M13 1l5 5-5 5" />
    </svg>
  )
}

export function Chevron({ dir = 'right' }: { dir?: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  )
}

export function Radio({ checked }: { checked: boolean }) {
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${checked ? 'border-accent' : 'border-muted/50'}`}>
      {checked && <motion.span layoutId="radio-dot" className="h-3 w-3 rounded-full bg-accent" />}
    </span>
  )
}
