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
      <svg
        className="quiz-landscape-photo-effects"
        viewBox="0 0 2048 768"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="landscape-cloud" x1="0" y1="0" x2="1" y2=".2">
            <stop offset="0" stopColor="#f6efe9" stopOpacity="0" />
            <stop offset=".36" stopColor="#dce6ef" stopOpacity=".34" />
            <stop offset=".68" stopColor="#f9d5c5" stopOpacity=".22" />
            <stop offset="1" stopColor="#cad7e6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="landscape-water-light" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#bdf6ff" stopOpacity="0" />
            <stop offset=".48" stopColor="#e8ffff" stopOpacity=".68" />
            <stop offset="1" stopColor="#86ddea" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="landscape-flag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#efc85c" />
            <stop offset=".5" stopColor="#d9584d" />
            <stop offset="1" stopColor="#294c86" />
          </linearGradient>
          <radialGradient id="landscape-window-light">
            <stop offset="0" stopColor="#fff6c5" />
            <stop offset=".38" stopColor="#ffd46d" />
            <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="landscape-car-paint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ec6658" />
            <stop offset="1" stopColor="#8f211f" />
          </linearGradient>
        </defs>

        <g className="quiz-landscape-clouds quiz-landscape-animated">
          <path
            className="quiz-landscape-cloud quiz-landscape-cloud-a"
            fill="url(#landscape-cloud)"
            d="M-170 164c92-38 181-42 258-13 81-48 183-42 249-4 94-31 208-12 269 34-132 24-273 31-420 24-128-6-243-19-356-41Z"
          />
          <path
            className="quiz-landscape-cloud quiz-landscape-cloud-b"
            fill="url(#landscape-cloud)"
            d="M1160 112c86-34 168-34 235-5 67-42 172-32 229 6 71-18 157-4 213 35-107 24-219 30-337 23-125-8-235-28-340-59Z"
          />
          <path
            className="quiz-landscape-cloud quiz-landscape-cloud-c"
            fill="url(#landscape-cloud)"
            d="M523 223c79-31 161-29 224 3 72-34 162-24 223 15-118 22-261 23-447-18Z"
          />
        </g>

        <g className="quiz-landscape-birds quiz-landscape-animated">
          <g className="quiz-landscape-bird quiz-landscape-bird-a">
            <path d="M0 8q10-11 20 0q10-11 20 0" />
            <path d="M12 18q8-8 16 0" />
          </g>
          <g className="quiz-landscape-bird quiz-landscape-bird-b">
            <path d="M0 7q8-9 16 0q8-9 16 0" />
            <path d="M37 15q6-7 13 0" />
          </g>
        </g>

        <g className="quiz-landscape-mountain-light quiz-landscape-animated">
          <path d="m1477 110 79 114 53-75 88 139-112-99-31 66-74-73-97 98Z" />
          <path d="m1085 211 53 57 39-37 61 74-91-44-39 42-82 37Z" />
        </g>

        <g className="quiz-landscape-observatory-beam quiz-landscape-animated">
          <path d="M405 322 738 111l42 75-362 151Z" />
          <circle cx="410" cy="327" r="7" />
        </g>

        <g className="quiz-landscape-water-motion quiz-landscape-animated">
          <path
            className="quiz-landscape-lake-ripple quiz-landscape-lake-ripple-a"
            d="M719 479c183-32 420-29 604 13"
          />
          <path
            className="quiz-landscape-lake-ripple quiz-landscape-lake-ripple-b"
            d="M650 516c213-34 468-26 640 20"
          />
          <path
            className="quiz-landscape-lake-ripple quiz-landscape-lake-ripple-c"
            d="M796 554c144-18 301-3 397 31"
          />
          <path
            className="quiz-landscape-river-glint"
            d="M1112 483c113 5 186 65 288 45 95-19 160-76 258-53 85 20 119 83 247 79"
          />
          <path
            className="quiz-landscape-river-glint quiz-landscape-river-glint-b"
            d="M1200 518c92 25 134 66 232 37 89-27 144-58 244-35 71 17 127 69 239 73"
          />
        </g>

        <g className="quiz-landscape-town-lights quiz-landscape-animated">
          <circle cx="877" cy="449" r="7" />
          <circle cx="926" cy="435" r="5" />
          <circle cx="974" cy="457" r="6" />
          <circle cx="1026" cy="429" r="5" />
          <circle cx="1072" cy="422" r="7" />
          <circle cx="1112" cy="414" r="5" />
          <circle cx="1161" cy="430" r="7" />
          <circle cx="1208" cy="411" r="5" />
          <circle cx="1260" cy="430" r="7" />
          <circle cx="1322" cy="439" r="5" />
          <circle cx="1415" cy="445" r="7" />
          <circle cx="1493" cy="430" r="5" />
          <circle cx="1550" cy="451" r="6" />
          <circle cx="1625" cy="438" r="5" />
        </g>

        <g className="quiz-landscape-flag-scene quiz-landscape-animated">
          <path className="quiz-landscape-flagpole" d="M1835 304v142" />
          <circle className="quiz-landscape-flagpole" cx="1835" cy="299" r="5" />
          <g className="quiz-landscape-flag-cloth">
            <path fill="url(#landscape-flag)" d="M1841 317c23-10 40 10 65-1v39c-25 12-42-10-65 1Z" />
            <path d="M1842 330c23-9 40 10 63-1M1842 343c23-9 40 10 63-1" />
          </g>
        </g>

        <g className="quiz-landscape-foreground quiz-landscape-animated">
          <path
            className="quiz-landscape-grass quiz-landscape-grass-a"
            d="M79 768q-11-62 4-108m-4 50-32-37m34 18 36-51m-4 128q-2-78 21-127m-19 70-39-31m51 5 38-54"
          />
          <path
            className="quiz-landscape-grass quiz-landscape-grass-b"
            d="M1882 768q8-70-18-126m20 63 38-43m-41 14-24-51m80 143q-2-62 17-111m-15 61-30-27m39-2 28-43"
          />
        </g>

        <g className="quiz-landscape-car quiz-landscape-animated">
          <ellipse className="quiz-landscape-car-shadow" cx="0" cy="18" rx="39" ry="8" />
          <path className="quiz-landscape-car-body" d="M-44-2h14l15-20h31L36-2h12l8 10-4 14h-98L-53 8Z" />
          <path className="quiz-landscape-car-window" d="m-23-4 13-15h23L28-4Z" />
          <path className="quiz-landscape-car-light" d="M43 1h9l4 7H44Z" />
          <circle className="quiz-landscape-car-wheel" cx="-29" cy="21" r="9" />
          <circle className="quiz-landscape-car-wheel" cx="31" cy="21" r="9" />
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

  useEffect(
    () => () => {
      if (scrollTimerRef.current !== null) window.clearTimeout(scrollTimerRef.current)
    },
    [],
  )

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
              <span className="quiz-landscape-station-marker">
                <Icons.daily aria-hidden />
              </span>
              <span className="quiz-landscape-station-label">
                <strong>{t('daily.title')}</strong>
                <small>{t('play.daily_count')}</small>
              </span>
            </Link>
          </nav>
        </div>
      </div>

      <p className="quiz-landscape-swipe-hint" aria-hidden="true">
        ↔ {t('play.landscape_swipe')}
      </p>
      <button
        type="button"
        className="quiz-landscape-overview-button"
        onClick={openOverview}
        aria-haspopup="dialog"
      >
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
                  <span>
                    <strong>{t(`category.${quiz.id}`)}</strong>
                    {count && <small>{count}</small>}
                  </span>
                  <Icons.arrow aria-hidden />
                </Link>
              )
            })}
            <Link to="/daily">
              <span className="quiz-landscape-overview-daily">
                <Icons.daily aria-hidden />
              </span>
              <span>
                <strong>{t('daily.title')}</strong>
                <small>{t('play.daily_count')}</small>
              </span>
              <Icons.arrow aria-hidden />
            </Link>
          </nav>
        </div>
      </dialog>
    </section>
  )
}
