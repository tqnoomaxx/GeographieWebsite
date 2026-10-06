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
type StationLayout = {
  x: number
  y: number
  width: number
  height: number
  tooltip?: 'center' | 'left' | 'right'
}

const STATION_LAYOUT: Partial<Record<CategoryId, StationLayout>> = {
  images: { x: 9, y: 47, width: 11, height: 24 },
  license_plates: { x: 15, y: 84, width: 14, height: 22 },
  countries: { x: 34, y: 65, width: 13, height: 24 },
  mixed: { x: 48, y: 73, width: 12, height: 21 },
  capitals: { x: 57, y: 53, width: 12, height: 25 },
  cities: { x: 66, y: 64, width: 14, height: 25 },
  water: { x: 64, y: 83, width: 17, height: 20 },
  landmarks: { x: 76, y: 65, width: 12, height: 24 },
  nature: { x: 79, y: 27, width: 19, height: 31, tooltip: 'left' },
  languages: { x: 88, y: 72, width: 13, height: 25, tooltip: 'left' },
  flags: { x: 93, y: 43, width: 10, height: 27, tooltip: 'left' },
}

const DAILY_LAYOUT: StationLayout = { x: 20, y: 43, width: 11, height: 25 }

function stationLayout(quiz: QuizDef) {
  const layout = STATION_LAYOUT[quiz.id]
  if (!layout) throw new Error(`Keine Landschaftsposition für sichtbares Quiz: ${quiz.id}`)
  return layout
}

const QUIZ_STATIONS = PLAY_QUIZZES.map((quiz) => ({ quiz, layout: stationLayout(quiz) }))

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

