export const AUTH_STORAGE_KEY = 'atlasfunke.auth.session'
const PREFERENCE_KEY = 'gk.auth.remember'

/** Reads stay in this tab's storage until an explicit session event synchronizes the tabs. */
export function createAuthStorage(local: Storage, tab: Storage) {
  let remember = local.getItem(PREFERENCE_KEY) === 'true'
  const selected = () => (remember ? local : tab)
  const other = () => (remember ? tab : local)
  return {
    getItem: (key: string) => selected().getItem(key),
    setItem(key: string, value: string) {
      selected().setItem(key, value)
      other().removeItem(key)
    },
    removeItem(key: string) {
      local.removeItem(key)
      tab.removeItem(key)
    },
    syncSession(value: string | null) {
      if (value === null) {
        for (const target of [local, tab]) {
          for (let i = target.length - 1; i >= 0; i--) {
            const key = target.key(i)
            if (key && (key === AUTH_STORAGE_KEY || key.startsWith(`${AUTH_STORAGE_KEY}-`))) {
              target.removeItem(key)
            }
          }
        }
        return
      }
      remember = local.getItem(PREFERENCE_KEY) === 'true'
      selected().setItem(AUTH_STORAGE_KEY, value)
      other().removeItem(AUTH_STORAGE_KEY)
    },
    remembersSession: () => remember,
    setPersistence(next: boolean) {
      const source = selected()
      const values = new Map<string, string>()
      for (let i = 0; i < source.length; i++) {
        const key = source.key(i)
        if (key && (key === AUTH_STORAGE_KEY || key.startsWith(`${AUTH_STORAGE_KEY}-`))) {
          const value = source.getItem(key)
          if (value !== null) values.set(key, value)
        }
      }
      remember = next
      local.setItem(PREFERENCE_KEY, String(next))
      for (const [key, value] of values) {
        selected().setItem(key, value)
        other().removeItem(key)
      }
    },
  }
}
