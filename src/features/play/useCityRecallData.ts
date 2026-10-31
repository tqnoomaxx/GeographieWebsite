import { useAsync } from '@/app/hooks'
import { loadRecallCountry, loadRecallWorld } from '@/services/data/cityRecall'
export function useCityRecallData(country?: string, minimum = 15_000) {
  const resource = useAsync(
    () =>
      country === 'world'
        ? loadRecallWorld(minimum)
        : country
          ? loadRecallCountry(country)
          : Promise.resolve(undefined),
    [country, minimum],
  )
  // A disabled adapter must not hold ordinary quizzes in a loading state.
  return { ...resource, loading: !!country && resource.loading }
}
