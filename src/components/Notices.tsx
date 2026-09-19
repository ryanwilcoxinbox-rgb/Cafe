import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IOS_BROWSER_NAME, type InstallOffer } from '../lib/install'
import { promptInstall, useInstallOffer } from '../lib/installPrompt'
import { pickNotice, type Notice } from '../lib/notices'
import { snoozeUpdate, updateAndReload, useUpdateState } from '../lib/pwa'
import { useRoute } from '../lib/router'
import { setState, useStore } from '../lib/store'
import { Mark } from './Art'

/** Decides which single notice (if any) to show, then renders it. The banners themselves never decide. */
export function NoticeSlot() {
  const [route = ''] = useRoute()
  const hasKit = useStore((s) => s.kit !== null)
  const update = useUpdateState()
  const installOffer = useInstallOffer()
  const notice = pickNotice({
    route,
    hasKit,
    updateReady: update.status === 'update-ready',
    updateSnoozed: update.snoozed,
    installOffer,
  })

  return (
    <AnimatePresence initial={false}>
      {notice && (
        <motion.div
          key={notice.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden px-4"
        >
          <div className="pt-1 pb-2">{render(notice)}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function render(notice: Notice) {
  return notice.id === 'update' ? <UpdateNotice /> : <InstallNotice offer={notice.offer} />
}

function Card({
  title,
  children,
  actions,
  onClose,
  closeLabel,
}: {
  title: string
  children: ReactNode
  actions?: ReactNode
  onClose: () => void
  closeLabel: string
}) {
  return (
    <section role="region" aria-label={title} className="relative rounded-2xl border border-line bg-accent-soft/70 p-4">
      <div className="flex items-start gap-3 pr-8">
        <Mark className="mt-0.5 h-7 w-7 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">{title}</h2>
          <div className="mt-1 text-[15px] leading-snug">{children}</div>
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap items-center gap-2 pl-10">{actions}</div>}
      <button
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-sunk"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </section>
  )
}

function ActionButton({ children, onClick, quiet }: { children: ReactNode; onClick: () => void; quiet?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-11 rounded-xl px-4 text-[15px] font-medium ${quiet ? '-ml-2 text-muted underline-offset-2 hover:underline' : 'bg-accent text-accent-ink'}`}
    >
      {children}
    </button>
  )
}

function UpdateNotice() {
  return (
    <Card
      title="A new version is ready"
      onClose={snoozeUpdate}
      closeLabel="Remind me later"
      actions={
        <>
          <ActionButton onClick={updateAndReload}>Update and reload</ActionButton>
          <ActionButton quiet onClick={snoozeUpdate}>
            Later
          </ActionButton>
        </>
      }
    >
      <p className="text-muted">Reload to get the latest BrewPrint. It only takes a second.</p>
    </Card>
  )
}

const dismissInstall = () => setState((s) => ({ ...s, installPromptDismissed: true }))

function InstallNotice({ offer }: { offer: Exclude<InstallOffer, { kind: 'none' }> }) {
  const common = { onClose: dismissInstall, closeLabel: "Don't show this again" }

  switch (offer.kind) {
    case 'prompt':
      return (
        <Card title="Install BrewPrint" {...common} actions={<ActionButton onClick={() => void promptInstall()}>Install</ActionButton>}>
          <p className="text-muted">Opens full-screen from your home screen and works offline.</p>
        </Card>
      )
    case 'ios': {
      const safari = offer.browser === 'safari'
      const chrome = offer.browser === 'chrome'
      const name = IOS_BROWSER_NAME[offer.browser]
      return (
        <Card title="Add BrewPrint to your Home Screen" {...common}>
          <ol className="list-decimal space-y-1 pl-5 text-muted">
            {safari ? (
              <li>
                Tap <ShareIcon /> <b className="font-medium text-ink">Share</b>. It's in the toolbar, or in the ••• menu on some layouts.
              </li>
            ) : chrome ? (
              <li>
                Tap <ShareIcon /> <b className="font-medium text-ink">Share</b>.
              </li>
            ) : (
              <li>
                Open {offer.browser === 'other' ? 'your browser' : name}'s <b className="font-medium text-ink">Share</b> menu.
              </li>
            )}
            <li>
              Choose <b className="font-medium text-ink">Add to Home Screen</b>.
            </li>
            {safari && (
              <li>
                If you see <b className="font-medium text-ink">Open as Web App</b>, keep it on.
              </li>
            )}
            <li>
              Tap <b className="font-medium text-ink">Add</b>.
            </li>
          </ol>
          {!safari && !chrome && (
            <p className="mt-2 text-sm text-muted">If you don't see Add to Home Screen, open this same page in Safari and try again.</p>
          )}
        </Card>
      )
    }
    case 'android-manual':
      return (
        <Card title="Add BrewPrint to your Home screen" {...common}>
          <p className="text-muted">
            Open your browser menu and choose <b className="font-medium text-ink">Install app</b> or{' '}
            <b className="font-medium text-ink">Add to Home screen</b>.
          </p>
        </Card>
      )
    case 'desktop':
      return (
        <Card
          title="Best on your phone"
          {...common}
          actions={
            offer.canPrompt && (
              <ActionButton quiet onClick={() => void promptInstall()}>
                Install on this computer instead
              </ActionButton>
            )
          }
        >
          <p className="text-muted">BrewPrint is made for the kitchen. Open it on your phone and add it to your Home Screen for the app-like experience.</p>
        </Card>
      )
    case 'generic':
      return (
        <Card title="Keep BrewPrint handy" {...common}>
          <p className="text-muted">Your browser may let you add this page to your home screen from its menu.</p>
        </Card>
      )
  }
}

function ShareIcon() {
  return (
    <svg className="inline-block align-[-3px]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V3M8 7l4-4 4 4" />
      <path d="M7 10H5v11h14V10h-2" />
    </svg>
  )
}
