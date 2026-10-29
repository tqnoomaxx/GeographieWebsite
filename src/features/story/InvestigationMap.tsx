import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
} from 'react'
import { geoDistance, geoMercator, geoPath } from 'd3-geo'
import { Crosshair, MapPin, Minus, Plus, RotateCcw, Ruler } from 'lucide-react'
import { numericValue, pointInBounds, type MapData } from './investigationProgress'
import type { Coordinates, Investigation } from './investigations'

function compassBearing(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180
  const y = Math.sin((b.lon - a.lon) * rad) * Math.cos(b.lat * rad)
  const x =
    Math.cos(a.lat * rad) * Math.sin(b.lat * rad) -
    Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lon - a.lon) * rad)
  return (Math.atan2(y, x) / rad + 360) % 360
}
export function InvestigationMap({
  file,
  data,
  pins,
  activeTarget,
  onPin,
  readOnly = false,
}: {
  file: Investigation
  data: MapData
  pins: Record<string, Coordinates>
  activeTarget: string
  onPin: (point: Coordinates) => void
  readOnly?: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null)
  const id = useId().replace(/:/g, '')
  const [width, setWidth] = useState(680)
  const height = width < 600 ? 410 : 540
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  const [tool, setTool] = useState<'pin' | 'measure'>('pin')
  const [names, setNames] = useState(true)
  const [water, setWater] = useState(true)
  const [measure, setMeasure] = useState<Coordinates[]>([])
  const [crosshair, setCrosshair] = useState({ x: 0.5, y: 0.5 })
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [coordinateError, setCoordinateError] = useState('')
  const activePin = pins[activeTarget]
  useEffect(() => {
    const observer = new ResizeObserver((entries) => setWidth(Math.max(260, entries[0].contentRect.width)))
    if (container.current) observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    setLatitude(activePin?.lat.toFixed(5) ?? '')
    setLongitude(activePin?.lon.toFixed(5) ?? '')
    setCoordinateError('')
  }, [activePin?.lat, activePin?.lon, activeTarget])
  const { projection, path, grid, scaleKm } = useMemo(() => {
    const [west, south, east, north] = file.bounds
    const projection = geoMercator().fitExtent(
      [
        [28, 35],
        [width - 28, height - 35],
      ],
      {
        type: 'LineString',
        coordinates: [
          [west, south],
          [east, north],
        ],
      },
    )
    const path = geoPath(projection)
    const grid: { d: string; label: string; x: number; y: number; vertical: boolean }[] = []
    for (let i = 1; i < 5; i++) {
      const lon = west + ((east - west) * i) / 5,
        lat = south + ((north - south) * i) / 5
      const p = projection([lon, north])!,
        q = projection([west, lat])!
      grid.push({
        d:
          path({
            type: 'LineString',
            coordinates: [
              [lon, south],
              [lon, north],
            ],
          }) ?? '',
        label: `${Math.abs(lon).toFixed(east - west < 1 ? 2 : 1)}°${lon < 0 ? 'W' : 'E'}`,
        x: p[0],
        y: height - 12,
        vertical: true,
      })
      grid.push({
        d:
          path({
            type: 'LineString',
            coordinates: [
              [west, lat],
              [east, lat],
            ],
          }) ?? '',
        label: `${Math.abs(lat).toFixed(north - south < 1 ? 2 : 1)}°${lat < 0 ? 'S' : 'N'}`,
        x: 7,
        y: q[1] - 5,
        vertical: false,
      })
    }
    const a = projection.invert!([width / 2 - 50, height / 2])!,
      b = projection.invert!([width / 2 + 50, height / 2])!
    return { projection, path, grid, scaleKm: geoDistance(a, b) * 6371 }
  }, [file, width, height])
  const projectedFeatures = useMemo(
    () =>
      data.features.map((feature, index) => ({
        key: `${feature.properties.kind}-${index}`,
        kind: feature.properties.kind,
        d: path(feature) ?? '',
      })),
    [data, path],
  )
  const measurePoints = measure.map((point) => projection([point.lon, point.lat])!)
  const activeLabel = file.targets.find((item) => item.id === activeTarget)?.label ?? 'Position'
  const pick = (point: Coordinates) => {
    if (!pointInBounds(point, file.bounds)) return
    if (tool === 'measure') setMeasure((current) => (current.length === 1 ? [current[0], point] : [point]))
    else if (!readOnly) onPin(point)
  }
  const fromScreen = (x: number, y: number) => {
    const p = projection.invert!([
      (x - view.x - width / 2) / view.zoom + width / 2,
      (y - view.y - height / 2) / view.zoom + height / 2,
    ])
    return p ? { lon: p[0], lat: p[1] } : null
  }
  const localPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * width) / rect.width,
      y: ((event.clientY - rect.top) * height) / rect.height,
    }
  }
  const zoom = (factor: number) =>
    setView((current) => ({ ...current, zoom: Math.max(1, Math.min(6, current.zoom * factor)) }))
  const pan = (x: number, y: number) =>
    setView((current) => ({
      ...current,
      x: Math.max(-width * current.zoom, Math.min(width * current.zoom, x)),
      y: Math.max(-height * current.zoom, Math.min(height * current.zoom, y)),
    }))
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('[data-map-place]')) return
    gesture.current = { x: event.clientX, y: event.clientY, panX: view.x, panY: view.y, moved: false }
  }
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = gesture.current
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) {
      start.moved = true
      if (view.zoom > 1) {
        event.currentTarget.setPointerCapture(event.pointerId)
        const rect = event.currentTarget.getBoundingClientRect()
        pan(
          start.panX + ((event.clientX - start.x) * width) / rect.width,
          start.panY + ((event.clientY - start.y) * height) / rect.height,
        )
      }
    }
  }
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = gesture.current
    gesture.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (!start || start.moved) return
    const p = localPoint(event),
      point = fromScreen(p.x, p.y)
    if (point) pick(point)
  }
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return
    const step = event.shiftKey ? 0.05 : 0.01
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      setCrosshair((p) => ({
        x: Math.max(
          0.03,
          Math.min(0.97, p.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)),
        ),
        y: Math.max(
          0.03,
          Math.min(0.97, p.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)),
        ),
      }))
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const point = fromScreen(crosshair.x * width, crosshair.y * height)
      if (point) pick(point)
    }
  }
  const submitCoordinates = (event: React.FormEvent) => {
    event.preventDefault()
    const point = { lat: numericValue(latitude), lon: numericValue(longitude) }
    if (!pointInBounds(point, file.bounds)) {
      setCoordinateError('Gib gültige Dezimalgrade innerhalb dieses Kartenausschnitts ein.')
      return
    }
    setTool('pin')
    setCoordinateError('')
    onPin(point)
  }
  const measureDistance =
    measure.length === 2
      ? geoDistance([measure[0].lon, measure[0].lat], [measure[1].lon, measure[1].lat]) * 6371
      : null
  return (
    <div className="investigation-map-sheet" ref={container}>
      <div className="investigation-map-tools">
        <div className="investigation-tool-group" aria-label="Kartenwerkzeug">
          {!readOnly && (
            <button type="button" aria-pressed={tool === 'pin'} onClick={() => setTool('pin')}>
              <MapPin aria-hidden />
              Markieren
            </button>
          )}
          <button type="button" aria-pressed={tool === 'measure'} onClick={() => setTool('measure')}>
            <Ruler aria-hidden />
            Lineal
          </button>
        </div>
        <div className="investigation-zoom-tools">
          <button
            type="button"
            aria-label="Karte vergrößern"
            onClick={() => zoom(1.5)}
            disabled={view.zoom >= 6}
          >
            <Plus aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Karte verkleinern"
            onClick={() => zoom(1 / 1.5)}
            disabled={view.zoom <= 1}
          >
            <Minus aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Kartenansicht zurücksetzen"
            onClick={() => setView({ zoom: 1, x: 0, y: 0 })}
          >
            <RotateCcw aria-hidden />
          </button>
        </div>
      </div>
      <div className={`investigation-map-drawing${view.zoom > 1 ? ' is-zoomed' : ''}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="group"
          aria-label={`Ermittlungskarte ${file.region}`}
          aria-describedby={`${id}-help`}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            gesture.current = null
          }}
          onKeyDown={onKeyDown}
        >
          <defs>
            <clipPath id={`${id}-clip`}>
              <rect width={width} height={height} />
            </clipPath>
          </defs>
          <rect className="case-map-water" width={width} height={height} />
          <g clipPath={`url(#${id}-clip)`}>
            <g
              transform={`translate(${view.x} ${view.y}) translate(${width / 2} ${height / 2}) scale(${view.zoom}) translate(${-width / 2} ${-height / 2})`}
            >
              {projectedFeatures
                .filter((f) => f.kind === 'land')
                .map((f) => (
                  <path key={f.key} d={f.d} className="case-map-land" />
                ))}
              {water &&
                projectedFeatures
                  .filter((f) => f.kind !== 'land')
                  .map((f) => <path key={f.key} d={f.d} className={`case-map-${f.kind}`} />)}
              {grid.map((line, i) => (
                <path key={i} d={line.d} className="case-map-grid" />
              ))}
              {file.id === 'ueber-dem-pass' && (
                <path
                  className="case-map-tropic"
                  d={
                    path({
                      type: 'LineString',
                      coordinates: [
                        [file.bounds[0], -23.44],
                        [file.bounds[2], -23.44],
                      ],
                    }) ?? ''
                  }
                />
              )}
              {names &&
                file.labels?.map((label) => {
                  const p = projection([label.lon, label.lat])!
                  return (
                    <text
                      key={label.name}
                      x={p[0]}
                      y={p[1]}
                      className="case-map-region-label"
                      textAnchor="middle"
                    >
                      {label.name}
                    </text>
                  )
                })}
              {file.places.map((place, i) => {
                const p = projection([place.lon, place.lat])!
                const alignment = p[0] > width * 0.72 ? 'end' : 'start',
                  offset = alignment === 'end' ? -9 : 9
                return (
                  <g
                    key={place.name}
                    data-map-place={place.name}
                    role="button"
                    tabIndex={readOnly ? -1 : 0}
                    aria-label={`${place.name} auf Karte markieren`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      pick(place)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        pick(place)
                      }
                    }}
                  >
                    <circle
                      cx={p[0]}
                      cy={p[1]}
                      r={width < 600 ? 18 : 14}
                      fill="transparent"
                      pointerEvents="none"
                    />
                    <circle className="case-map-city" cx={p[0]} cy={p[1]} r={3} />
                    {(names || file.id === 'flussprotokoll') && (
                      <text
                        className="case-map-place-label"
                        x={p[0] + offset}
                        y={p[1] + (file.id === 'letzte-koordinate' && i === 1 ? 18 : -7)}
                        textAnchor={alignment}
                      >
                        {place.name}
                        {place.note && (
                          <tspan x={p[0] + offset} dy="14">
                            {place.note}
                          </tspan>
                        )}
                      </text>
                    )}
                  </g>
                )
              })}
              {file.targets.length > 1 && (
                <path
                  className="case-map-route"
                  d={
                    path({
                      type: 'LineString',
                      coordinates: file.targets.flatMap((target) =>
                        pins[target.id] ? [[pins[target.id].lon, pins[target.id].lat]] : [],
                      ),
                    }) ?? ''
                  }
                />
              )}
              {file.targets.map((target, i) => {
                const pin = pins[target.id]
                if (!pin) return null
                const p = projection([pin.lon, pin.lat])!
                return (
                  <g
                    key={target.id}
                    className="case-map-pin"
                    data-case-pin={target.id}
                    aria-label={`${target.label} markiert`}
                  >
                    <circle cx={p[0]} cy={p[1]} r={12 / view.zoom + 3} />
                    <text
                      x={p[0]}
                      y={p[1] + 4 / view.zoom}
                      textAnchor="middle"
                      style={{ fontSize: `${12 / view.zoom}px` }}
                    >
                      {i + 1}
                    </text>
                  </g>
                )
              })}
              {measurePoints.length === 2 && (
                <line
                  className="case-map-measure"
                  x1={measurePoints[0][0]}
                  y1={measurePoints[0][1]}
                  x2={measurePoints[1][0]}
                  y2={measurePoints[1][1]}
                />
              )}
              {measurePoints.map((p, i) => (
                <circle key={i} className="case-map-measure-point" cx={p[0]} cy={p[1]} r={4 / view.zoom} />
              ))}
            </g>
          </g>
          {view.zoom === 1 &&
            grid.map((line, i) => (
              <text
                key={i}
                className="case-map-coordinate"
                x={line.x}
                y={line.y}
                textAnchor={line.vertical ? 'middle' : 'start'}
              >
                {line.label}
              </text>
            ))}
          <g className="case-map-north" transform={`translate(${width - 24} 27)`}>
            <path d="M0 -8 L-4 5 L0 2 L4 5 Z" />
            <text y="22" textAnchor="middle">
              N
            </text>
          </g>
          <g className="case-map-scale" transform={`translate(${width - 126} ${height - 32})`}>
            <path d="M0 -4V0H100V-4" />
            <text x="50" y="-8" textAnchor="middle">
              {(scaleKm / view.zoom).toLocaleString('de-DE', { maximumFractionDigits: scaleKm < 5 ? 1 : 0 })}{' '}
              km
            </text>
          </g>
          <g
            className="case-map-crosshair"
            transform={`translate(${crosshair.x * width} ${crosshair.y * height})`}
            aria-hidden
          >
            <path d="M-10 0H10M0 -10V10" />
            <circle r="5" />
          </g>
        </svg>
        {tool === 'measure' && (
          <div className="map-measure-reading" role="status">
            {measureDistance !== null ? (
              <>
                <strong>{measureDistance.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km</strong>
                <span>{Math.round(compassBearing(measure[0], measure[1]))}° ab Nord · Luftlinie</span>
              </>
            ) : measure.length === 1 ? (
              'Jetzt den zweiten Punkt antippen.'
            ) : (
              'Zwei Punkte für Entfernung und Richtung markieren.'
            )}
            {measure.length > 0 && (
              <button type="button" onClick={() => setMeasure([])}>
                Löschen
              </button>
            )}
          </div>
        )}
      </div>
      <div className="investigation-map-layers">
        <label>
          <input type="checkbox" checked={names} onChange={(e) => setNames(e.target.checked)} />
          Ortsnamen
        </label>
        <label>
          <input type="checkbox" checked={water} onChange={(e) => setWater(e.target.checked)} />
          Gewässer
        </label>
        <span>{Math.round(view.zoom * 100)} %</span>
      </div>
      <p id={`${id}-help`} className="investigation-map-help">
        <Crosshair aria-hidden />
        {tool === 'measure'
          ? 'Zwei Punkte antippen. Erneutes Tippen beginnt eine neue Messung.'
          : readOnly
            ? 'Deine gesicherten Markierungen.'
            : `Karte antippen: ${activeLabel}. Mit + vergrößern, dann ziehen.`}
      </p>
      {!readOnly && (
        <details className="investigation-coordinates">
          <summary>Koordinaten eingeben / Tastaturhilfe</summary>
          <p>
            Pfeiltasten bewegen das Fadenkreuz, Umschalt beschleunigt. Enter setzt die Markierung. Alternativ
            Dezimalgrade eingeben (Süd und West negativ).
          </p>
          <form onSubmit={submitCoordinates}>
            <label>
              Breitengrad
              <input
                aria-label="Breitengrad"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="z. B. 41,8"
              />
            </label>
            <label>
              Längengrad
              <input
                aria-label="Längengrad"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="z. B. 44,7"
              />
            </label>
            <button type="submit">Markierung setzen</button>
          </form>
          {coordinateError && <p role="alert">{coordinateError}</p>}
        </details>
      )}
      <p className="investigation-map-attribution">
        Geodaten:{' '}
        <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">
          Natural Earth
        </a>
        {file.map === 'caucasus' && (
          <>
            {' '}
            ·{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              © OpenStreetMap-Mitwirkende · ODbL
            </a>
          </>
        )}
        {file.targets.length > 1 && ' · Verbindungslinien zeigen nur die Reihenfolge.'}
      </p>
    </div>
  )
}
