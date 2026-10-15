import type { DataResource } from './DataProvider'
import { isCategory, quizFor } from '@/config/quizzes'
import type { CategoryId } from '@/engine/types'
import type { RoundConfig } from '@/engine/round'

const quizResources: Record<CategoryId, DataResource[]> = {
  flags: ['regions'],
  countries: ['regions', 'cities', 'relationships'],
  capitals: ['cities', 'relationships'],
  languages: ['scriptWords'],
  maps: ['regions'],
  images: ['landmarks', 'cities', 'relationships'],
  regions: ['regions', 'cities', 'relationships'],
  cities: ['cities', 'regions'],
  landmarks: ['landmarks', 'cities', 'relationships'],
  water: ['rivers', 'lakes'],
  nature: ['mountains'],
  license_plates: ['plates', 'regions'],
  trivia: ['trivia'],
  mixed: [
    'regions',
    'cities',
    'landmarks',
    'relationships',
    'rivers',
    'lakes',
    'mountains',
    'scriptWords',
    'plates',
    'trivia',
  ],
}
export function resourcesForQuiz(
  category: CategoryId,
  setup?: Pick<RoundConfig, 'mode' | 'content'>,
): DataResource[] {
  let extra = quizResources[category]
  if (setup && ['flags', 'countries', 'maps'].includes(category)) {
    const mode = quizFor(category).modes.find((mode) => mode.id === setup.mode)
    const content = mode?.content ?? setup.content
    const regionMode = mode?.generators.some((id) => id.includes('region') || id === 'flag_to_europe_map')
    if ((content?.length === 1 && content[0] === 'country') || (mode && !regionMode))
      extra = extra.filter((key) => key !== 'regions')
  }
  return ['index', 'countries', ...extra]
}
export function resourcesForPage(pathname: string, params: URLSearchParams): DataResource[] {
  const [, page, id, action] = pathname.split('/')
  if (page === 'play' && isCategory(id))
    return resourcesForQuiz(
      id,
      action === 'round'
        ? {
            mode: params.get('mode') ?? 'auto',
            content: params
              .get('content')
              ?.split(',')
              .filter((c): c is 'country' | 'region' => c === 'country' || c === 'region'),
          }
        : undefined,
    )
  const core: DataResource[] = ['index', 'countries']
  if (page === 'learn')
    return [
      ...core,
      'cities',
      ...(id === 'cards' && params.get('collection') !== 'countries' ? ['regions' as const] : []),
    ]
  if (page === 'country') return [...core, 'cities', 'landmarks', 'rivers', 'lakes', 'mountains', 'regions']
  if (page === 'city') return [...core, 'cities', 'landmarks', 'regions']
  if (page === 'landmark') return [...core, 'landmarks', 'cities']
  if (page === 'region') return [...core, 'regions', 'cities']
  if (page === 'plate') return [...core, 'regions', 'plates']
  if (page === 'water') return [...core, 'rivers', 'lakes']
  if (page === 'nature') return [...core, 'mountains']
  if (page === 'explore')
    return [
      ...core,
      ...(['landmarks', 'rivers', 'lakes', 'mountains'].includes(id) ? [id as DataResource] : []),
    ]
  if (page === 'daily' && id)
    return [
      ...core,
      ...(id === 'capitale'
        ? ['cities' as const]
        : id === 'bildle'
          ? ['landmarks' as const]
          : id === 'kennzeichle'
            ? ['plates' as const]
            : []),
    ]
  if (!page || ['play', 'search', 'progress', 'daily', 'admin'].includes(page)) return core
  return []
}
