import { useAsync } from '@/app/hooks'
import { loadRecallCountry } from '@/services/data/cityRecall'
export function useCityRecallData(country?: string) {
  const resource = useAsync(
    () => (country ? loadRecallCountry(country) : Promise.resolve(undefined)),
    [country],
  )
  // A disabled adapter must not hold ordinary quizzes in a loading state.
  return { ...resource, loading: !!country && resource.loading }
}
