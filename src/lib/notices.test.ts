import { describe, expect, it } from 'vitest'
import { noticeQueue, pickNotice, type NoticeInput } from './notices'

const base: NoticeInput = {
  route: '',
  hasKit: true,
  updateReady: false,
  updateSnoozed: false,
  installOffer: { kind: 'ios', browser: 'safari' },
}

describe('notices', () => {
  it('shows the install banner on its own', () => {
    expect(pickNotice(base)).toEqual({ id: 'install', offer: { kind: 'ios', browser: 'safari' } })
  })

  it('shows only one banner: a ready update beats the install offer', () => {
    expect(noticeQueue({ ...base, updateReady: true }).map((n) => n.id)).toEqual(['update', 'install'])
    expect(pickNotice({ ...base, updateReady: true })?.id).toBe('update')
  })

  it("an offer of 'none' never takes a slot, so the next notice still shows", () => {
    expect(noticeQueue({ ...base, installOffer: { kind: 'none' } })).toEqual([])
    expect(pickNotice({ ...base, installOffer: { kind: 'none' }, updateReady: true })?.id).toBe('update')
  })

  it('a snoozed update lets the install banner through', () => {
    expect(pickNotice({ ...base, updateReady: true, updateSnoozed: true })?.id).toBe('install')
  })

  it('stays out of the way during a brew and during first-time setup', () => {
    expect(pickNotice({ ...base, route: 'brew', updateReady: true })).toBeNull()
    expect(pickNotice({ ...base, hasKit: false })).toBeNull()
  })
})
