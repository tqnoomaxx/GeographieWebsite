import { useCallback, useEffect, useState } from 'react'
import {
  advanceStory,
  emptyStoryProgress,
  parseStoryProgress,
  STORY_STORAGE_KEY,
  type StoryAction,
} from './storyProgress'

export function useStoryProgress() {
  const [progress, setProgress] = useState(() => {
    try {
      return parseStoryProgress(localStorage.getItem(STORY_STORAGE_KEY))
    } catch {
      return emptyStoryProgress()
    }
  })
  const [saved, setSaved] = useState(true)
  useEffect(() => {
    try {
      localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(progress))
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }, [progress])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === STORY_STORAGE_KEY || event.key === null)
        setProgress(parseStoryProgress(event.newValue))
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  const advance = useCallback(
    (action: StoryAction) => setProgress((current) => advanceStory(current, action)),
    [],
  )
  const reset = useCallback(() => setProgress(emptyStoryProgress()), [])
  return { progress, saved, advance, reset }
}
