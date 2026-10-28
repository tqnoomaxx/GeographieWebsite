import { useMemo } from 'react'
import { geoBounds, geoCentroid, geoMercator, geoPath } from 'd3-geo'
import { useAsync } from '@/app/hooks'
import type { Entity } from '@/domain/types'
import { mapGeometry, type MapFeatureType } from '@/domain/mapFeatures'
import { loadWorld } from '@/services/data/dataService'
import { ErrorState } from '@/ui'
import { MapViewport } from './maps'
import './feature-map.css'

const WIDTH = 960,
  HEIGHT = 560
const LABELS = { river: 'Fluss', lake: 'See', mountain: 'Berg' }
const HINTS = {
  river: 'Tippe direkt auf einen eingezeichneten Flusslauf.',
  lake: 'Tippe direkt auf die eingezeichnete Seefläche.',
  mountain: 'Tippe auf die Gipfelmarkierung des gesuchten Berges.',
}

export function FeatureMap({
  entities,
  type,
  onPick,
  disabled,
  correct,
  wrong,
  scope,
}: {
  entities: Entity[]
  type: MapFeatureType
  onPick: (id: string) => void
  disabled?: boolean
  correct?: string
  wrong?: string
  scope: string
}) {
  const { data: world, error, reload } = useAsync(loadWorld, [])
  const { path, features, countryLabels } = useMemo(() => {
    const features = entities.flatMap((entity) => {
      const geometry = mapGeometry(entity)
      return geometry ? [{ entity, geometry }] : []
    })
    if (!features.length) return { path: geoPath(), features, countryLabels: [] }
    const collection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features.map(({ entity, geometry }) => ({
        type: 'Feature',
        properties: { id: entity.id },
        geometry,
      })),
    }
    const [[west, south], [east, north]] = geoBounds(collection)
    const adjustedEast = east < west ? east + 360 : east
    const midLon = (west + adjustedEast) / 2
    const midLat = (south + north) / 2
    const minSpan = scope.startsWith('country:') ? 1.5 : 6
    const lonSpan = Math.max(minSpan, adjustedEast - west) * 1.2
    const latSpan = Math.max(minSpan, north - south) * 1.2
    const wrap = (lon: number) => ((lon + 540) % 360) - 180
    const frame: GeoJSON.MultiPoint = {
      type: 'MultiPoint',
      coordinates: [
        [wrap(midLon - lonSpan / 2), Math.max(-83, midLat - latSpan / 2)],
        [wrap(midLon + lonSpan / 2), Math.min(83, midLat + latSpan / 2)],
      ],
    }
    const projection = geoMercator()
      .rotate([-wrap(midLon), 0])
      .fitExtent(
        [
          [35, 35],
          [WIDTH - 35, HEIGHT - 35],
        ],
        frame,
      )
    const path = geoPath(projection)
    const countryLabels = (world?.features ?? []).flatMap((feature) => {
      const point = projection(geoCentroid(feature))
      return point && point[0] > 25 && point[0] < WIDTH - 25 && point[1] > 25 && point[1] < HEIGHT - 25
        ? [{ point, name: String(feature.properties?.name ?? ''), id: String(feature.properties?.id ?? '') }]
        : []
    })
    return { path, features, countryLabels }
  }, [entities, scope, world])

  if (error) return <ErrorState message="Die Karte konnte nicht geladen werden." onRetry={reload} />
  if (!world) return <div className="skeleton aspect-[12/7] w-full" />
  if (!features.length)
    return <ErrorState message="Für diese Aufgabe fehlen die Kartendaten. Bitte starte eine neue Runde." />

  return (
    <div className={`feature-map feature-map-${type}`} data-feature-map={type}>
      <MapViewport
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        interactive
        label={`${type === 'river' ? 'Flüsse' : type === 'lake' ? 'Seen' : 'Berggipfel'} auf der Karte`}
        hint={`${HINTS[type]} Zoomen mit +/−, Mausrad oder zwei Fingern.`}
      >
        {(gestureMoved) => (
          <>
            <rect width={WIDTH} height={HEIGHT} className="feature-map-ocean" />
            <g className="feature-map-countries" aria-hidden="true">
              {world.features.map((feature, i) => (
                <path
                  key={String(feature.properties?.id ?? i)}
                  d={path(feature) ?? undefined}
                  data-context-country={feature.properties?.id}
                />
              ))}
            </g>
            {countryLabels.length <= 22 && (
              <g className="feature-map-country-labels" aria-hidden="true">
                {countryLabels.map(({ point, name, id }) => (
                  <text key={id} x={point[0]} y={point[1]}>
                    {name}
                  </text>
                ))}
              </g>
            )}
            <g className="feature-map-hit-layer" aria-hidden="true">
              {features.map(({ entity, geometry }) => {
                const point = geometry.type === 'Point' ? path.centroid(geometry) : undefined
                const pick = () => {
                  if (!disabled && !gestureMoved()) onPick(entity.id)
                }
                return point ? (
                  <circle
                    key={entity.id}
                    data-feature-hit-id={entity.id}
                    className="feature-map-summit-hit"
                    cx={point[0]}
                    cy={point[1]}
                    r={15}
                    onClick={pick}
                  />
                ) : (
                  <path
                    key={entity.id}
                    data-feature-hit-id={entity.id}
                    d={path(geometry) ?? undefined}
                    className={`feature-map-hit feature-map-hit-${type}`}
                    onClick={pick}
                  />
                )
              })}
            </g>
            {features.map(({ entity, geometry }, index) => {
              const point = geometry.type === 'Point' ? path.centroid(geometry) : undefined
              const state = entity.id === correct ? 'is-correct' : entity.id === wrong ? 'is-wrong' : ''
              const label = correct ? entity.names.de : `${LABELS[type]} ${index + 1}`
              const pick = () => {
                if (!disabled && !gestureMoved()) onPick(entity.id)
              }
              return (
                <g
                  key={entity.id}
                  className={`feature-map-object ${state} ${disabled ? 'is-disabled' : ''}`}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-disabled={disabled}
                  aria-label={label}
                  data-id={entity.id}
                  data-feature-type={entity.type}
                  onClick={pick}
                  onKeyDown={(event) => {
                    if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      onPick(entity.id)
                    }
                  }}
                >
                  <title>{label}</title>
                  {point ? (
                    <>
                      <path className="feature-map-summit" d={`M${point[0]} ${point[1] - 9} l-9 16 h18 Z`} />
                      <path className="feature-map-snow" d={`M${point[0]} ${point[1] - 6} l-3 5 h6 Z`} />
                    </>
                  ) : (
                    <>
                      <path
                        d={path(geometry) ?? undefined}
                        className={`feature-map-shape feature-map-shape-${type}`}
                      />
                    </>
                  )}
                  {entity.id === correct &&
                    (() => {
                      const center = path.centroid(geometry)
                      return (
                        <text className="feature-map-answer-label" x={center[0]} y={center[1] - 16}>
                          {entity.names.de}
                        </text>
                      )
                    })()}
                </g>
              )
            })}
          </>
        )}
      </MapViewport>
      <div className="feature-map-legend">
        <span className={`feature-map-legend-symbol is-${type}`} aria-hidden />
        {type === 'river' ? 'Flussläufe' : type === 'lake' ? 'Seeumrisse' : 'Berggipfel'}
        <span className="feature-map-legend-detail">Ländergrenzen zur Orientierung</span>
      </div>
    </div>
  )
}
