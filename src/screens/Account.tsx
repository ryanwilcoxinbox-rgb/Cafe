import { useState, type FormEvent } from 'react'
import { Button, Chevron, Hand, Screen } from '../components/ui'
import { go } from '../lib/router'
import { useStore } from '../lib/store'
import { sendCode, signOut, syncNow, useSync, verifyCode, type SyncStatus } from '../lib/sync'

const STATUS: Record<SyncStatus, string> = {
  'signed-out': '',
  syncing: 'Syncing…',
  synced: 'Backed up',
  offline: "You're offline. Changes are saved on this phone and will sync when you're back.",
  error: "Couldn't reach your backup just now. We'll keep trying.",
}

const input = 'mt-2 w-full rounded-2xl border border-line bg-card px-4 py-3 text-[16px] placeholder:text-muted/60'

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : ''
  if (/expired|invalid/i.test(msg)) return "That code didn't work. Check it, or send a new one."
  if (/rate|security purposes/i.test(msg)) return 'Too many codes in a row. Wait a minute, then try again.'
  if (!navigator.onLine) return "You're offline. Connect to sign in."
  if (/fetch|network/i.test(msg)) return "Couldn't reach BrewPrint's server. Check your connection and try again."
  return msg || 'Something went wrong. Try again.'
}

export function Account() {
  const sync = useSync()
  const hasKit = useStore((s) => !!s.kit)

  return (
    <Screen
      header={
        <>
          <button onClick={() => go('', true)} className="-ml-2 flex items-center gap-1 rounded-full py-1 pr-2 pl-1 text-sm" aria-label="Back">
            <Chevron dir="left" /> {hasKit ? 'Home' : 'Setup'}
          </button>
          <span className="h-px w-8 bg-muted/50" />
        </>
      }
      footer={['Your coffee', 'on every device']}
    >
      {!sync.ready ? (
        <p className="mt-10 text-center text-muted">Loading…</p>
      ) : sync.email ? (
        <SignedIn email={sync.email} status={sync.status} syncedAt={sync.syncedAt} />
      ) : (
        <SignIn />
      )}
    </Screen>
  )
}

function SignedIn({ email, status, syncedAt }: { email: string; status: SyncStatus; syncedAt: number | null }) {
  const [busy, setBusy] = useState(false)
  const time = syncedAt && new Date(syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <h1 className="mt-4 font-serif text-[40px] leading-[1.05]">You're signed in.</h1>
      <p className="mt-2 text-[17px] text-muted">Your kit, beans and journal are backed up and follow you to any device.</p>

      <div className="mt-6 rounded-2xl border border-line px-4 py-4">
        <p className="text-sm text-muted">Signed in as</p>
        <p className="mt-0.5 font-medium break-all">{email}</p>
        <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 shrink-0 rounded-full ${status === 'synced' ? 'bg-[var(--leaf)]' : status === 'syncing' ? 'bg-[var(--crema)]' : 'bg-accent'}`} />
          {STATUS[status]}
          {status === 'synced' && time && ` at ${time}`}
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="soft" className="flex-1" disabled={status === 'syncing'} onClick={() => void syncNow()}>
          Sync now
        </Button>
        <Button
          variant="ghost"
          className="flex-1 border border-line"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await signOut().catch(() => undefined)
            setBusy(false)
          }}
        >
          Sign out
        </Button>
      </div>
      <Hand className="mt-6">Signing out keeps everything on this phone. It just stops backing up.</Hand>
    </>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (e: FormEvent, action: () => Promise<void>) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(friendly(err))
    } finally {
      setBusy(false)
    }
  }

  const send = (e: FormEvent) =>
    run(e, async () => {
      await sendCode(email.trim())
      setSent(true)
    })

  const verify = (e: FormEvent) =>
    run(e, async () => {
      await verifyCode(email.trim(), code.trim())
      // With a restored kit this lands on Home; a brand-new account goes on to setup.
      go('', true)
    })

  return (
    <>
      <h1 className="mt-4 font-serif text-[40px] leading-[1.05]">Back up your coffee.</h1>
      <p className="mt-2 text-[17px] text-muted">
        Sign in to keep your kit, beans and journal safe, and pick up where you left off on any device. It's optional. BrewPrint works fine without it.
      </p>

      {!sent ? (
        <form onSubmit={send} className="mt-6">
          <label htmlFor="email" className="text-sm text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={input}
          />
          <Button className="mt-4 w-full" arrow disabled={busy || !email.includes('@')}>
            {busy ? 'Sending…' : 'Email me a code'}
          </Button>
          <p className="mt-3 text-sm text-muted">No password needed. We'll send a code to type in here.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6">
          <label htmlFor="code" className="text-sm text-muted">
            Code sent to <span className="text-ink">{email}</span>
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={`${input} tabular text-center text-2xl tracking-[0.3em]`}
          />
          <Button className="mt-4 w-full" arrow disabled={busy || code.length < 6}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <div className="mt-3 flex justify-between text-sm">
            <button
              type="button"
              className="text-muted underline underline-offset-4"
              onClick={() => {
                setSent(false)
                setCode('')
                setError('')
              }}
            >
              Use a different email
            </button>
            <button type="button" className="text-muted underline underline-offset-4" disabled={busy} onClick={(e) => void send(e)}>
              Send a new code
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-[15px]">
          {error}
        </p>
      )}
    </>
  )
}
