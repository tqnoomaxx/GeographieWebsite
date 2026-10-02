import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PLAY_QUIZZES, type QuizDef } from '@/config/quizzes'
import type { CategoryId } from '@/engine/types'
import { CategoryIcon, Icons } from '@/ui/icons'

type SceneId = CategoryId | 'daily'
type StationLayout = { x: number; y: number; side?: 'left' | 'right' }

const STATION_LAYOUT: Partial<Record<CategoryId, StationLayout>> = {
  flags: { x: 9.5, y: 56 },
  countries: { x: 19.5, y: 34 },
  capitals: { x: 36, y: 31 },
  languages: { x: 29.5, y: 67 },
  cities: { x: 49, y: 39 },
  mixed: { x: 51, y: 65 },
  landmarks: { x: 65, y: 32 },
  images: { x: 70, y: 68 },
  water: { x: 79, y: 50 },
  nature: { x: 85, y: 22 },
  license_plates: { x: 85, y: 72 },
}

const DAILY_LAYOUT: StationLayout = { x: 91.5, y: 42, side: 'right' }

function stationLayout(quiz: QuizDef) {
  const layout = STATION_LAYOUT[quiz.id]
  if (!layout) throw new Error(`Keine Landschaftsposition für sichtbares Quiz: ${quiz.id}`)
  return layout
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

function LandscapeArtwork() {
  return (
    <svg className="quiz-landscape-art" viewBox="0 0 1600 760" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="quiz-island-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="quiz-island-top-light" />
          <stop offset=".56" className="quiz-island-top-mid" />
          <stop offset="1" className="quiz-island-top-dark" />
        </linearGradient>
        <linearGradient id="quiz-island-cliff" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="quiz-island-cliff-light" />
          <stop offset="1" className="quiz-island-cliff-dark" />
        </linearGradient>
        <linearGradient id="quiz-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="quiz-water-light" />
          <stop offset="1" className="quiz-water-dark" />
        </linearGradient>
        <radialGradient id="quiz-island-glow">
          <stop offset="0" className="quiz-island-glow-core" />
          <stop offset="1" className="quiz-island-glow-edge" />
        </radialGradient>
      </defs>

      <ellipse className="quiz-scene-glow" cx="800" cy="485" rx="690" ry="230" fill="url(#quiz-island-glow)" />
      <g className="quiz-scene-clouds quiz-landscape-animated">
        <path className="quiz-scene-cloud quiz-scene-cloud-a" d="M86 190c20-42 79-43 101-8 44-26 102 6 94 52H61c-9-25 3-39 25-44Z" />
        <path className="quiz-scene-cloud quiz-scene-cloud-b" d="M1160 102c18-35 67-35 87-5 38-22 88 5 81 44h-190c-7-21 4-34 22-39Z" />
      </g>

      <path className="quiz-scene-island-cliff" fill="url(#quiz-island-cliff)" d="M70 388C174 281 379 215 604 221c196-76 451-50 594 45 164-5 284 83 303 176-34 92-155 151-311 166-168 16-211 126-391 119-172-7-210-104-374-119C233 591 93 512 70 388Z" />
      <path className="quiz-scene-island-top" fill="url(#quiz-island-top)" d="M70 382C182 278 379 210 604 216c198-76 449-48 594 46 163-3 278 75 303 172-60 86-199 122-347 103-136-17-229 64-373 55-137-8-231-71-371-57C241 552 101 478 70 382Z" />
      <path className="quiz-scene-ridge" d="M92 391c149-61 280-83 414-78 154 6 240-71 401-66 172 4 266 89 439 88 56 0 103 14 143 42" />

      <g data-scene-object="nature" className="quiz-scene-object quiz-scene-mountains">
        <path className="quiz-mountain-back" d="M1200 315 1322 98l92 160 51-87 92 166Z" />
        <path className="quiz-mountain-front" d="m1252 326 105-183 132 201Z" />
        <path className="quiz-mountain-snow" d="m1322 98 33 58 19-18 40 120-44-58-21 17-35-43-34 41-31-9Z" />
        <path className="quiz-mountain-snow" d="m1357 143 27 48 17-14 33 52-29-21-22 19-25-32-26 18-26-7Z" />
      </g>

      <path className="quiz-scene-river" d="M1334 261c-94 45-59 99-162 119-100 19-113 77-199 89-88 13-138-20-215 23" />
      <path className="quiz-scene-river-flow quiz-landscape-animated" d="M1334 261c-94 45-59 99-162 119-100 19-113 77-199 89-88 13-138-20-215 23" />
      <g data-scene-object="water" className="quiz-scene-object">
        <path className="quiz-scene-lake" fill="url(#quiz-water)" d="M1167 395c70-39 178-27 205 21 27 47-35 96-119 92-85-5-139-53-86-113Z" />
        <path className="quiz-scene-water-line quiz-landscape-animated" d="M1193 428c43-18 105-17 145 2M1181 452c57-19 126-13 161 8M1210 477c37-9 76-7 105 3" />
      </g>

      <path className="quiz-scene-road-edge" d="M99 471c210-25 306 74 491 31 191-45 336 73 513 50 152-19 246-80 376-76" />
      <path className="quiz-scene-road" d="M99 471c210-25 306 74 491 31 191-45 336 73 513 50 152-19 246-80 376-76" />
      <path className="quiz-scene-road-dashes" d="M99 471c210-25 306 74 491 31 191-45 336 73 513 50 152-19 246-80 376-76" />

      <g data-scene-object="flags" className="quiz-scene-object quiz-scene-flag">
        <path className="quiz-object-line" d="M154 313v151" />
        <circle className="quiz-object-metal" cx="154" cy="307" r="7" />
        <path className="quiz-object-flag quiz-landscape-animated" d="M158 322c48-17 65 17 112-1v67c-47 18-64-16-112 1Z" />
        <path className="quiz-object-base" d="m130 471 24-17 25 17Z" />
      </g>

      <g data-scene-object="countries" className="quiz-scene-object quiz-scene-globe-pavilion">
        <path className="quiz-object-line" d="M314 244v74M276 328h76" />
        <circle className="quiz-object-glass" cx="314" cy="210" r="52" />
        <path className="quiz-object-globe-line" d="M263 210h102M314 159c-31 27-31 75 0 102M314 159c31 27 31 75 0 102" />
        <path className="quiz-object-land" d="m282 184 25-13 15 10-8 16 15 11-6 19-23 7-10-16-17-9Z" />
      </g>

      <g data-scene-object="capitals" className="quiz-scene-object quiz-scene-capitol">
        <path className="quiz-object-building" d="M526 314v-74h102v74M514 314h126v20H514Z" />
        <path className="quiz-object-building" d="M542 240c5-43 65-43 70 0ZM565 193h24v19h-24Z" />
        <path className="quiz-object-line" d="M551 255v48M576 255v48M603 255v48" />
        <path className="quiz-object-base" d="M502 334h150v13H502Z" />
      </g>

      <g data-scene-object="languages" className="quiz-scene-object quiz-scene-library">
        <path className="quiz-object-building" d="M421 468h111v86H421Z" />
        <path className="quiz-object-building" d="m410 468 67-41 67 41Z" />
        <path className="quiz-object-line" d="M443 483v55M477 483v55M511 483v55M409 554h136" />
        <path className="quiz-object-letter" d="M457 458h17l8-13 9 13h15" />
      </g>

      <g data-scene-object="cities" className="quiz-scene-object quiz-scene-city">
        <path className="quiz-object-building" d="M718 362V250h49v112M778 362V214h62v148M851 362v-91h53v91Z" />
        <path className="quiz-object-window" d="M732 270h10m-10 22h10m-10 22h10m66-76h12m-12 24h12m-12 24h12m54 7h12m-12 23h12" />
        <path className="quiz-object-line" d="M808 214v-34M700 362h221" />
      </g>

      <g data-scene-object="mixed" className="quiz-scene-object quiz-scene-compass">
        <ellipse className="quiz-object-platform" cx="816" cy="505" rx="78" ry="33" />
        <circle className="quiz-object-glass" cx="816" cy="484" r="48" />
        <path className="quiz-object-compass" d="m816 445 13 29 28 10-28 11-13 29-13-29-28-11 28-10Z" />
        <circle className="quiz-object-metal" cx="816" cy="484" r="7" />
      </g>

      <g data-scene-object="landmarks" className="quiz-scene-object quiz-scene-landmark">
        <path className="quiz-object-building" d="M984 354v-25h19v-83h93v83h19v25h-45v-61c0-32-41-32-41 0v61Z" />
        <path className="quiz-object-line" d="M991 258h117M1009 267h80M1027 246v-27M1072 246v-27" />
        <path className="quiz-object-base" d="M970 354h160v15H970Z" />
      </g>

      <g data-scene-object="images" className="quiz-scene-object quiz-scene-camera">
        <path className="quiz-object-platform" d="m1068 552 57-30 65 31-61 31Z" />
        <path className="quiz-object-camera" d="M1095 496h71v44h-71Z" />
        <path className="quiz-object-camera" d="m1111 496 9-15h23l10 15" />
        <circle className="quiz-object-glass" cx="1130" cy="518" r="14" />
        <path className="quiz-object-line" d="m1130 540-18 35m18-35 18 35m-18-35v37" />
      </g>

      <g data-scene-object="license_plates" className="quiz-scene-object quiz-scene-car">
        <g className="quiz-scene-car-drive quiz-landscape-animated">
          <path className="quiz-object-car" d="M1273 540h103l18 23v30h-143v-33l22-20Z" />
          <path className="quiz-object-glass" d="m1285 544 19-30h47l20 30Z" />
          <circle className="quiz-object-wheel" cx="1280" cy="594" r="15" />
          <circle className="quiz-object-wheel" cx="1365" cy="594" r="15" />
          <path className="quiz-object-plate" d="M1310 570h35v12h-35Z" />
        </g>
      </g>

      <path className="quiz-scene-satellite-cliff" d="M1425 333c22-54 118-77 160-27 31 36-8 105-75 112-66 7-107-31-85-85Z" />
      <path className="quiz-scene-satellite-top" d="M1428 324c29-47 114-62 151-18 28 34-11 83-69 89-57 6-101-27-82-71Z" />
      <g data-scene-object="daily" className="quiz-scene-object quiz-scene-observatory">
        <path className="quiz-object-building" d="M1471 344v-59c3-45 69-45 72 0v59Z" />
        <path className="quiz-object-glass" d="M1471 285c3-45 69-45 72 0Z" />
        <path className="quiz-object-line" d="M1507 255v-40m0 0 34-17" />
        <circle className="quiz-object-beacon quiz-landscape-animated" cx="1542" cy="197" r="8" />
        <path className="quiz-object-base" d="M1455 344h105v14h-105Z" />
      </g>

      <g className="quiz-scene-lights quiz-landscape-animated">
        <circle cx="367" cy="397" r="4" /><circle cx="660" cy="430" r="3" /><circle cx="948" cy="324" r="4" />
        <circle cx="1190" cy="330" r="3" /><circle cx="1410" cy="398" r="4" />
      </g>
    </svg>
  )
}

function countLabel(quiz: QuizDef, counts?: Record<string, number>) {
  const value = quiz.countKey ? counts?.[quiz.countKey] : undefined
  return value === undefined ? undefined : `${value.toLocaleString('de-DE')} Einträge`
}

export function QuizLandscape({ counts }: { counts?: Record<string, number> }) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const overviewRef = useRef<HTMLDialogElement>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const draggedRef = useRef(false)
  const scrollTimerRef = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()
  const [activeStation, setActiveStation] = useState<SceneId>()
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const [scrolling, setScrolling] = useState(false)
  const [panning, setPanning] = useState(false)

  useEffect(() => {
    const node = rootRef.current
    if (!node || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), {
      rootMargin: '120px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => () => {
    if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
  }, [])

  const quizzes = PLAY_QUIZZES.map((quiz) => ({ quiz, layout: stationLayout(quiz) }))
  const motionPaused = reducedMotion || !inView || !pageVisible || scrolling || panning

  const onScroll = () => {
    setScrolling(true)
    if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = window.setTimeout(() => setScrolling(false), 160)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    draggedRef.current = false
    setPanning(true)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) draggedRef.current = true
  }

  const finishPointer = () => {
    pointerStartRef.current = null
    setPanning(false)
    window.setTimeout(() => {
      draggedRef.current = false
    }, 0)
  }

  const preventDraggedClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!draggedRef.current) return
    event.preventDefault()
    event.stopPropagation()
  }

  const focusStation = (event: React.FocusEvent<HTMLAnchorElement>, id: SceneId) => {
    setActiveStation(id)
    if (event.currentTarget.matches(':focus-visible')) {
      event.currentTarget.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }

  const openOverview = () => {
    const dialog = overviewRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }

  return (
    <section
      ref={rootRef}
      className={`quiz-landscape ${motionPaused ? 'is-motion-paused' : ''}`}
      data-active-station={activeStation}
      aria-labelledby="quiz-landscape-title"
    >
      <header className="quiz-landscape-heading">
        <div>
          <span>{t('play.landscape_eyebrow')}</span>
          <h1 id="quiz-landscape-title">{t('play.title')}</h1>
        </div>
        <p>{t('play.landscape_hint')}</p>
      </header>

      <div
        ref={viewportRef}
        className="quiz-landscape-viewport"
        onScroll={onScroll}
        onPointerDownCapture={onPointerDown}
        onPointerMoveCapture={onPointerMove}
        onPointerUpCapture={finishPointer}
        onPointerCancelCapture={finishPointer}
        onPointerLeave={finishPointer}
        onClickCapture={preventDraggedClick}
      >
        <div className="quiz-landscape-stage">
          <LandscapeArtwork />
          <nav className="quiz-landscape-stations" aria-label={t('play.landscape_nav')}>
            {quizzes.map(({ quiz, layout }) => {
              const label = t(`category.${quiz.id}`)
              const count = countLabel(quiz, counts)
              return (
                <Link
                  key={quiz.id}
                  to={`/play/${quiz.id}`}
                  className={`quiz-landscape-station ${layout.side ? `is-${layout.side}` : ''}`}
                  style={{ left: `${layout.x}%`, top: `${layout.y}%` }}
                  aria-label={count ? `${label}, ${count}` : label}
                  data-quiz-station={quiz.id}
                  onPointerEnter={() => setActiveStation(quiz.id)}
                  onPointerLeave={(event) => {
                    if (!event.currentTarget.matches(':focus')) setActiveStation(undefined)
                  }}
                  onFocus={(event) => focusStation(event, quiz.id)}
                  onBlur={() => setActiveStation(undefined)}
                >
                  <span className="quiz-landscape-station-marker">
                    <CategoryIcon id={quiz.id} className="h-9 w-9" />
                  </span>
                  <span className="quiz-landscape-station-label">
                    <strong>{label}</strong>
                    {count && <small>{count}</small>}
                  </span>
                </Link>
              )
            })}
            <Link
              to="/daily"
              className="quiz-landscape-station is-right is-daily"
              style={{ left: `${DAILY_LAYOUT.x}%`, top: `${DAILY_LAYOUT.y}%` }}
              aria-label={`${t('daily.title')}, ${t('play.daily_count')}`}
              data-quiz-station="daily"
              onPointerEnter={() => setActiveStation('daily')}
              onPointerLeave={(event) => {
                if (!event.currentTarget.matches(':focus')) setActiveStation(undefined)
              }}
              onFocus={(event) => focusStation(event, 'daily')}
              onBlur={() => setActiveStation(undefined)}
            >
              <span className="quiz-landscape-station-marker"><Icons.daily aria-hidden /></span>
              <span className="quiz-landscape-station-label">
                <strong>{t('daily.title')}</strong>
                <small>{t('play.daily_count')}</small>
              </span>
            </Link>
          </nav>
        </div>
      </div>

      <p className="quiz-landscape-swipe-hint" aria-hidden="true">↔ {t('play.landscape_swipe')}</p>
      <button type="button" className="quiz-landscape-overview-button" onClick={openOverview} aria-haspopup="dialog">
        <Icons.layers aria-hidden /> {t('play.overview')}
      </button>

      <dialog
        ref={overviewRef}
        className="quiz-landscape-overview"
        aria-labelledby="quiz-overview-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) overviewRef.current?.close()
        }}
      >
        <div className="quiz-landscape-overview-sheet">
          <header>
            <div>
              <span>{t('play.landscape_eyebrow')}</span>
              <h2 id="quiz-overview-title">{t('play.overview')}</h2>
            </div>
            <button type="button" onClick={() => overviewRef.current?.close()} aria-label={t('common.close')}>
              <Icons.x aria-hidden />
            </button>
          </header>
          <nav aria-label={t('play.overview')}>
            {quizzes.map(({ quiz }) => {
              const count = countLabel(quiz, counts)
              return (
                <Link key={quiz.id} to={`/play/${quiz.id}`}>
                  <CategoryIcon id={quiz.id} className="h-10 w-10" />
                  <span><strong>{t(`category.${quiz.id}`)}</strong>{count && <small>{count}</small>}</span>
                  <Icons.arrow aria-hidden />
                </Link>
              )
            })}
            <Link to="/daily">
              <span className="quiz-landscape-overview-daily"><Icons.daily aria-hidden /></span>
              <span><strong>{t('daily.title')}</strong><small>{t('play.daily_count')}</small></span>
              <Icons.arrow aria-hidden />
            </Link>
          </nav>
        </div>
      </dialog>
    </section>
  )
}
