import { Component, type ReactNode } from 'react'

/** Last line of defence: a friendly screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-serif text-3xl">Spilled the coffee.</p>
        <p className="text-muted">Something went wrong on this screen. Your kit and brews are safe.</p>
        <button
          className="rounded-2xl bg-accent px-6 py-3 font-medium text-accent-ink"
          onClick={() => {
            window.location.hash = '#/'
            window.location.reload()
          }}
        >
          Back to home
        </button>
      </div>
    )
  }
}
