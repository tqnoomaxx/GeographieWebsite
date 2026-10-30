import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRepository } from './useRepository'
import { useAuth } from './AuthProvider'
import type { UserStats } from '@/services/progress/types'
import { levelForXp } from '@/config/levels'
import { BRAND_NAME } from '@/config/brand'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [tick, setTick] = useState(0)
  const key = useMemo(() => ({}), [...deps, tick])
  const [state, setState] = useState<{ key: object; data?: T; error?: Error; loading: boolean }>({
    key,
    loading: true,
  })
  useEffect(() => {
    let cancelled = false
    setState({ key, loading: true })
    Promise.resolve()
      .then(fn)
      .then((data) => !cancelled && setState({ key, data, loading: false }))
      .catch((error: Error) => !cancelled && setState({ key, error, loading: false }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...(state.key === key ? state : { loading: true, data: undefined, error: undefined }), reload }
}

export function useStats() {
  const { loading: authLoading } = useAuth()
  const repo = useRepository()
  const { data, error, loading, reload } = useAsync(() => repo.getStats(), [repo])
  const stats: UserStats | undefined = authLoading ? undefined : data
  const level = stats ? levelForXp(stats.xp) : undefined
  return { stats, level, error, loading, reload }
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BRAND_NAME}` : BRAND_NAME
  }, [title])
}