function AtlasDioramaArtwork() {
  return (
    <div className="atlas-scene-art" aria-hidden="true">
      <svg
        className="atlas-scene-svg"
        viewBox="0 0 2048 768"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="atlas-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--scene-sky-top)" />
            <stop offset=".58" stopColor="var(--scene-sky-mid)" />
            <stop offset="1" stopColor="var(--scene-sky-low)" />
          </linearGradient>
          <radialGradient id="atlas-sun-haze" cx=".12" cy=".42" r=".43">
            <stop offset="0" stopColor="var(--scene-sun)" stopOpacity=".72" />
            <stop offset=".35" stopColor="var(--scene-sun)" stopOpacity=".2" />
            <stop offset="1" stopColor="var(--scene-sun)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="atlas-water" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--scene-water-light)" />
            <stop offset=".52" stopColor="var(--scene-water-mid)" />
            <stop offset="1" stopColor="var(--scene-water-dark)" />
          </linearGradient>
          <linearGradient id="atlas-land-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--scene-land-far-top)" />
            <stop offset="1" stopColor="var(--scene-land-far-bottom)" />
          </linearGradient>
          <linearGradient id="atlas-land-mid" x1=".2" y1="0" x2=".8" y2="1">
            <stop offset="0" stopColor="var(--scene-land-mid-top)" />
            <stop offset="1" stopColor="var(--scene-land-mid-bottom)" />
          </linearGradient>
          <linearGradient id="atlas-land-near" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--scene-land-near-top)" />
            <stop offset="1" stopColor="var(--scene-land-near-bottom)" />
          </linearGradient>
          <linearGradient id="atlas-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--scene-road-light)" />
            <stop offset="1" stopColor="var(--scene-road-dark)" />
          </linearGradient>
          <linearGradient id="atlas-stone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--scene-stone-light)" />
            <stop offset="1" stopColor="var(--scene-stone-dark)" />
          </linearGradient>
          <pattern id="atlas-grain" width="29" height="31" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="8" r="1" fill="var(--scene-grain)" />
            <circle cx="22" cy="19" r=".8" fill="var(--scene-grain)" />
            <path d="m9 25 7-2" stroke="var(--scene-grain)" strokeWidth=".8" />
          </pattern>
          <pattern id="atlas-contours" width="160" height="72" patternUnits="userSpaceOnUse">
            <path
              d="M-15 28q44-23 87-4t104-2M5 61q38-16 75-2t91-1"
              fill="none"
              stroke="var(--scene-contour)"
              strokeWidth="1.8"
            />
          </pattern>
          <symbol id="atlas-pine" viewBox="-20 -78 40 78">
            <path d="M-2 0V-51h4V0Z" fill="var(--scene-trunk)" />
            <path d="m0-75-14 28h9l-14 23h12L-20 0h40L7-24h12L5-47h9Z" fill="var(--scene-tree)" />
            <path d="M0-69-5-46h5v22h-5L0-5Z" fill="var(--scene-tree-light)" opacity=".55" />
          </symbol>
          <symbol id="atlas-house" viewBox="0 0 60 58">
            <path
              d="M7 25 30 7l23 18v28H7Z"
              fill="var(--scene-building)"
              stroke="var(--scene-line)"
              strokeWidth="2.5"
            />
            <path
              d="m3 27 27-22 27 22"
              fill="none"
              stroke="var(--scene-roof)"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path d="M26 36h9v17h-9Zm-12-3h7v8h-7Zm25 0h7v8h-7Z" fill="var(--scene-window)" />
          </symbol>
        </defs>

        <rect width="2048" height="768" fill="url(#atlas-sky)" />
        <rect width="2048" height="768" fill="url(#atlas-sun-haze)" />
        <circle className="atlas-scene-sun" cx="228" cy="276" r="45" />

        <g className="atlas-scene-motion atlas-scene-clouds">
          <path d="M-80 178c91-44 187-39 257 7 96-50 213-26 270 34-182 27-358 18-527-41Z" />
          <path d="M690 115c111-48 223-34 298 22 105-45 240-20 306 50-204 17-405-7-604-72Z" />
          <path d="M1450 136c101-43 207-34 277 16 83-33 183-13 247 40-183 23-358 5-524-56Z" />
        </g>

        <g className="atlas-scene-distant-ridge">
          <path d="M0 430 121 349l83 47 108-117 88 78 125-150 102 126 88-72 86 75 124-141 103 108 87-66 91 81 106-121 98 109 102-91 110 112 137-164 106 139 92-88 111 125v201H0Z" />
          <path
            className="atlas-scene-ridge-ink"
            d="M0 430 121 349l83 47 108-117 88 78 125-150 102 126 88-72 86 75 124-141 103 108 87-66 91 81 106-121 98 109 102-91 110 112 137-164 106 139 92-88 111 125"
          />
        </g>

        <g className="atlas-scene-target atlas-scene-target-nature">
          <path className="atlas-scene-nature-halo" d="m1372 339 166-255 83 116 83-151 196 292Z" />
          <path
            className="atlas-scene-mountain-back"
            d="m1252 391 139-201 78 104 122-221 80 124 76-110 181 304Z"
          />
          <path
            className="atlas-scene-mountain-face"
            d="m1391 190 78 104 122-221 80 124 76-110 181 304-212-153-77 92-63-99-86 116Z"
          />
          <path
            className="atlas-scene-snow"
            d="m1372 217 19-27 25 34 20-19 33 89-49-50-21 26Zm181-77 38-67 41 63 24-35 53 92-64-52-29 37Zm162 0 32-53 44 74-49-35-21 28Z"
          />
          <path className="atlas-scene-highlight" d="m1327 357 64-167 78 104 122-221 80 124 76-110 125 215" />
        </g>

        <path
          className="atlas-scene-water"
          d="M0 461c235-63 451-46 648 40 227-100 465-102 687-11 209-83 441-58 713 40v238H0Z"
        />
        <path
          className="atlas-scene-island-far"
          d="M0 515c211-73 411-65 595 20 213-89 432-92 650-9 230-75 497-38 803 78v164H0Z"
        />
        <path
          className="atlas-scene-island-mid"
          d="M0 570c205-77 394-67 570 4 175-56 349-45 510 15 244-92 559-48 968 99v80H0Z"
        />
        <path
          className="atlas-scene-island-near"
          d="M0 650c215-66 408-62 593-7 179-43 348-31 510 27 251-72 566-48 945 47v51H0Z"
        />
        <path
          className="atlas-scene-contours"
          d="M0 515c211-73 411-65 595 20 213-89 432-92 650-9 230-75 497-38 803 78v164H0Z"
        />

        <g className="atlas-scene-routes">
          <path
            className="atlas-scene-route-shadow"
            d="M-72 690c249-78 480-72 683-11 181 54 345 5 503-52 186-66 363-54 540 2 151 48 266 62 464 17"
          />
          <path
            className="atlas-scene-route"
            d="M-72 690c249-78 480-72 683-11 181 54 345 5 503-52 186-66 363-54 540 2 151 48 266 62 464 17"
          />
          <path
            className="atlas-scene-route-line"
            d="M-72 690c249-78 480-72 683-11 181 54 345 5 503-52 186-66 363-54 540 2 151 48 266 62 464 17"
          />
          <path
            className="atlas-scene-small-route"
            d="M420 605c92-39 171-82 239-140 61-51 113-72 179-78M1042 613c-25-82 7-143 95-184m240 150c52-56 111-89 190-105m85 150c62-79 121-141 210-183"
          />
        </g>

        <g className="atlas-scene-forest atlas-scene-motion">
          <use href="#atlas-pine" x="35" y="490" width="55" height="107" />
          <use href="#atlas-pine" x="85" y="468" width="67" height="130" />
          <use href="#atlas-pine" x="151" y="498" width="53" height="104" />
          <use href="#atlas-pine" x="207" y="470" width="64" height="125" />
          <use href="#atlas-pine" x="281" y="520" width="52" height="102" />
          <use href="#atlas-pine" x="425" y="504" width="58" height="113" />
          <use href="#atlas-pine" x="505" y="517" width="51" height="100" />
          <use href="#atlas-pine" x="1160" y="509" width="54" height="106" />
          <use href="#atlas-pine" x="1232" y="526" width="48" height="94" />
          <use href="#atlas-pine" x="1590" y="485" width="63" height="123" />
          <use href="#atlas-pine" x="1660" y="456" width="72" height="140" />
          <use href="#atlas-pine" x="1730" y="496" width="56" height="109" />
          <use href="#atlas-pine" x="1871" y="454" width="76" height="148" />
          <use href="#atlas-pine" x="1945" y="493" width="59" height="115" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-images">
          <path className="atlas-scene-platform" d="M95 406h174l27 17-29 18H98l-31-18Z" />
          <path className="atlas-scene-camera" d="M126 345h86l17 22v55H111v-55h25Zm30 0 10-17h31l12 17Z" />
          <circle className="atlas-scene-lens" cx="170" cy="385" r="27" />
          <circle className="atlas-scene-lens-glint" cx="178" cy="376" r="7" />
          <path className="atlas-scene-tripod" d="m170 422-27 64m27-64 29 64m-29-64v66" />
          <circle className="atlas-scene-highlight" cx="170" cy="385" r="47" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-daily">
          <path className="atlas-scene-observatory" d="M347 411v-75c5-59 91-59 96 0v75Zm-22 0h140v21H325Z" />
          <path className="atlas-scene-observatory-dome" d="M347 336c5-59 91-59 96 0Z" />
          <path className="atlas-scene-telescope" d="M394 298v-54l57-27m-59 27 38 8" />
          <path className="atlas-scene-highlight" d="M347 336c5-59 91-59 96 0" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-countries">
          <ellipse className="atlas-scene-plaza" cx="692" cy="552" rx="89" ry="28" />
          <path className="atlas-scene-globe-stand" d="M647 551v-69m90 69v-69m-108 0h127" />
          <circle className="atlas-scene-globe" cx="692" cy="437" r="61" />
          <path
            className="atlas-scene-globe-lines"
            d="M632 437h120m-60-60c-34 31-34 89 0 120m0-120c34 31 34 89 0 120m-49-96c25 17 73 17 98 0m-98 72c25-17 73-17 98 0"
          />
          <circle className="atlas-scene-highlight" cx="692" cy="437" r="75" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-mixed">
          <ellipse className="atlas-scene-plaza" cx="982" cy="574" rx="98" ry="34" />
          <circle className="atlas-scene-compass" cx="982" cy="540" r="58" />
          <path
            className="atlas-scene-compass-star"
            d="m982 492 15 34 35 14-35 14-15 36-15-36-35-14 35-14Z"
          />
          <circle className="atlas-scene-compass-core" cx="982" cy="540" r="8" />
          <circle className="atlas-scene-highlight" cx="982" cy="540" r="74" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-capitals">
          <path
            className="atlas-scene-capitol"
            d="M1091 505v-89h152v89m-174 0h196v25h-196Zm45-94c10-69 91-69 102 0Zm30-71h43v28h-43Z"
          />
          <path className="atlas-scene-capitol-lines" d="M1118 442v63m34-63v63m35-63v63m34-63v63" />
          <path className="atlas-scene-highlight" d="M1091 505v-89h152v89m-129-94c10-69 91-69 102 0" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-cities">
          <use href="#atlas-house" x="1260" y="469" width="74" height="71" />
          <use href="#atlas-house" x="1327" y="436" width="90" height="86" />
          <use href="#atlas-house" x="1413" y="477" width="71" height="68" />
          <use href="#atlas-house" x="1470" y="445" width="82" height="79" />
          <path className="atlas-scene-city-tower" d="M1382 495v-111h47v111m-58 0h69m-46-111 12-28 12 28" />
          <path className="atlas-scene-highlight" d="M1251 536c82-72 207-105 311-20" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-landmarks">
          <path
            className="atlas-scene-arch"
            d="M1518 576v-96h136v96h-39v-43c0-49-58-49-58 0v43Zm-18 0h172v21h-172Z"
          />
          <path className="atlas-scene-arch-detail" d="M1538 500h96m-80-18 32-28 32 28m-95 66h30m66 0h30" />
          <path className="atlas-scene-highlight" d="M1518 576v-96h136v96m-79-43c0-49 58-49 58 0" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-languages">
          <path className="atlas-scene-library" d="M1736 555h172v126h-172Z" />
          <path className="atlas-scene-library-roof" d="m1717 555 105-63 105 63Z" />
          <path className="atlas-scene-library-lines" d="M1765 574v83m56-83v83m57-83v83m-161 24h210" />
          <path
            className="atlas-scene-book"
            d="M1780 519q35-18 70 5v50q-35-23-70-5Zm70 5q35-23 70-5v50q-35-18-70 5Z"
          />
          <path className="atlas-scene-highlight" d="m1717 555 105-63 105 63m-147-36q35-18 70 5 35-23 70-5" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-flags">
          <path className="atlas-scene-flag-tower" d="M1870 420h104v90h-104Zm-15 90h134v20h-134Z" />
          <path className="atlas-scene-flagpole" d="M1922 420V259" />
          <g className="atlas-scene-motion atlas-scene-flag-cloth">
            <path d="M1930 277c32-16 59 12 94-2v55c-35 16-62-13-94 2Z" />
            <path d="M1932 294c30-12 58 12 90-1m-90 19c30-12 58 12 90-1" />
          </g>
          <path className="atlas-scene-highlight" d="M1922 420V259m8 18c32-16 59 12 94-2" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-water">
          <path
            className="atlas-scene-river"
            d="M779 571c126-8 211 32 306 72 108 46 206 31 298-7 84-34 154-26 226 16 85 49 161 65 281 30"
          />
          <path
            className="atlas-scene-river-bank"
            d="M770 555c134-9 221 31 322 74 101 42 192 28 282-9 91-37 169-28 244 15 79 46 148 61 268 28M789 589c117-6 199 34 289 72 115 49 221 34 315-5 77-32 140-23 207 17 91 53 174 69 295 29"
          />
          <g className="atlas-scene-motion atlas-scene-water-glints">
            <path d="M915 607c79 4 125 47 202 55m131-4c74-4 116-39 187-31m133 28c58 38 112 49 188 40" />
          </g>
          <path className="atlas-scene-highlight" d="M779 571c126-8 211 32 306 72 108 46 206 31 298-7" />
        </g>

        <g className="atlas-scene-target atlas-scene-target-license_plates">
          <ellipse className="atlas-scene-car-shadow" cx="306" cy="678" rx="78" ry="17" />
          <path className="atlas-scene-car-body" d="M224 642h27l28-37h61l37 37h25l17 19-9 31H217l-12-31Z" />
          <path className="atlas-scene-car-window" d="m263 638 23-28h48l29 28Z" />
          <path className="atlas-scene-car-bumper" d="M217 671h193" />
          <circle className="atlas-scene-car-wheel" cx="258" cy="690" r="18" />
          <circle className="atlas-scene-car-wheel" cx="369" cy="690" r="18" />
          <rect className="atlas-scene-plate" x="286" y="654" width="53" height="18" rx="2" />
          <path className="atlas-scene-highlight" d="M224 642h27l28-37h61l37 37h25" />
        </g>

        <g className="atlas-scene-foreground atlas-scene-motion">
          <use href="#atlas-pine" x="-15" y="611" width="105" height="204" />
          <use href="#atlas-pine" x="77" y="637" width="89" height="174" />
          <use href="#atlas-pine" x="181" y="610" width="102" height="199" />
          <use href="#atlas-pine" x="417" y="643" width="83" height="162" />
          <use href="#atlas-pine" x="1117" y="646" width="81" height="158" />
          <use href="#atlas-pine" x="1641" y="632" width="92" height="179" />
          <use href="#atlas-pine" x="1931" y="608" width="109" height="212" />
        </g>

        <rect width="2048" height="768" fill="url(#atlas-grain)" opacity=".5" />
      </svg>
    </div>
  )
}

