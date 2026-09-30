import { useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent as ReactWheelEvent } from 'react'
import { geoNaturalEarth1, geoPath, geoMercator, geoCentroid } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import { loadOutline, loadRegionMap, loadWorld, type RegionMap } from '@/services/data/dataService'
import { Minus, Plus, RotateCcw } from 'lucide-react'

type ViewState = { zoom: number; x: number; y: number }
type Point = { x: number; y: number }

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Gemeinsame Kartenfläche mit Mausrad-, Button-, Drag- und Pinch-Zoom. */
function MapViewport({ viewBox, width, height, interactive, transparent = false, label, children }: {
  viewBox: string
  width: number
  height: number
  interactive: boolean
  transparent?: boolean
  label: string
  children: (gestureMoved: () => boolean) => ReactNode
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const moved = useRef(false)
  const stateRef = useRef<ViewState>({ zoom: 1, x: 0, y: 0 })
  const gesture = useRef<{ points: Map<number, Point>; view: ViewState; distance: number; center: Point }>({ points: new Map(), view: stateRef.current, distance: 0, center: { x: 0, y: 0 } })
  const [view, setView] = useState<ViewState>(stateRef.current)
  const hintId = useId()

  const applyView = useCallback((zoom: number, x: number, y: number) => {
    const nextZoom = Math.max(1, Math.min(6, zoom))
    const maxX = width * (nextZoom - 1) / 2
    const maxY = height * (nextZoom - 1) / 2
    const next = {
      zoom: nextZoom,
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    }
    stateRef.current = next
    setView(next)
  }, [height, width])

  const reset = useCallback(() => applyView(1, 0, 0), [applyView])
  useEffect(() => reset(), [viewBox, reset])

  const rebaseGesture = useCallback(() => {
    const points = new Map(pointers.current)
    const pair = [...points.values()]
    gesture.current = {
      points,
      view: stateRef.current,
      distance: pair.length > 1 ? distance(pair[0], pair[1]) : 0,
      center: pair.length > 1 ? midpoint(pair[0], pair[1]) : pair[0] ?? { x: 0, y: 0 },
    }
  }, [])

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return
    if (pointers.current.size === 0) moved.current = false
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    rebaseGesture()
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive || !pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const current = [...pointers.current.entries()]
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const unitsX = width / rect.width
    const unitsY = height / rect.height
    if (current.length === 1) {
      const [id, point] = current[0]
      const start = gesture.current.points.get(id)
      if (!start) return
      const dx = point.x - start.x
      const dy = point.y - start.y
      if (Math.hypot(dx, dy) > 5) {
        moved.current = true
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
      }
      applyView(gesture.current.view.zoom, gesture.current.view.x + dx * unitsX, gesture.current.view.y + dy * unitsY)
      return
    }
    const first = current[0][1]
    const second = current[1][1]
    const currentDistance = distance(first, second)
    const center = midpoint(first, second)
    if (Math.abs(currentDistance - gesture.current.distance) > 3 || distance(center, gesture.current.center) > 4) {
      moved.current = true
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId)
    }
    const zoom = gesture.current.distance ? gesture.current.view.zoom * currentDistance / gesture.current.distance : gesture.current.view.zoom
    applyView(zoom, gesture.current.view.x + (center.x - gesture.current.center.x) * unitsX, gesture.current.view.y + (center.y - gesture.current.center.y) * unitsY)
  }

  const finishPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    rebaseGesture()
  }

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    if (!interactive) return
    event.preventDefault()
    applyView(stateRef.current.zoom * (event.deltaY < 0 ? 1.22 : 1 / 1.22), stateRef.current.x, stateRef.current.y)
  }

  const centerX = width / 2
  const centerY = height / 2
  const transform = `translate(${view.x} ${view.y}) translate(${centerX} ${centerY}) scale(${view.zoom}) translate(${-centerX} ${-centerY})`

  return (
    <div className={`map-viewport ${interactive ? 'is-interactive' : ''} ${transparent ? 'is-transparent' : ''}`} data-map-zoom={view.zoom.toFixed(2)}>
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="map-canvas w-full select-none"
        role={interactive ? 'group' : 'img'}
        aria-label={label}
        aria-describedby={interactive ? hintId : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onWheel={onWheel}
      >
        <g transform={transform}>{children(() => moved.current)}</g>
      </svg>
      {interactive && (
        <>
          <div className="map-controls" aria-label="Kartensteuerung">
            <button type="button" aria-label="Hineinzoomen" onClick={() => applyView(view.zoom * 1.5, view.x, view.y)}><Plus aria-hidden /></button>
            <span className="map-zoom-value" aria-live="polite">{Math.round(view.zoom * 100)}%</span>
            <button type="button" aria-label="Herauszoomen" disabled={view.zoom <= 1} onClick={() => applyView(view.zoom / 1.5, view.x, view.y)}><Minus aria-hidden /></button>
            <button type="button" aria-label="Karte zurücksetzen" disabled={view.zoom === 1 && view.x === 0 && view.y === 0} onClick={reset}><RotateCcw aria-hidden /></button>
          </div>
          <p id={hintId} className="map-gesture-hint">Scrollen oder +/− zum Zoomen · ziehen zum Verschieben · Gebiet antippen</p>
        </>
      )}
    </div>
  )
}

