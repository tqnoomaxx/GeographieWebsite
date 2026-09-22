import { useCallback, useEffect, useState } from 'react'
import { getRepository, onRepositoryChange } from '@/services/progress'
import type { UserStats } from '@/services/progress/types'
import { levelForXp } from '@/config/levels'
import { BRAND_NAME } from '@/config/brand'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: undefined }))
    fn()
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((error: Error) => !cancelled && setState({ error, loading: false }))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}

export function useStats() {
  const { data, reload } = useAsync(() => getRepository().getStats(), [])
  useEffect(() => {
    const off = onRepositoryChange(reload)
    return () => void off()
  }, [reload])
  const stats: UserStats | undefined = data
  const level = stats ? levelForXp(stats.xp) : undefined
  return { stats, level, reload }
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
