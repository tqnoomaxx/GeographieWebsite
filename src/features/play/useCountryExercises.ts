import { useEffect, useMemo, useState } from 'react'
import { useGeoData, type DataResource } from '@/app/DataProvider'
import { useAsync } from '@/app/hooks'
import { loadRecallIndex } from '@/services/data/cityRecall'
import { countryExerciseCandidates, countryExercises } from '@/engine/countryExercises'
import type { Exercise } from '@/config/quizCatalog'

export function useCountryExercises(scope: string) {
  const geo = useGeoData()
  const [attempt, setAttempt] = useState(0)
  const recall = useAsync(loadRecallIndex, [])
  const requiredFor = (exercise: Exercise) =>
    exercise.resources.filter((resource) =>
      resource === 'regions'
        ? !!geo.index?.regions[scope]
        : resource === 'plates'
          ? !!geo.index?.plates?.[scope.slice(8)]
          : true,
    )
  const key = [...new Set(countryExerciseCandidates(scope).flatMap(requiredFor))].sort().join(',')
  useEffect(() => {
    const resources = key.split(',').filter(Boolean) as DataResource[]
    void Promise.allSettled(resources.map((resource) => geo.ensureResources([resource])))
  }, [key, attempt, geo.ensureResources])
  const options = useMemo(
    () =>
      countryExercises(geo.contextFor(scope), recall.data, (exercise) =>
        requiredFor(exercise).every((resource) => geo.states[resource]?.status === 'ready'),
      ),
    [geo, scope, recall.data],
  )
  const resources = key.split(',').filter(Boolean) as DataResource[]
  const loading =
    recall.loading ||
    resources.some(
      (resource) => !geo.states[resource] || ['idle', 'loading'].includes(geo.states[resource]!.status),
    )
  const failed = !!recall.error || resources.some((resource) => geo.states[resource]?.status === 'error')
  return {
    options,
    loading,
    failed,
    retry: () => {
      setAttempt((value) => value + 1)
      if (recall.error) recall.reload()
    },
  }
}
