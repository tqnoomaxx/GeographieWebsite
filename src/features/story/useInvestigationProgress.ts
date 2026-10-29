import { useCallback, useEffect, useState } from 'react'
import { INVESTIGATION_STORAGE_KEY } from './investigations'
import {
  advanceInvestigation,
  emptyInvestigationProgress,
  parseInvestigationProgress,
  type InvestigationAction,
} from './investigationProgress'

export function useInvestigationProgress() {
  const [progress, setProgress] = useState(() => {
    try {
      return parseInvestigationProgress(localStorage.getItem(INVESTIGATION_STORAGE_KEY))
    } catch {
      return emptyInvestigationProgress()
    }
  })
  const [saved, setSaved] = useState(true)
  useEffect(() => {
    try {
      localStorage.setItem(INVESTIGATION_STORAGE_KEY, JSON.stringify(progress))
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }, [progress])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === INVESTIGATION_STORAGE_KEY || event.key === null)
        setProgress(parseInvestigationProgress(event.newValue))
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  const advance = useCallback(
    (action: InvestigationAction) => setProgress((current) => advanceInvestigation(current, action)),
    [],
  )
  const reset = useCallback(() => setProgress(emptyInvestigationProgress()), [])
  return { progress, saved, advance, reset }
}
