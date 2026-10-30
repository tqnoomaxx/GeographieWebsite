import { describe, expect, it } from 'vitest'
import { AUTH_STORAGE_KEY as key, createAuthStorage } from './storage'
function memory(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v)
    },
    removeItem: (k) => {
      values.delete(k)
    },
    clear: () => values.clear(),
  }
}
describe('session persistence', () => {
  it('does not fall back to an unrelated remembered account', () => {
    const local = memory(),
      tab = memory()
    local.setItem(key, 'old-account')
    const storage = createAuthStorage(local, tab)
    expect(storage.getItem(key)).toBeNull()
    storage.setItem(key, 'tab-account')
    expect(tab.getItem(key)).toBe('tab-account')
    expect(local.getItem(key)).toBeNull()
  })
  it('moves both session and PKCE verifier when persistence changes', () => {
    const local = memory(),
      tab = memory(),
      storage = createAuthStorage(local, tab)
    storage.setItem(key, 'session')
    storage.setItem(`${key}-code-verifier`, 'verifier')
    storage.setPersistence(true)
    expect(local.getItem(key)).toBe('session')
    expect(local.getItem(`${key}-code-verifier`)).toBe('verifier')
    expect(tab.getItem(key)).toBeNull()
    expect(createAuthStorage(local, memory()).getItem(key)).toBe('session')
    storage.setPersistence(false)
    expect(tab.getItem(key)).toBe('session')
    expect(local.getItem(key)).toBeNull()
  })
  it('keeps a tab storage choice stable when another tab changes its preference', () => {
    const local = memory(),
      tab = memory(),
      storage = createAuthStorage(local, tab)
    storage.setItem(key, 'own-session')
    local.setItem('gk.auth.remember', 'true')
    local.setItem(key, 'other-session')
    expect(storage.getItem(key)).toBe('own-session')
    expect(storage.remembersSession()).toBe(false)
  })
  it('synchronizes rotated tokens, persistence changes and logout across tabs', () => {
    const local = memory(),
      tabA = memory(),
      tabB = memory()
    const first = createAuthStorage(local, tabA),
      second = createAuthStorage(local, tabB)
    first.setItem(key, 'old-token')
    second.syncSession('new-token')
    expect(tabB.getItem(key)).toBe('new-token')
    first.setPersistence(true)
    second.syncSession('remembered-token')
    expect(second.remembersSession()).toBe(true)
    expect(tabB.getItem(key)).toBeNull()
    expect(local.getItem(key)).toBe('remembered-token')
    first.syncSession(null)
    second.syncSession(null)
    expect(local.getItem(key)).toBeNull()
    expect(tabA.getItem(key)).toBeNull()
    expect(tabB.getItem(key)).toBeNull()
  })
})
