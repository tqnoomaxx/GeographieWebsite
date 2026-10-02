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
  flags: { x: 93, y: 42, side: 'right' },
  countries: { x: 34, y: 62 },
  capitals: { x: 58, y: 48 },
  languages: { x: 87, y: 65, side: 'right' },
  cities: { x: 62, y: 63 },
  mixed: { x: 45, y: 47 },
  landmarks: { x: 72, y: 55 },
  images: { x: 8.5, y: 29 },
  water: { x: 67.5, y: 78 },
  nature: { x: 78, y: 22, side: 'right' },
  license_plates: { x: 15, y: 75 },
}

const DAILY_LAYOUT: StationLayout = { x: 20.5, y: 35 }

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
    <div className="quiz-landscape-art" aria-hidden="true">
      <img
        className="quiz-landscape-photo quiz-landscape-animated"
        src={`${import.meta.env.BASE_URL}media/illustrations/quiz-landscape-realistic.webp`}
        alt=""
        draggable={false}
      />
      <span className="quiz-landscape-photo-shade" />
      <span className="quiz-landscape-mist quiz-landscape-mist-near quiz-landscape-animated" />
      <span className="quiz-landscape-mist quiz-landscape-mist-far quiz-landscape-animated" />
      <svg className="quiz-landscape-photo-effects" viewBox="0 0 2048 768" focusable="false">
        <path className="quiz-landscape-river-glint quiz-landscape-animated" d="M1112 483c113 5 186 65 288 45 95-19 160-76 258-53 85 20 119 83 247 79" />
        <g className="quiz-landscape-town-lights quiz-landscape-animated">
          <circle cx="1072" cy="422" r="3" /><circle cx="1112" cy="414" r="2.5" />
          <circle cx="1161" cy="430" r="3" /><circle cx="1208" cy="411" r="2.5" />
          <circle cx="1260" cy="430" r="3" /><circle cx="1322" cy="439" r="2.5" />
          <circle cx="1415" cy="445" r="3" /><circle cx="1493" cy="430" r="2.5" />
        </g>
      </svg>
    </div>
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
