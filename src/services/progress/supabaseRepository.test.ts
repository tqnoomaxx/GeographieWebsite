import { afterEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({
  currentId: 'a',
  response: { data: null as unknown, error: null as unknown },
  caches: new Map<string, { stats?: unknown; profile?: unknown }>(),
  queries: 0,
}))
vi.mock('@/services/auth', () => ({
  getSupabase: async () => ({
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: mock.currentId }, access_token: 'test-token' } },
      }),
    },
    from: () => {
      mock.queries++
      const query = {
        select: () => query,
        eq: () => query,
        update: () => query,
        maybeSingle: async () => mock.response,
      }
      return query
    },
  }),
}))
vi.mock('./localRepository', () => ({
  LocalRepository: class {
    cache: { stats?: unknown; profile?: unknown }
    constructor(name: string) {
      if (!mock.caches.has(name)) mock.caches.set(name, {})
      this.cache = mock.caches.get(name)!
    }
    async saveStats(value: unknown) {
      this.cache.stats = value
    }
    async getStats() {
      return this.cache.stats ?? { xp: 0 }
    }
    async saveProfile(value: unknown) {
      this.cache.profile = value
    }
    async getProfile() {
      return this.cache.profile
    }
  },
}))
import { SupabaseRepository } from './supabaseRepository'
import { emptyStats } from './types'
afterEach(() => {
  vi.unstubAllGlobals()
  mock.currentId = 'a'
  mock.response = { data: null, error: null }
  mock.caches.clear()
  mock.queries = 0
})
describe('account-bound progress cache', () => {
  it('never gives account B the cached progress of account A while offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const a = new SupabaseRepository('a')
    await a.saveStats({ ...emptyStats(), xp: 700 })
    mock.currentId = 'b'
    const b = new SupabaseRepository('b')
    expect((await b.getStats()).xp).toBe(0)
    expect((await a.getStats()).xp).toBe(700)
  })
  it('rejects an old repository after switching accounts before making a request', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const a = new SupabaseRepository('a')
    mock.currentId = 'b'
    await expect(a.getStats()).rejects.toThrow('Sitzung')
    expect(mock.queries).toBe(0)
  })
  it('does not report a failed profile update as a cached successful save', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const a = new SupabaseRepository('a')
    mock.response = { data: null, error: new Error('unavailable') }
    await expect(
      a.saveProfile({
        username: 'new',
        avatar: 'compass',
        color: '#000',
        featuredAchievements: [],
        createdAt: '',
      }),
    ).rejects.toThrow('unavailable')
    vi.stubGlobal('navigator', { onLine: false })
    expect(await a.getProfile()).toBeUndefined()
  })
})