/** Weltkarte als SVG mit anklickbaren Ländern (Natural Earth 110m). */
export function WorldMap({
  onPick,
  highlight,
  correct,
  wrong,
  disabled,
  focus,
  decorative,
  marker,
}: {
  decorative?: boolean
  onPick?: (id: string) => void
  highlight?: string[]
  correct?: string
  wrong?: string
  disabled?: boolean
  focus?: string
  marker?: { lat: number; lon: number; label?: string }
}) {
  const [world, setWorld] = useState<GeoJSON.FeatureCollection | null>(null)
  useEffect(() => {
    void loadWorld().then(setWorld)
  }, [])
  const width = 960
  const height = 500
  const { path, features, markerPoint } = useMemo(() => {
    if (!world) return { path: null, features: [], markerPoint: null }
    const projection = geoNaturalEarth1().fitSize([width, height], world as GeoPermissibleObjects)
    if (focus) {
      const f = world.features.find((x) => x.properties?.id === focus)
      if (f) {
        const [cx, cy] = geoCentroid(f as GeoPermissibleObjects)
        projection.rotate([-cx, 0]).fitSize([width, height], world as GeoPermissibleObjects)
        void cy
      }
    }
    return { path: geoPath(projection), features: world.features, markerPoint: marker ? projection([marker.lon, marker.lat]) : null }
  }, [world, focus, marker])
  if (!world || !path) return <div className="skeleton aspect-[1.92] w-full" />
  return (
    <MapViewport viewBox={`0 0 ${width} ${height}`} width={width} height={height} interactive={!!onPick} transparent={decorative} label="Weltkarte">
      {(gestureMoved) => <>
      {!decorative && <rect width={width} height={height} className="fill-card-2/60" rx={16} />}
      {features.map((f, i) => {
        const id = f.properties?.id as string
        const isCorrect = id === correct
        const isWrong = id === wrong
        const isHi = highlight?.includes(id)
        return (
          <path
            key={id ?? i}
            d={path(f as GeoPermissibleObjects) ?? undefined}
            data-id={id}
            className={`stroke-bg stroke-[0.5] transition-colors ${
              isCorrect ? 'fill-ok' : isWrong ? 'fill-bad' : isHi ? 'fill-coral' : decorative ? 'fill-[#f4efe3]' : 'fill-accent/25 hover:fill-accent/60'
            } ${onPick && !disabled ? 'cursor-pointer' : ''}`}
            onClick={() => !gestureMoved() && onPick && !disabled && onPick(id)}
            role={onPick ? 'button' : undefined}
            aria-label={f.properties?.name as string}
            tabIndex={onPick && !disabled ? 0 : -1}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onPick && !disabled) onPick(id)
            }}
          />
        )
      })}
      {markerPoint && (
        <g aria-label={marker?.label ?? 'Position'}>
          <circle cx={markerPoint[0]} cy={markerPoint[1]} r="18" className="fill-coral/20" />
          <circle cx={markerPoint[0]} cy={markerPoint[1]} r="8" className="fill-coral stroke-white stroke-[4]" />
        </g>
      )}
      </>}
    </MapViewport>
  )
}

/** Länderumriss als Silhouette (Natural Earth 50m). */
export function Outline({ iso2, className = '' }: { iso2: string; className?: string }) {
  const [geom, setGeom] = useState<GeoJSON.Geometry | null>(null)
  useEffect(() => {
    setGeom(null)
    loadOutline(iso2).then(setGeom).catch(() => setGeom(null))
  }, [iso2])
  const d = useMemo(() => {
    if (!geom) return null
    const projection = geoMercator().fitExtent([[8, 8], [392, 292]], geom as GeoPermissibleObjects)
    return geoPath(projection)(geom as GeoPermissibleObjects)
  }, [geom])
  if (!d) return <div className={`skeleton aspect-[4/3] ${className}`} />
  return (
    <svg viewBox="0 0 400 300" className={`w-full ${className}`} role="img" aria-label="Umriss">
      <path d={d} className="fill-ink stroke-none" />
    </svg>
  )
}

/** Regionskarte aus den Legacy-Geometrien (geoBoundaries/Natural Earth), anklickbar. */
export function RegionMapView({
  iso2,
  onPick,
  highlight,
  correct,
  wrong,
  disabled,
}: {
  iso2: string
  onPick?: (regionId: string) => void
  highlight?: string
  correct?: string
  wrong?: string
  disabled?: boolean
}) {
  const [map, setMap] = useState<RegionMap | null | undefined>(undefined)
  useEffect(() => {
    setMap(undefined)
    void loadRegionMap(iso2).then(setMap)
  }, [iso2])
  if (map === undefined) return <div className="skeleton aspect-[3/2] w-full" />
  if (!map) return <div className="card p-6 text-center text-ink-2">Keine Karte verfügbar.</div>
  const toId = (flagId: string) => flagId.replace('region-', 'region:').replace('country-', 'country:')
  const parts = map.viewBox.trim().split(/[ ,]+/).map(Number)
  const width = Number.isFinite(parts[2]) && parts[2] > 0 ? parts[2] : 960
  const height = Number.isFinite(parts[3]) && parts[3] > 0 ? parts[3] : 640
  return (
    <MapViewport viewBox={map.viewBox} width={width} height={height} interactive={!!onPick} label={map.label}>
      {(gestureMoved) => <>
      {map.shapes.map((s) => {
        const id = toId(s.flagId)
        const isCorrect = id === correct
        const isWrong = id === wrong
        const isHi = id === highlight
        return (
          <path
            key={s.flagId}
            d={s.d}
            data-id={id}
            className={`stroke-bg stroke-[0.6] transition-colors ${
              isCorrect ? 'fill-ok' : isWrong ? 'fill-bad' : isHi ? 'fill-accent' : 'fill-accent/25 hover:fill-accent/60'
            } ${onPick && !disabled ? 'cursor-pointer' : ''}`}
            onClick={() => !gestureMoved() && onPick && !disabled && onPick(id)}
            role={onPick ? 'button' : undefined}
            aria-label={s.name}
            tabIndex={onPick && !disabled ? 0 : -1}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onPick && !disabled) onPick(id)
            }}
          />
        )
      })}
      </>}
    </MapViewport>
  )
}
