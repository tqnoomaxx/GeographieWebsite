import type { Page } from '@playwright/test'

export const ACCOUNT_IDS = ['a1111111-1111-4111-8111-111111111111', 'b2222222-2222-4222-8222-222222222222']
export function accountSession(index = 0) {
  const user = {
    id: ACCOUNT_IDS[index],
    aud: 'authenticated',
    role: 'authenticated',
    email: `account-${index}@example.invalid`,
    email_confirmed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    factors: [],
  }
  const encode = (data: object) => Buffer.from(JSON.stringify(data)).toString('base64url')
  const expires = Math.floor(Date.now() / 1000) + 8 * 3600
  return {
    user,
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, role: 'authenticated', aal: 'aal1', exp: expires })}.test-signature`,
    refresh_token: `test-refresh-${index}`,
    token_type: 'bearer',
    expires_in: 8 * 3600,
    expires_at: expires,
  }
}
export async function emitAccountEvent(
  page: Page,
  event: string,
  index = 0,
  override: Partial<ReturnType<typeof accountSession>> = {},
) {
  await page.evaluate(
    ({ event, session }) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('atlasfunke.auth.session')
        localStorage.removeItem('atlasfunke.auth.session')
      } else sessionStorage.setItem('atlasfunke.auth.session', JSON.stringify(session))
      const channel = new BroadcastChannel('atlasfunke.auth.session')
      channel.postMessage({ event, session: event === 'SIGNED_OUT' ? null : session })
      setTimeout(() => channel.close(), 20)
    },
    { event, session: { ...accountSession(index), ...override } },
  )
}
export async function installAccountMock(
  page: Page,
  options: { remembered?: boolean; expired?: boolean } = {},
) {
  const state = {
    userDelay: 250,
    userFailure: false,
    profileFailure: false,
    userRequests: 0,
    profileRequests: 0,
    refreshRequests: 0,
  }
  const initial = accountSession()
  if (options.expired) initial.expires_at = Math.floor(Date.now() / 1000) - 30
  await page.addInitScript(
    ({ session, remembered }) => {
      if (
        !sessionStorage.getItem('atlasfunke.auth.session') &&
        !localStorage.getItem('atlasfunke.auth.session')
      ) {
        localStorage.setItem('gk.auth.remember', String(remembered))
        ;(remembered ? localStorage : sessionStorage).setItem(
          'atlasfunke.auth.session',
          JSON.stringify(session),
        )
      }
    },
    { session: initial, remembered: !!options.remembered },
  )
  await page.route(/\/(auth|rest|functions)\/v1\//, async (route) => {
    const req = route.request(),
      url = new URL(req.url())
    const respond = (json: unknown, status = 200) =>
      route.fulfill({
        status,
        json,
        headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      })
    if (req.method() === 'OPTIONS') return respond({})
    if (url.pathname.endsWith('/auth/v1/token')) {
      state.refreshRequests++
      return respond(accountSession(String(req.postDataJSON()?.refresh_token ?? '').endsWith('-1') ? 1 : 0))
    }
    const jwt = req.headers().authorization?.split('.')[1]
    const id = jwt ? JSON.parse(Buffer.from(jwt, 'base64url').toString()).sub : ACCOUNT_IDS[0]
    const index = ACCOUNT_IDS.indexOf(id) === 1 ? 1 : 0
    if (url.pathname.endsWith('/auth/v1/user')) {
      state.userRequests++
      await new Promise((resolve) => setTimeout(resolve, state.userDelay))
      return state.userFailure
        ? respond({ message: 'Temporary test failure', code: 'unexpected_failure' }, 500)
        : respond(accountSession(index).user)
    }
    if (url.pathname.endsWith('/logout')) return respond({})
    if (url.pathname.endsWith('/admin_users')) return respond([])
    if (url.pathname.endsWith('/profiles')) {
      state.profileRequests++
      if (state.profileFailure) return respond({ message: 'Temporary test failure' }, 503)
      const profile = {
        id,
        username: index ? 'Atlas_Beta' : 'Atlas_Alpha',
        avatar: 'compass',
        color: '#446f69',
        featured_achievements: [],
        is_public: false,
        created_at: '2026-01-01T00:00:00Z',
      }
      return respond(req.method() === 'GET' ? [profile] : profile)
    }
    if (url.pathname.endsWith('/user_stats'))
      return respond([
        {
          xp: index ? 30 : 250,
          answered: index ? 3 : 25,
          correct: index ? 3 : 25,
          sessions: 1,
          full_runs: 0,
          puzzles_solved: 0,
          by_category: {},
          continents_played: [],
          streak_current: 1,
          streak_best: 1,
          learned: 0,
        },
      ])
    return respond([])
  })
  return state
}
