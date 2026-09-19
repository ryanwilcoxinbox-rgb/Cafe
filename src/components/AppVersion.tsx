import { checkNow, RUNNING, updateAndReload, useUpdateState } from '../lib/pwa'
import { formatBuildTime, type UpdateStatus } from '../lib/updateLogic'

const MESSAGE: Record<UpdateStatus, string> = {
  idle: '',
  checking: 'Checking…',
  'up-to-date': "You're up to date.",
  'update-ready': 'A new version is ready.',
  downloading: 'A newer version is out and downloading. Check again in a moment.',
  offline: "Couldn't check for updates. You may be offline.",
  unsupported: "This browser can't check for updates automatically. Reload the page to get the latest.",
}

/** Low-key "which build am I on, and is there a newer one?" panel. Lives on the My kit screen. */
export function AppVersion() {
  const { status, latest } = useUpdateState()
  const running = `Version ${RUNNING.version}${RUNNING.commit ? ` · ${RUNNING.commit}` : ''}`

  return (
    <section aria-labelledby="about-title" className="mt-10 rounded-2xl border border-line px-4 py-4 text-sm">
      <h2 id="about-title" className="eyebrow">
        About BrewPrint
      </h2>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted">Running</dt>
        <dd className="tabular">
          {running}
          <br />
          Built {formatBuildTime(RUNNING.buildTime)}
        </dd>
        {latest && (
          <>
            <dt className="text-muted">Latest</dt>
            <dd className="tabular">
              Version {latest.version}
              {latest.commit && ` · ${latest.commit}`}
              <br />
              Built {formatBuildTime(latest.buildTime)}
            </dd>
          </>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {status === 'update-ready' ? (
          <button onClick={updateAndReload} className="min-h-11 rounded-xl bg-accent px-4 font-medium text-accent-ink">
            Update and reload
          </button>
        ) : (
          <button
            onClick={() => void checkNow()}
            disabled={status === 'checking'}
            className="min-h-11 rounded-xl border border-line bg-sunk px-4 font-medium disabled:opacity-60"
          >
            {status === 'checking' ? 'Checking…' : 'Check for updates'}
          </button>
        )}
        <p role="status" aria-live="polite" className="min-w-0 flex-1 text-muted">
          {status !== 'checking' && MESSAGE[status]}
        </p>
      </div>
    </section>
  )
}
