import { useMemo } from 'react'
import { geoArea, geoCentroid, geoDistance, geoMercator, geoPath } from 'd3-geo'
import { useAsync } from '@/app/hooks'
import { loadWorld } from '@/services/data/dataService'
import { MapViewport } from '@/ui/maps'
import { ErrorState } from '@/ui'

type Shape = GeoJSON.Feature<GeoJSON.Geometry, { id?: string; name?: string }>
/** Focus each puzzle on its four main land areas instead of tiny targets on a world map. */
function mainArea(feature: Shape): Shape {
  if (feature.geometry.type !== 'MultiPolygon') return feature
  const parts = feature.geometry.coordinates.map((coordinates) => ({
    ...feature,
    geometry: { type: 'Polygon' as const, coordinates },
  }))
  const largest = [...parts].sort((a, b) => geoArea(b) - geoArea(a))[0]
  const center = geoCentroid(largest)
  return {
    ...feature,
    geometry: {
      type: 'MultiPolygon',
      coordinates: parts
        .filter((part) => geoDistance(center, geoCentroid(part)) < 0.45)
        .map((part) => part.geometry.coordinates),
    },
  }
}

export function StoryCountryMap({
  countries,
  onPick,
  correct,
  wrong,
  disabled,
}: {
  countries: string[]
  onPick: (id: string) => void
  correct?: string
  wrong?: string
  disabled?: boolean
}) {
  const { data: world, error, reload } = useAsync(loadWorld, [])
  const { shapes, path } = useMemo(() => {
    if (!world) return { shapes: [], path: null }
    const shapes = world.features
      .filter((feature) => countries.includes(String(feature.properties?.id)))
      .map((feature) => mainArea(feature as Shape))
    const projection = geoMercator()
      .fitExtent(
        [
          [38, 22],
          [922, 498],
        ],
        { type: 'FeatureCollection', features: shapes },
      )
      .clipExtent([
        [0, 0],
        [960, 520],
      ])
    return { shapes, path: geoPath(projection) }
  }, [world, countries])
  if (error) return <ErrorState message="Die Karte konnte nicht geladen werden." onRetry={reload} />
  if (!path)
    return (
      <div className="story-map-loading" role="status">
        Die Karte wird aufgeschlagen …
      </div>
    )
  return (
    <div className="story-country-map">
      <MapViewport
        viewBox="0 0 960 520"
        width={960}
        height={520}
        interactive={!disabled}
        label="Vier Länderumrisse"
      >
        {(moved) => (
          <>
            <rect width={960} height={520} fill="#e8f1ed" />
            {shapes.map((feature, index) => {
              const id = String(feature.properties?.id)
              return (
                <path
                  key={id}
                  d={path(feature) ?? ''}
                  className={correct === id ? 'is-correct' : wrong === id ? 'is-wrong' : ''}
                  fill="#b2cdc0"
                  stroke="#f7f6ed"
                  strokeWidth={3}
                  role="button"
                  aria-label={`Länderumriss ${index + 1}`}
                  data-story-country={id}
                  tabIndex={disabled ? -1 : 0}
                  aria-disabled={disabled}
                  onClick={() => {
                    if (!disabled && !moved()) onPick(id)
                  }}
                  onKeyDown={(event) => {
                    if (!disabled && ['Enter', ' '].includes(event.key)) {
                      event.preventDefault()
                      onPick(id)
                    }
                  }}
                />
              )
            })}
          </>
        )}
      </MapViewport>
      <p>Tippe auf eine der vier hervorgehobenen Flächen. Du kannst die Karte vergrößern.</p>
    </div>
  )
}
