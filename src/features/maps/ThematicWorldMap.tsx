import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import type { Country } from '@/domain/types'
import { useAsync } from '@/app/hooks'
import { loadWorld } from '@/services/data/dataService'
import { ErrorState, LoadingState } from '@/ui'
import { MapViewport } from '@/ui/maps'
import { themeGroups, themeValue, UNKNOWN_COLOR, type CountryMapFacts, type MapTheme } from './mapThemes'

const WIDTH = 1100,
  HEIGHT = 570
export function ThematicWorldMap({
  countries,
  facts,
  theme,
  visible,
  selected,
  labels,
  onSelect,
}: {
  countries: Country[]
  facts: CountryMapFacts
  theme: MapTheme
  visible: Set<string>
  selected?: string
  labels: boolean
  onSelect: (id: string) => void
}) {
  const world = useAsync(loadWorld, [])
  const container = useRef<HTMLDivElement>(null)
  const [displayWidth, setDisplayWidth] = useState(WIDTH)
  useEffect(() => {
    if (!container.current) return
    const observer = new ResizeObserver(([entry]) => setDisplayWidth(Math.max(1, entry.contentRect.width)))
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [world.data])
  const scale = displayWidth / WIDTH
  const drawing = useMemo(() => {
    if (!world.data) return undefined
    const projection = geoNaturalEarth1().fitExtent(
      [
        [18, 20],
        [WIDTH - 18, HEIGHT - 20],
      ],
      { type: 'Sphere' },
    )
    const path = geoPath(projection)
    const shapes = new Map(
      world.data.features.map((feature) => [String(feature.properties?.id), path(feature) ?? '']),
    )
    const groups = new Map(themeGroups(theme).map((group) => [group.id, group.color]))
    const entries = countries.map((country) => {
      const value = themeValue(country, facts, theme)
      return {
        country,
        value,
        shape: shapes.get(country.id),
        point: country.location ? projection([country.location.lon, country.location.lat]) : undefined,
        color: groups.get(value.group) ?? UNKNOWN_COLOR,
      }
    })
    return {
      entries,
      base: world.data.features.map((feature) => path(feature) ?? ''),
      sphere: path({ type: 'Sphere' }) ?? '',
    }
  }, [world.data, countries, facts, theme])
  if (world.error)
    return <ErrorState message="Die Weltkarte konnte nicht geladen werden." onRetry={world.reload} />
  if (!drawing) return <LoadingState message="Weltkarte wird geladen …" />
  return (
    <div ref={container}>
      <MapViewport
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width={WIDTH}
        height={HEIGHT}
        interactive
        label={`Weltkarte: ${theme === 'calling' ? 'Telefonvorwahlen' : theme === 'driving' ? 'Links- und Rechtsverkehr' : theme === 'domains' ? 'Internet-Endungen' : 'Währungen'}`}
        hint="+ / − oder Scrollen zum Zoomen · ziehen zum Verschieben · Land antippen"
      >
        {(gestureMoved, view) => {
          const used: [number, number, number][] = []
          const shownLabels = labels
            ? [...drawing.entries]
                .sort(
                  (a, b) =>
                    Number(b.country.id === selected) - Number(a.country.id === selected) ||
                    (b.country.attributes.area_km2 ?? 0) - (a.country.attributes.area_km2 ?? 0),
                )
                .filter(({ country, point, value }) => {
                  if (!visible.has(country.id) || !point || !value.compact) return false
                  const halfWidth = Math.max(8, value.compact.length * 3.2) / (view.zoom * scale)
                  if (
                    used.some(
                      ([x, y, w]) =>
                        Math.abs(x - point[0]) < w + halfWidth + 3 / (view.zoom * scale) &&
                        Math.abs(y - point[1]) < 15 / (view.zoom * scale),
                    )
                  )
                    return false
                  used.push([point[0], point[1], halfWidth])
                  return true
                })
            : []
          return (
            <>
              <path d={drawing.sphere} className="atlas-ocean" />
              <g aria-hidden>
                {drawing.base.map((shape, i) => (
                  <path
                    key={i}
                    d={shape}
                    fill={UNKNOWN_COLOR}
                    stroke="var(--card)"
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              {drawing.entries.map(({ country, value, shape, point, color }) => {
                const active = selected === country.id
                const pick = () => {
                  if (!gestureMoved()) onSelect(country.id)
                }
                const keydown = (event: KeyboardEvent<SVGGElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(country.id)
                  }
                }
                return (
                  <g
                    key={country.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${country.names.de}: ${value.label || 'Keine Angabe'}`}
                    aria-pressed={active}
                    data-map-country={country.id}
                    className={`atlas-country${active ? ' is-selected' : ''}${visible.has(country.id) ? '' : ' is-dimmed'}`}
                    onClick={pick}
                    onKeyDown={keydown}
                  >
                    <title>
                      {country.names.de} · {value.label || 'Keine Angabe'}
                    </title>
                    {shape ? (
                      <path d={shape} fill={color} vectorEffect="non-scaling-stroke" />
                    ) : point ? (
                      <circle
                        cx={point[0]}
                        cy={point[1]}
                        r={3.2 / (view.zoom * scale)}
                        fill={color}
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : null}
                  </g>
                )
              })}
              {shownLabels.map(({ country, point, value }) => (
                <text
                  key={country.id}
                  x={point![0]}
                  y={point![1]}
                  className="atlas-map-label"
                  fontSize={11 / (view.zoom * scale)}
                  strokeWidth={3 / (view.zoom * scale)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                  aria-hidden
                >
                  {value.compact}
                </text>
              ))}
              {selected &&
                drawing.entries
                  .filter(({ country, point }) => country.id === selected && point)
                  .map(({ country, point }) => (
                    <circle
                      key={country.id}
                      className="atlas-selected-ring"
                      cx={point![0]}
                      cy={point![1]}
                      r={9 / (view.zoom * scale)}
                      strokeWidth={2 / (view.zoom * scale)}
                      pointerEvents="none"
                    />
                  ))}
            </>
          )
        }}
      </MapViewport>
    </div>
  )
}