function countLabel(quiz: QuizDef, counts?: Record<string, number>) {
  const value = quiz.countKey ? counts?.[quiz.countKey] : undefined
  return value === undefined ? undefined : `${value.toLocaleString('de-DE')} Einträge`
}

function isCoarsePointer() {
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

export function QuizLandscape({ counts }: { counts?: Record<string, number> }) {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLElement>(null)
  const overviewRef = useRef<HTMLDialogElement>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const draggedRef = useRef(false)
  const scrollTimerRef = useRef<number | null>(null)
  const reducedMotion = useReducedMotion()
  const [activeStation, setActiveStation] = useState<SceneId>()
  const [touchStation, setTouchStation] = useState<SceneId>()
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

  const onViewportClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (draggedRef.current) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (!(event.target as Element).closest('[data-quiz-station]')) {
      setActiveStation(undefined)
      setTouchStation(undefined)
    }
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

  const selectStationOnTouch = (event: ReactMouseEvent<HTMLAnchorElement>, id: SceneId) => {
    if (!isCoarsePointer() || touchStation === id) return
    event.preventDefault()
    setActiveStation(id)
    setTouchStation(id)
    event.currentTarget.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }

  const openOverview = () => {
    const dialog = overviewRef.current
    if (dialog && !dialog.open) {
      setTouchStation(undefined)
      dialog.showModal()
    }
  }

  const stationLink = (id: SceneId, layout: StationLayout, href: string, label: string, detail?: string) => (
    <Link
      key={id}
      to={href}
      className={`atlas-scene-hotspot tooltip-${layout.tooltip ?? 'center'} ${activeStation === id ? 'is-active' : ''}`}
      style={{
        left: `${layout.x}%`,
        top: `${layout.y}%`,
        width: `${layout.width}%`,
        height: `${layout.height}%`,
      }}
      aria-label={[label, detail, t('play.configure')].filter(Boolean).join(', ')}
      data-quiz-station={id}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setActiveStation(id)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch' && !event.currentTarget.matches(':focus'))
          setActiveStation(undefined)
      }}
      onFocus={(event) => focusStation(event, id)}
      onBlur={() => setActiveStation(undefined)}
      onClick={(event) => selectStationOnTouch(event, id)}
    >
      <span className="atlas-scene-hotspot-dot" aria-hidden />
      <span className="atlas-scene-tooltip" aria-hidden="true">
        <strong>{label}</strong>
        {detail ? <small>{detail}</small> : null}
        <em>
          {t('play.configure')} <Icons.arrow />
        </em>
      </span>
    </Link>
  )

  return (
    <section
      ref={rootRef}
      className={`quiz-landscape atlas-diorama ${motionPaused ? 'is-motion-paused' : ''}`}
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
        className="quiz-landscape-viewport atlas-scene-viewport"
        onScroll={onScroll}
        onPointerDownCapture={onPointerDown}
        onPointerMoveCapture={onPointerMove}
        onPointerUpCapture={finishPointer}
        onPointerCancelCapture={finishPointer}
        onPointerLeave={finishPointer}
        onClickCapture={onViewportClickCapture}
      >
        <div className="quiz-landscape-stage atlas-scene-stage">
          <AtlasDioramaArtwork />
          <nav className="atlas-scene-hotspots" aria-label={t('play.landscape_nav')}>
            {QUIZ_STATIONS.map(({ quiz, layout }) =>
              stationLink(
                quiz.id,
                layout,
                `/play/${quiz.id}`,
                t(`category.${quiz.id}`),
                countLabel(quiz, counts),
              ),
            )}
            {stationLink('daily', DAILY_LAYOUT, '/daily', t('daily.title'), t('play.daily_count'))}
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
            {QUIZ_STATIONS.map(({ quiz }) => {
              const count = countLabel(quiz, counts)
              return (
                <Link key={quiz.id} to={`/play/${quiz.id}`}>
                  <CategoryIcon id={quiz.id} className="h-10 w-10" />
                  <span>
                    <strong>{t(`category.${quiz.id}`)}</strong>
                    {count ? <small>{count}</small> : null}
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
