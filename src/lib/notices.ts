import type { InstallOffer } from './install'

export type Notice = { id: 'update' } | { id: 'install'; offer: Exclude<InstallOffer, { kind: 'none' }> }

export interface NoticeInput {
  /** First path segment of the current route ("" = home). */
  route: string
  hasKit: boolean
  updateReady: boolean
  updateSnoozed: boolean
  installOffer: InstallOffer
}

/**
 * Every notice that has something useful to say, most important first. Only real notices are
 * queued, so an empty one can never hold a slot and block the next.
 */
export function noticeQueue(input: NoticeInput): Notice[] {
  // Never interrupt a brew in progress, and let first-time setup finish undisturbed.
  if (input.route === 'brew' || !input.hasKit) return []
  const queue: Notice[] = []
  if (input.updateReady && !input.updateSnoozed) queue.push({ id: 'update' })
  if (input.installOffer.kind !== 'none') queue.push({ id: 'install', offer: input.installOffer })
  return queue
}

/** One banner at a time. */
export const pickNotice = (input: NoticeInput): Notice | null => noticeQueue(input)[0] ?? null
