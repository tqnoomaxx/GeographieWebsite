import { useCallback, useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const VIEW_STATE = 'atlasPageView'
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/** Small, serializable view state belongs to its history entry, not to a new visit of the same URL. */
export function usePageViewState<T>(name: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const location = useLocation()
  const navigationType = useNavigationType()
  const fallback = () => (typeof initial === 'function' ? (initial as () => T)() : initial)
  const restore = () => {
    const state: unknown = location.state
    const view = record(state) ? state[VIEW_STATE] : undefined
    return record(view) && Object.hasOwn(view, name) ? (view[name] as T) : fallback()
  }
  const [entry, setEntry] = useState(() => ({ key: location.key, path: location.pathname, value: restore() }))
  if (entry.key !== location.key) {
    setEntry({
      key: location.key,
      path: location.pathname,
      value:
        navigationType === 'POP' ? restore() : entry.path === location.pathname ? entry.value : fallback(),
    })
  }
  useLayoutEffect(() => {
    const current = window.history.state
    if (entry.key !== location.key || (current?.key ?? 'default') !== location.key) return
    const state = record(current?.usr) ? current.usr : {}
    try {
      window.history.replaceState(
        {
          ...current,
          usr: {
            ...state,
            [VIEW_STATE]: { ...(record(state[VIEW_STATE]) ? state[VIEW_STATE] : {}), [name]: entry.value },
          },
        },
        '',
      )
    } catch {
      /* A browser storage limit must not prevent using the page. */
    }
  }, [entry, location.key, name])
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (value) =>
      setEntry((current) => {
        const next = typeof value === 'function' ? (value as (previous: T) => T)(current.value) : value
        return Object.is(next, current.value) ? current : { ...current, value: next }
      }),
    [],
  )
  return [entry.value, setValue]
}
