import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAuthSession } from './authSession'
import type { AuthListener, AuthUser } from '@/services/auth'

const user: AuthUser = {
  id: 'account-a',
  email: 'a@example.invalid',
  emailConfirmed: true,
  createdAt: '2026-01-01',
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
function setup() {
  let event!: AuthListener
  const adapter = {
    getUser: vi.fn(async (): Promise<AuthUser | null> => user),
    mfaStatus: vi.fn(async () => ({ currentLevel: 'aal1', nextLevel: 'aal1', factors: [], required: false })),
    onChange: vi.fn((listener: AuthListener) => {
      event = listener
      return () => {}
    }),
  }
  const activate = vi.fn()
  const session = createAuthSession(adapter, true, activate)
  const stop = session.start()
  return { session, adapter, activate, stop, event: (...args: Parameters<AuthListener>) => event(...args) }
}
afterEach(() => vi.useRealTimers())
describe('verified account session', () => {
  it('shares concurrent refreshes', async () => {
    const x = setup()
    const a = x.session.refresh(),
      b = x.session.refresh()
    expect(a).toBe(b)
    await a
    expect(x.adapter.getUser).toHaveBeenCalledTimes(1)
    expect(x.session.getSnapshot().user?.id).toBe(user.id)
    x.stop()
  })
  it('keeps the verified account and repository through transient token-refresh failures', async () => {
    vi.useFakeTimers()
    const x = setup()
    await x.session.refresh()
    const original = x.session.getSnapshot().user
    x.activate.mockClear()
    x.adapter.getUser.mockRejectedValueOnce(new TypeError('network'))
    x.event(user, 'TOKEN_REFRESHED')
    await vi.runAllTimersAsync()
    expect(x.session.getSnapshot().user).toBe(original)
    expect(x.session.getSnapshot().error).toBeInstanceOf(Error)
    expect(x.activate.mock.calls.every(([id]) => id === user.id)).toBe(true)
    x.stop()
  })
  it('never restores an account after sign-out from a late refresh', async () => {
    const x = setup()
    await x.session.refresh()
    const old = deferred<AuthUser | null>()
    x.adapter.getUser.mockReturnValueOnce(old.promise)
    const pending = x.session.refresh()
    x.event(null, 'SIGNED_OUT')
    old.resolve(user)
    await pending
    expect(x.session.getSnapshot().user).toBeNull()
    expect(x.activate).toHaveBeenLastCalledWith(null)
    x.stop()
  })
  it('ignores the previous user request when a different account signs in', async () => {
    vi.useFakeTimers()
    const x = setup()
    await x.session.refresh()
    const old = deferred<AuthUser | null>()
    const next = { ...user, id: 'account-b' }
    x.adapter.getUser.mockReturnValueOnce(old.promise).mockResolvedValueOnce(next)
    const pending = x.session.refresh()
    x.event(next, 'SIGNED_IN')
    await vi.runAllTimersAsync()
    old.resolve(user)
    await pending
    expect(x.session.getSnapshot().user?.id).toBe(next.id)
    expect(x.activate).toHaveBeenLastCalledWith(next.id)
    x.stop()
  })
  it('does not activate private data before required MFA', async () => {
    const x = setup()
    await x.session.refresh()
    x.adapter.mfaStatus.mockResolvedValueOnce({
      currentLevel: 'aal1',
      nextLevel: 'aal2',
      factors: [],
      required: true,
    })
    await x.session.refresh()
    expect(x.session.getSnapshot().mfaRequired).toBe(true)
    expect(x.activate).toHaveBeenLastCalledWith(null)
    x.stop()
  })
  it('discards requests belonging to an unmounted provider', async () => {
    const x = setup()
    x.stop()
    await x.session.refresh()
    expect(x.activate).not.toHaveBeenCalled()
  })
})
