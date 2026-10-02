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
      <svg
        className="quiz-landscape-scene"
        viewBox="0 0 2048 768"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--landscape-sky-top)" />
            <stop offset=".56" stopColor="var(--landscape-sky-mid)" />
            <stop offset="1" stopColor="var(--landscape-sky-horizon)" />
          </linearGradient>
          <radialGradient id="scene-sunset" cx=".15" cy=".55" r=".58">
            <stop offset="0" stopColor="var(--landscape-sun-core)" stopOpacity=".72" />
            <stop offset=".32" stopColor="var(--landscape-sun-glow)" stopOpacity=".3" />
            <stop offset="1" stopColor="var(--landscape-sun-glow)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="scene-mountain-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--landscape-mountain-far-top)" />
            <stop offset="1" stopColor="var(--landscape-mountain-far-bottom)" />
          </linearGradient>
          <linearGradient id="scene-mountain-mid" x1="0" y1="0" x2=".8" y2="1">
            <stop offset="0" stopColor="var(--landscape-mountain-mid-top)" />
            <stop offset="1" stopColor="var(--landscape-mountain-mid-bottom)" />
          </linearGradient>
          <linearGradient id="scene-mountain-near" x1="0" y1="0" x2=".7" y2="1">
            <stop offset="0" stopColor="var(--landscape-mountain-near-top)" />
            <stop offset="1" stopColor="var(--landscape-mountain-near-bottom)" />
          </linearGradient>
          <linearGradient id="scene-valley" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--landscape-valley-top)" />
            <stop offset="1" stopColor="var(--landscape-valley-bottom)" />
          </linearGradient>
          <linearGradient id="scene-lake" x1=".15" y1="0" x2=".85" y2="1">
            <stop offset="0" stopColor="var(--landscape-water-light)" />
            <stop offset=".58" stopColor="var(--landscape-water-mid)" />
            <stop offset="1" stopColor="var(--landscape-water-dark)" />
          </linearGradient>
          <linearGradient id="scene-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--landscape-road-light)" />
            <stop offset="1" stopColor="var(--landscape-road-dark)" />
          </linearGradient>
          <linearGradient id="scene-building" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--landscape-building-light)" />
            <stop offset="1" stopColor="var(--landscape-building-dark)" />
          </linearGradient>
          <pattern id="scene-grain" width="43" height="37" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="9" r="1" fill="var(--landscape-grain)" />
            <circle cx="31" cy="19" r=".8" fill="var(--landscape-grain)" />
            <path d="m15 30 6-2" stroke="var(--landscape-grain)" strokeWidth=".8" />
          </pattern>
          <pattern id="scene-terrain-detail" width="132" height="88" patternUnits="userSpaceOnUse">
            <path
              d="M-18 31q39-26 78-5t88-3M5 69q31-17 63-3t74-2"
              fill="none"
              stroke="var(--landscape-grain)"
              strokeWidth="1.6"
            />
            <circle cx="23" cy="45" r="1.4" fill="var(--landscape-grain)" />
            <circle cx="104" cy="53" r="1" fill="var(--landscape-grain)" />
          </pattern>
          <pattern id="scene-water-detail" width="170" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M-30 13q38-8 77 0t79 0 82 0M4 36q41-7 78 0t82 0"
              fill="none"
              stroke="rgb(220 248 249 / .24)"
              strokeWidth="2"
            />
          </pattern>
          <symbol id="scene-pine" viewBox="-22 -94 44 94">
            <path d="M-3 0 0-82 4 0Z" fill="var(--landscape-tree-trunk)" />
            <path d="m0-94-18 39h12l-19 31h17L-29 0h58L8-24h17L6-55h12Z" fill="var(--landscape-tree)" />
            <path d="M0-88-8-55h8v31h-8L0-4Z" fill="var(--landscape-tree-light)" opacity=".5" />
          </symbol>
          <symbol id="scene-house" viewBox="0 0 64 58">
            <path
              d="M7 23 32 5l26 18v31H7Z"
              fill="url(#scene-building)"
              stroke="var(--landscape-structure-line)"
              strokeWidth="2"
            />
            <path
              d="m2 25 30-22 31 22"
              fill="none"
              stroke="var(--landscape-roof)"
              strokeWidth="8"
              strokeLinejoin="round"
            />
            <path d="M27 37h11v17H27ZM13 31h8v9h-8Zm31 0h8v9h-8Z" fill="var(--landscape-window)" />
          </symbol>
        </defs>

        <rect width="2048" height="768" fill="url(#scene-sky)" />
        <rect width="2048" height="768" fill="url(#scene-sunset)" />
        <circle className="quiz-scene-sun" cx="287" cy="254" r="50" />

        <g className="quiz-scene-distant-mountains">
          <path
            fill="url(#scene-mountain-far)"
            d="M0 412 102 340l72 38 118-116 83 85 111-148 90 116 84-79 77 92 117-149 92 110 82-65 92 87 80-116 96 116 89-85 115 126 124-168 108 147 91-101 142 189v229H0Z"
          />
          <path
            className="quiz-scene-terrain-detail"
            d="M0 412 102 340l72 38 118-116 83 85 111-148 90 116 84-79 77 92 117-149 92 110 82-65 92 87 80-116 96 116 89-85 115 126 124-168 108 147 91-101 142 189v229H0Z"
          />
          <path
            className="quiz-scene-snow-far"
            d="m280 275 12-13 24 25 21-12 38 72-48-43-18 19Zm182-45 24-31 31 40 18-20 39 96-54-65-28 31Zm375-30 17-21 32 38 21-17 45 89-59-52-24 27Zm552-39 24-23 42 55 20-26 45 96-61-65-26 31Zm340-14 34-47 51 69 21-29 69 112-79-71-35 36Z"
          />
          <path
            className="quiz-scene-mountain-strata"
            d="M42 390 286 287m103 82 97-139m101 132 251-162m176 171 175-166m79 170 121-214m111 195 229-209m10 242 167-148"
          />
          <g className="quiz-scene-rock-facets">
            <path d="m486 199-93 170 93-102 88 48Z" />
            <path d="m854 179-73 174 73-113 99 49Z" />
            <path d="m1200 205-82 166 82-104 86 61Z" />
            <path d="m1413 138-91 221 91-153 108 61Z" />
            <path d="m1763 100-118 259 118-181 142 74Z" />
          </g>
        </g>

        <path
          className="quiz-scene-haze"
          d="M0 388c236-48 437-31 637 7 232 44 450 10 658-26 264-46 480-22 753 45v105H0Z"
        />

        <g className="quiz-scene-middle-mountains">
          <path
            fill="url(#scene-mountain-mid)"
            d="M0 542V377l152-93 99 101 103-65 151 169 102-93 125 122 137-155 126 103 99-59 116 121 133-91 111 88 112-154 91 96 134-88 137 119 110-63 130 106v127Z"
          />
          <path
            className="quiz-scene-ridge-light"
            d="m0 377 152-93 99 101 103-65 151 169 102-93 125 122 137-155 126 103 99-59 116 121 133-91 111 88 112-154 91 96 134-88 137 119 110-63 130 106"
          />
          <g className="quiz-scene-slope-shadows">
            <path d="m152 284 99 101-68 68-83-95Z" />
            <path d="m505 489 102-93 125 122-105-52Z" />
            <path d="m869 363 126 103-77 70-84-92Z" />
            <path d="m1327 437 111 88-75 53-76-91Z" />
            <path d="m1650 371 91 96-64 69-71-107Z" />
          </g>
        </g>

        <path
          className="quiz-scene-valley"
          fill="url(#scene-valley)"
          d="M0 485c223-57 410-36 587 38 193-97 422-114 627-44 211-78 498-39 834 83v206H0Z"
        />
        <path
          className="quiz-scene-terrain-detail"
          d="M0 485c223-57 410-36 587 38 193-97 422-114 627-44 211-78 498-39 834 83v206H0Z"
        />
        <path
          className="quiz-scene-field quiz-scene-field-a"
          d="M0 560c219-76 383-55 550 11-170 58-348 90-550 97Z"
        />
        <path
          className="quiz-scene-field quiz-scene-field-b"
          d="M1280 510c267-78 505-38 768 60v98c-283-101-512-113-768-56Z"
        />
        <path
          className="quiz-scene-field-lines"
          d="M25 610c197-54 346-43 503 1M1345 550c232-45 433-10 681 65M1376 588c218-34 400-2 635 65"
        />

        <path
          className="quiz-scene-lake"
          fill="url(#scene-lake)"
          d="M507 500c213-68 460-61 672-11 193 46 333 25 463 81-121 78-337 123-591 117-269-7-478-73-544-187Z"
        />
        <path
          className="quiz-scene-water-detail"
          d="M507 500c213-68 460-61 672-11 193 46 333 25 463 81-121 78-337 123-591 117-269-7-478-73-544-187Z"
        />
        <path
          className="quiz-scene-lake-shore"
          d="M507 500c213-68 460-61 672-11 193 46 333 25 463 81M513 516c207 61 427 82 666 54 153-18 295-14 443 9"
        />
        <path
          className="quiz-scene-lake"
          fill="url(#scene-lake)"
          d="M1327 567c138 3 238 51 365 45 128-5 209-58 356-25v181h-653c64-58 70-112-68-201Z"
        />

        <g className="quiz-scene-town">
          <use href="#scene-house" x="746" y="451" width="58" height="53" />
          <use href="#scene-house" x="808" y="431" width="66" height="60" />
          <use href="#scene-house" x="882" y="458" width="53" height="49" />
          <use href="#scene-house" x="945" y="420" width="72" height="65" />
          <use href="#scene-house" x="1021" y="449" width="57" height="52" />
          <use href="#scene-house" x="1090" y="413" width="68" height="62" />
          <use href="#scene-house" x="1165" y="447" width="60" height="55" />
          <use href="#scene-house" x="1230" y="424" width="72" height="65" />
          <use href="#scene-house" x="1312" y="460" width="55" height="50" />
          <use href="#scene-house" x="1371" y="434" width="66" height="60" />
          <use href="#scene-house" x="1448" y="466" width="57" height="52" />
          <path
            className="quiz-scene-capitol"
            d="M1128 454v-64h108v64m-124 0h141v18h-141Zm35-66c7-48 64-48 71 0Zm22-50h27v21h-27Z"
          />
          <path className="quiz-scene-capitol-lines" d="M1147 411v43m24-43v43m25-43v43m24-43v43" />
          <path
            className="quiz-scene-arch"
            d="M1446 487v-57h92v57h-27v-28c0-32-38-32-38 0v28Zm-13 0h118v13h-118Z"
          />
          <path
            className="quiz-scene-church"
            d="m994 447 22-46 22 46v50h-44Zm13-59 9-18 9 18m-9-18v-22m-9 22h18"
          />
        </g>

        <g className="quiz-scene-globe-pavilion">
          <ellipse cx="696" cy="505" rx="55" ry="17" />
          <path d="M659 505v-54m74 54v-54m-86 0h98" />
          <circle cx="696" cy="425" r="41" />
          <path d="M655 425h82m-41-41c-24 22-24 60 0 82m0-82c24 22 24 60 0 82" />
        </g>

        <g className="quiz-scene-observatory">
          <path d="M372 365v-58c4-47 72-47 76 0v58Z" />
          <path d="M372 307c4-47 72-47 76 0Z" />
          <path d="M410 278v-42l43-20" />
          <path d="M354 365h112v16H354Z" />
        </g>

        <g className="quiz-scene-library">
          <path d="M1748 535h126v86h-126Z" />
          <path d="m1733 535 78-47 78 47Z" />
          <path d="M1770 548v57m40-57v57m41-57v57m-119 16h158" />
        </g>

        <g className="quiz-scene-forest-back">
          <use href="#scene-pine" x="32" y="440" width="57" height="122" />
          <use href="#scene-pine" x="82" y="416" width="66" height="140" />
          <use href="#scene-pine" x="139" y="446" width="54" height="116" />
          <use href="#scene-pine" x="192" y="421" width="64" height="136" />
          <use href="#scene-pine" x="252" y="459" width="50" height="108" />
          <use href="#scene-pine" x="304" y="438" width="59" height="126" />
          <use href="#scene-pine" x="455" y="471" width="52" height="111" />
          <use href="#scene-pine" x="520" y="460" width="57" height="122" />
          <use href="#scene-pine" x="1560" y="455" width="58" height="124" />
          <use href="#scene-pine" x="1623" y="428" width="69" height="146" />
          <use href="#scene-pine" x="1690" y="453" width="57" height="122" />
          <use href="#scene-pine" x="1790" y="420" width="71" height="151" />
          <use href="#scene-pine" x="1870" y="448" width="60" height="128" />
          <use href="#scene-pine" x="1940" y="408" width="76" height="161" />
        </g>

        <path className="quiz-scene-road-bank" d="M-70 716c302-69 465-91 714-78 211 11 397-28 572-89" />
        <path
          fill="none"
          stroke="url(#scene-road)"
          strokeWidth="58"
          d="M-70 706c302-69 465-91 714-78 211 11 397-28 572-89"
        />
        <path
          className="quiz-scene-road-edge"
          d="M-70 676c302-69 465-91 714-78 211 11 397-28 572-89M-70 736c302-69 465-91 714-78 211 11 397-28 572-89"
        />
        <path className="quiz-scene-road-marking" d="M-70 706c302-69 465-91 714-78 211 11 397-28 572-89" />

        <g className="quiz-scene-bridge">
          <path d="M1462 579c144-27 265-19 373 28" />
          <path d="M1470 594c138-26 252-18 358 26" />
          <path d="M1501 585v61m85-72v57m87-54v56m83-36v61" />
          <path d="M1487 646h295" />
        </g>

        <g className="quiz-scene-forest-front quiz-landscape-animated">
          <use href="#scene-pine" x="-18" y="555" width="103" height="219" />
          <use href="#scene-pine" x="62" y="591" width="83" height="177" />
          <use href="#scene-pine" x="119" y="535" width="108" height="230" />
          <use href="#scene-pine" x="219" y="584" width="86" height="184" />
          <use href="#scene-pine" x="306" y="553" width="98" height="209" />
          <use href="#scene-pine" x="1166" y="618" width="74" height="158" />
          <use href="#scene-pine" x="1244" y="603" width="82" height="175" />
          <use href="#scene-pine" x="1810" y="558" width="99" height="211" />
          <use href="#scene-pine" x="1890" y="518" width="119" height="253" />
          <use href="#scene-pine" x="1992" y="574" width="92" height="196" />
        </g>
        <path
          className="quiz-scene-foreground-rocks"
          d="M0 745 88 701l55 27 91-47 70 45 106-29 80 71H0Zm1606 23 82-70 69 29 63-45 102 40 65-54 61 44v76Z"
        />
        <rect width="2048" height="768" fill="url(#scene-grain)" opacity=".2" />
      </svg>
      <span className="quiz-landscape-scene-shade" />
      <span className="quiz-landscape-mist quiz-landscape-mist-near quiz-landscape-animated" />
      <span className="quiz-landscape-mist quiz-landscape-mist-far quiz-landscape-animated" />
      <svg
        className="quiz-landscape-effects"
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
