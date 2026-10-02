import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import type { Country } from '@/domain/types'
import { loadWorld } from '@/services/data/dataService'

type Rotation = [number, number]
type DragState = {
  pointerId: number
  x: number
  y: number
  rotation: Rotation
}

const WIDTH = 620
const HEIGHT = 620
const CENTER: [number, number] = [WIDTH / 2, HEIGHT / 2]
const SCALE = 278
const GRATICULE = geoGraticule10()

function clampLatitude(value: number) {
  return Math.max(-72, Math.min(72, value))
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

export function InteractiveGlobe({
  countries,
  selectedId,
  onSelect,
}: {
  countries: Country[]
  selectedId?: string
  onSelect: (countryId: string) => void
}) {
  const [world, setWorld] = useState<GeoJSON.FeatureCollection | null>(null)
  const [rotation, setRotation] = useState<Rotation>([-12, -18])
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [inView, setInView] = useState(true)
  const [countryChoice, setCountryChoice] = useState(selectedId ?? '')
  const rotationRef = useRef(rotation)
  const dragRef = useRef<DragState | null>(null)
  const movedRef = useRef(false)
  const pauseUntilRef = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const renderFrameRef = useRef<number | null>(null)
  const pendingRotationRef = useRef<Rotation | null>(null)
  const selectId = useId()
  const statusId = useId()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    void loadWorld().then((data) => {
      if (!cancelled) setWorld(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => setCountryChoice(selectedId ?? ''), [selectedId])

  useEffect(() => {
    const node = svgRef.current
    if (!node || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), {
      rootMargin: '100px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [world])

  const syncSpaceOrientation = useCallback((next: Rotation) => {
    const root = rootRef.current
    if (!root) return
    const longitude = (next[0] * Math.PI) / 180
    const latitude = (next[1] * Math.PI) / 180
    const x = Math.sin(longitude) * 26
    const y = Math.sin(latitude) * 18
    root.style.setProperty('--space-x', `${x.toFixed(2)}px`)
    root.style.setProperty('--space-y', `${y.toFixed(2)}px`)
    root.style.setProperty('--space-x-reverse', `${(-x * 0.58).toFixed(2)}px`)
    root.style.setProperty('--space-y-reverse', `${(-y * 0.58).toFixed(2)}px`)
    root.style.setProperty('--space-x-soft', `${(x * 0.24).toFixed(2)}px`)
    root.style.setProperty('--space-y-soft', `${(y * 0.24).toFixed(2)}px`)
  }, [])

  const updateRotation = useCallback((next: Rotation) => {
    rotationRef.current = next
    pendingRotationRef.current = next
    if (renderFrameRef.current !== null) return
    renderFrameRef.current = requestAnimationFrame(() => {
      renderFrameRef.current = null
      const pending = pendingRotationRef.current
      pendingRotationRef.current = null
      if (!pending) return
      syncSpaceOrientation(pending)
      setRotation(pending)
    })
  }, [syncSpaceOrientation])

  useEffect(() => {
    syncSpaceOrientation(rotationRef.current)
    return () => {
      if (renderFrameRef.current !== null) cancelAnimationFrame(renderFrameRef.current)
    }
  }, [syncSpaceOrientation])

  useEffect(() => {
    if (reducedMotion) return
    let frame = 0
    let previous = performance.now()
    let rendered = previous
    const tick = (now: number) => {
      const paused = !inView || hovered || focused || dragging || document.hidden || now < pauseUntilRef.current
      if (!paused && now - rendered >= 40) {
        const elapsed = Math.min(80, now - previous)
        const current = rotationRef.current
        updateRotation([current[0] + elapsed * 0.0024, current[1]])
        rendered = now
      }
      previous = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [dragging, focused, hovered, inView, reducedMotion, updateRotation])

  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate(CENTER)
        .scale(SCALE)
        .clipAngle(90)
        .precision(0.55)
        .rotate(rotation),
    [rotation],
  )
  const path = useMemo(() => geoPath(projection), [projection])
  const features = world?.features ?? []
  const spherePath = path({ type: 'Sphere' } as unknown as GeoPermissibleObjects) ?? undefined
  const graticulePath = path(GRATICULE as GeoPermissibleObjects) ?? undefined
  const countriesById = useMemo(
    () => new Map(countries.map((country) => [country.id, country])),
    [countries],
  )
  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.names.de.localeCompare(b.names.de, 'de')),
    [countries],
  )
  const selectedName = selectedId ? countriesById.get(selectedId)?.names.de : undefined

  const pauseAfterInteraction = () => {
    pauseUntilRef.current = performance.now() + 3200
  }

  const handleSelect = (countryId: string) => {
    const country = countriesById.get(countryId)
    if (!country) return
    pauseAfterInteraction()
    if (country.location) {
      updateRotation([-country.location.lon, -country.location.lat])
    }
    setCountryChoice(countryId)
    onSelect(countryId)
  }

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    movedRef.current = false
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotation: rotationRef.current,
    }
    setDragging(true)
    pauseAfterInteraction()
  }

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const start = dragRef.current
    if (!start || start.pointerId !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.hypot(dx, dy) > 5) {
      movedRef.current = true
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId)
      }
    }
    if (!movedRef.current) return
    updateRotation([
      start.rotation[0] + dx * 0.24,
      clampLatitude(start.rotation[1] - dy * 0.2),
    ])
  }

  const finishPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
    pauseAfterInteraction()
    window.setTimeout(() => {
      movedRef.current = false
    }, 0)
  }

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const current = rotationRef.current
    const step = event.shiftKey ? 18 : 8
    let next: Rotation | undefined
    if (event.key === 'ArrowLeft') next = [current[0] - step, current[1]]
    if (event.key === 'ArrowRight') next = [current[0] + step, current[1]]
    if (event.key === 'ArrowUp') next = [current[0], clampLatitude(current[1] + step)]
    if (event.key === 'ArrowDown') next = [current[0], clampLatitude(current[1] - step)]
    if (!next) return
    event.preventDefault()
    pauseAfterInteraction()
    updateRotation(next)
  }

  return (
    <div ref={rootRef} className={`interactive-globe ${dragging ? 'is-dragging' : ''}`}>
      <div className="globe-space-scene" aria-hidden="true">
        <span className="space-nebula space-nebula-one" />
        <span className="space-nebula space-nebula-two" />
        <span className="space-star-layer space-star-layer-far" />
        <span className="space-star-layer space-star-layer-near" />
        <span className="solar-storm" />
        <span className="space-planet space-planet-ringed" />
        <span className="space-planet space-planet-rust" />
        <span className="space-planet space-planet-ice" />
        <span className="space-moon" />
        <span className="spacecraft-flight">
          <span className="spacecraft-trail" />
          <svg className="spacecraft" viewBox="0 0 190 82" focusable="false">
            <defs>
              <linearGradient id="spacecraft-hull" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#efffff" />
                <stop offset=".42" stopColor="#7eb8cb" />
                <stop offset="1" stopColor="#273d65" />
              </linearGradient>
              <linearGradient id="spacecraft-glass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#dfffff" />
                <stop offset=".48" stopColor="#55bad6" />
                <stop offset="1" stopColor="#182a61" />
              </linearGradient>
            </defs>
            <path className="spacecraft-wing spacecraft-wing-back" d="M76 47 118 76 57 58Z" />
            <path className="spacecraft-wing" d="M79 31 122 7 63 26Z" />
            <path className="spacecraft-hull" d="M21 42C49 20 112 15 158 31L181 41 158 51C111 67 50 62 21 42Z" />
            <path className="spacecraft-cockpit" d="M75 27C88 14 113 15 128 28L132 34 71 35Z" />
            <path className="spacecraft-keel" d="M58 50C88 56 127 54 159 43" />
            <circle className="spacecraft-light" cx="144" cy="34" r="2.5" />
            <circle className="spacecraft-engine" cx="24" cy="36" r="3.5" />
            <circle className="spacecraft-engine" cx="20" cy="43" r="4.2" />
            <circle className="spacecraft-engine" cx="25" cy="50" r="3.2" />
          </svg>
        </span>
        <span className="space-shooting-star space-shooting-star-one" />
        <span className="space-shooting-star space-shooting-star-two" />
        <span className="space-shooting-star space-shooting-star-three" />
      </div>
      <div className={`globe-stage ${dragging ? 'is-dragging' : ''}`}>
        {!world ? (
          <div className="globe-loading skeleton" aria-label="Weltkugel wird geladen" />
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="globe-svg"
            role="application"
            tabIndex={0}
            aria-label="Interaktive Weltkugel. Mit den Pfeiltasten drehen oder ein Land in der Auswahl wählen."
            aria-describedby={statusId}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            onKeyDown={onKeyDown}
          >
            <defs>
              <radialGradient id="globe-ocean" cx="32%" cy="25%" r="78%">
                <stop offset="0" className="globe-ocean-light" />
                <stop offset=".52" className="globe-ocean-mid" />
                <stop offset="1" className="globe-ocean-deep" />
              </radialGradient>
              <radialGradient id="globe-shade" cx="28%" cy="20%" r="82%">
                <stop offset="48%" stopColor="transparent" />
                <stop offset="100%" className="globe-shadow-stop" />
              </radialGradient>
              <radialGradient id="globe-specular" cx="27%" cy="19%" r="68%">
                <stop offset="0" stopColor="#f3ffff" stopOpacity=".38" />
                <stop offset="24%" stopColor="#baf9ff" stopOpacity=".11" />
                <stop offset="58%" stopColor="#69d9e5" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="globe-terminator" x1="8%" y1="2%" x2="92%" y2="98%">
                <stop offset="0" stopColor="#efffff" stopOpacity=".08" />
                <stop offset="52%" stopColor="#071d35" stopOpacity="0" />
                <stop offset="100%" stopColor="#01050d" stopOpacity=".43" />
              </linearGradient>
              <filter id="globe-shadow" x="-35%" y="-35%" width="170%" height="180%">
                <feDropShadow dx="10" dy="20" stdDeviation="22" floodColor="#020912" floodOpacity=".48" />
              </filter>
              <clipPath id="globe-clip">
                <path d={spherePath} />
              </clipPath>
            </defs>
            <path d={spherePath} className="globe-atmosphere" filter="url(#globe-shadow)" />
            <path d={spherePath} fill="url(#globe-ocean)" className="globe-ocean" />
            <g clipPath="url(#globe-clip)" aria-hidden="true">
              <path d={graticulePath} className="globe-graticule" />
              {features.map((feature, index) => {
                const id = feature.properties?.id as string | undefined
                const countryPath = path(feature as GeoPermissibleObjects) ?? undefined
                const selectable = !!id && countriesById.has(id)
                return (
                  <path
                    key={id ?? index}
                    d={countryPath}
                    data-country-id={id}
                    className={`globe-country ${selectedId === id ? 'is-selected' : ''} ${selectable ? 'is-selectable' : ''}`}
                    onClick={() => {
                      if (!movedRef.current && id) handleSelect(id)
                    }}
                  />
                )
              })}
              <path d={spherePath} fill="url(#globe-shade)" className="globe-shading" />
              <path d={spherePath} fill="url(#globe-terminator)" className="globe-terminator" />
              <path d={spherePath} fill="url(#globe-specular)" className="globe-specular" />
            </g>
            <path d={spherePath} className="globe-rim" />
          </svg>
        )}
        <span className="globe-drag-hint" aria-hidden>{dragging ? 'Welt wird gedreht' : 'Ziehen zum Drehen'}</span>
      </div>

      <div className="globe-country-picker">
        <label htmlFor={selectId}>Land suchen oder auswählen</label>
        <div>
          <select
            id={selectId}
            value={countryChoice}
            onChange={(event) => handleSelect(event.target.value)}
          >
            <option value="" disabled>Land auswählen …</option>
            {sortedCountries.map((country) => (
              <option key={country.id} value={country.id}>{country.names.de}</option>
            ))}
          </select>
        </div>
      </div>
      <p id={statusId} className="sr-only" aria-live="polite">
        {selectedName ? `${selectedName} ausgewählt. Die Quiz-Auswahl ist geöffnet.` : 'Noch kein Land ausgewählt.'}
      </p>
    </div>
  )
}
