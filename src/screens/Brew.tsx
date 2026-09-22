import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BrewerArt } from '../components/Art'
import { Button, Hand, Screen, StepHeader } from '../components/ui'
import type { BrewerType, Kit } from '../data/types'
import { chime, mmss, unlockAudio, useWakeLock } from '../lib/device'
import { go } from '../lib/router'
import { lastBrew, useStopwatch } from '../lib/stopwatch'
import { useRecipe } from '../lib/useRecipe'

export function Brew({ type, kit }: { type: BrewerType; kit: Kit }) {
  const { recipe: r } = useRecipe(type, kit)
  const [round, setRound] = useState(1)
  const [index, setIndex] = useState(-1) // -1 = getting ready
  const [checked, setChecked] = useState<number[]>([])
  const step = r.steps[index]
  const isLast = index === r.steps.length - 1
  const stepWatch = useStopwatch()
  const total = useStopwatch()
  const fired = useRef(-1)
  useWakeLock(true)

  const begin = () => {
    unlockAudio()
    setIndex(0)
    fired.current = -1
    stepWatch.start()
    if (round === 1) total.start()
    else total.resume()
  }

  const next = () => {
    if (!isLast) {
      setIndex((i) => i + 1)
      stepWatch.start()
      total.resume()
      return
    }
    if (round < r.rounds) {
      setRound(round + 1)
      setIndex(-1)
      setChecked([])
      stepWatch.reset()
      total.pause()
      return
    }
    lastBrew.seconds = Math.round(total.elapsed / 1000)
    go(`done/${type}`, true)
  }

  const togglePause = () => {
    if (stepWatch.running) {
      stepWatch.pause()
      total.pause()
    } else {
      stepWatch.resume()
      total.resume()
    }
  }

  // When a timed step runs out: chime, then move on by itself (hands are busy pouring).
  const remaining = step?.seconds ? step.seconds - stepWatch.elapsed / 1000 : null
  useEffect(() => {
    if (remaining === null || remaining > 0 || fired.current === index) return
    fired.current = index
    chime()
    if (!isLast) {
      setIndex(index + 1)
      stepWatch.start()
    }
  }, [remaining, index, isLast, stepWatch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (index < 0) return
      if (e.key === ' ') {
        e.preventDefault()
        togglePause()
      } else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const leave = () => {
    if (index < 0 || window.confirm('Stop this brew?')) go(`recipe/${type}`, true)
  }

  const hasScale = kit.scales.length > 0
  const summary = [
    `${kit.scales.includes('micro') ? r.coffee.toFixed(1) : r.coffee} g coffee`,
    `${r.water} ${hasScale ? 'g' : 'ml'} water`,
    r.temp.value,
    r.grind.display,
  ]

  if (index < 0) {
    return (
      <Screen
        header={<StepHeader step={3} onBack={leave} />}
        cta={
          <Button className="w-full" arrow onClick={begin}>
            {round > 1 ? `Start round ${round}` : 'Start the timer'}
          </Button>
        }
        footer={null}
      >
        <p className="mt-4 text-muted">{r.rounds > 1 ? `Round ${round} of ${r.rounds}` : 'Before you start'}</p>
        <h1 className="font-serif text-[40px] leading-[1.05]">Get ready</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.map((s) => (
            <span key={s} className="tabular rounded-full bg-sunk px-3 py-1.5 text-sm">
              {s}
            </span>
          ))}
        </div>
        <ul className="mt-6 space-y-2">
          {r.prep.map((line, i) => {
            const on = checked.includes(i)
            return (
              <li key={i}>
                <button
                  onClick={() => setChecked(on ? checked.filter((c) => c !== i) : [...checked, i])}
                  aria-pressed={on}
                  className="flex w-full gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-sunk/60"
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${on ? 'border-accent bg-accent text-accent-ink' : 'border-muted/40'}`}
                  >
                    {on && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-[16px] leading-snug transition-opacity ${on ? 'opacity-45' : ''}`}>{line}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <Hand className="mt-4 text-center">
          {type === 'drip'
            ? 'Start the timer when you switch the machine on.'
            : type === 'moka'
              ? 'Start the timer when it goes on the heat.'
              : 'The timer starts when you start pouring.'}
        </Hand>
      </Screen>
    )
  }

  const shown = remaining !== null ? Math.max(0, Math.ceil(remaining)) : stepWatch.elapsed / 1000
  const progress = step.seconds ? Math.min(1, stepWatch.elapsed / 1000 / step.seconds) : 0
  const timeUp = remaining !== null && remaining <= 0

  return (
    <Screen
      header={<StepHeader step={3} onBack={leave} />}
      cta={
        <div className="flex gap-3">
          <Button variant="soft" className="w-[42%]" onClick={togglePause}>
            {stepWatch.running ? <PauseIcon /> : <PlayIcon />}
            {stepWatch.running ? 'Pause' : 'Resume'}
          </Button>
          <Button className="flex-1" arrow onClick={next}>
            {!isLast ? 'Next step' : round < r.rounds ? 'Next round' : 'Finish'}
          </Button>
        </div>
      }
      footer={null}
    >
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {r.steps.map((_, i) => (
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-sunk">
            <motion.span
              className="block h-full bg-accent"
              initial={false}
              animate={{ width: i < index ? '100%' : i === index ? `${(step.seconds ? progress : 0.5) * 100}%` : '0%' }}
              transition={{ ease: 'linear', duration: 0.2 }}
            />
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${round}-${index}`}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mt-5 text-muted">
            Step {index + 1} of {r.steps.length}
            {r.rounds > 1 && ` · round ${round} of ${r.rounds}`}
          </p>
          <h1 className="font-serif text-[40px] leading-[1.05]">{step.title}</h1>
          {step.why && <p className="mt-2 text-[16px] leading-snug text-muted">{step.why}</p>}

          <div className="relative mt-4 flex items-center justify-between">
            <div>
              <p className={`tabular font-serif text-[72px] leading-none transition-colors ${timeUp ? 'text-accent' : ''}`} aria-live="off">
                {mmss(shown)}
              </p>
              <p className="tabular mt-2 text-sm text-muted">
                {step.seconds ? (timeUp ? "Time's up" : 'left in this step') : 'Tap next when ready'}
              </p>
              <p className="tabular mt-1 text-sm text-muted">Total {mmss(total.elapsed / 1000)}</p>
            </div>
            <BrewerArt type={type} brewing className="-mr-2 h-48 w-40 shrink-0" />
          </div>

          {step.aside && <Hand className="mt-2 -rotate-3">{step.aside}</Hand>}

          <p className="mt-4 text-center text-[18px] leading-snug">
            <Emphasis text={step.body} />
          </p>
          {step.target !== undefined && hasScale && (
            <p className="mt-3 text-center">
              <span className="tabular inline-block rounded-full bg-accent-soft px-4 py-1.5 font-medium">Scale target: {step.target} g</span>
            </p>
          )}
          {!stepWatch.running && <p className="mt-4 text-center font-medium text-accent">Paused</p>}
        </motion.div>
      </AnimatePresence>
    </Screen>
  )
}

/** Bold every "123 g" / "123 ml" so the number you need jumps out. */
function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d+(?:\.\d+)? (?:g|ml))/).map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-accent">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
}

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
)
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 5l12 7-12 7z" />
  </svg>
)
