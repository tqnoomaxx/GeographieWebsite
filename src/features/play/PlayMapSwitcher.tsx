import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Building2,
  Car,
  Dices,
  Flag,
  Globe2,
  Landmark,
  Languages,
  Mountain,
  Puzzle,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { PLAY_QUIZZES, type QuizDef } from '@/config/quizzes'
import type { CategoryId } from '@/engine/types'
import type { PlayStationId, StationProgress, StationProgressMap } from './stationProgress'

const QuizDiorama3D = lazy(() => import('./QuizDiorama3D'))

type MapView = 'menu' | 'diorama'

const VIEW_KEY = 'atlasfunke.play-view'
const UPGRADE_KEY = 'atlasfunke.station-upgrades.v1'
const UPGRADE_VERSION = 1

const MENU_ICONS: Partial<Record<CategoryId, LucideIcon>> = {
  flags: Flag,
  countries: Globe2,
  capitals: Landmark,
  languages: Languages,
  cities: Building2,
  landmarks: Landmark,
  water: Waves,
  nature: Mountain,
  license_plates: Car,
  mixed: Dices,
}

function countLabel(quiz: QuizDef, counts?: Record<string, number>) {
  const value = quiz.countKey ? counts?.[quiz.countKey] : undefined
  return value === undefined ? undefined : `${value.toLocaleString('de-DE')} Einträge`
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function unitLabel(progress: StationProgress, t: TFunction) {
  return t(`play.station_unit_${progress.unit}`)
}

function levelLabel(progress: StationProgress, t: TFunction) {
  return t('play.station_level', {
    level: progress.level,
    name: t(`play.station_levels.${progress.level}`),
  })
}

function progressLabel(progress: StationProgress, t: TFunction) {
  const unit = unitLabel(progress, t)
  if (!progress.nextThreshold) {
    return t('play.station_masterpiece', { value: progress.value.toLocaleString('de-DE'), unit })
  }
  return t('play.station_progress', {
    value: progress.value.toLocaleString('de-DE'),
    next: progress.nextThreshold.toLocaleString('de-DE'),
    unit,
  })
}

function StationProgressView({ progress }: { progress?: StationProgress }) {
  const { t } = useTranslation()
  if (!progress) return null
  return (
    <span className="play-station-progress" data-station-level={progress.level}>
      <span className="play-station-level">{levelLabel(progress, t)}</span>
      <span className="play-station-progress-track" aria-hidden>
        <span style={{ width: `${progress.progress * 100}%` }} />
      </span>
      <small>{progressLabel(progress, t)}</small>
    </span>
  )
}

function useUpgradeCelebration(progress?: StationProgressMap) {
  const initialized = useRef(false)
  const [queue, setQueue] = useState<PlayStationId[]>([])

  useEffect(() => {
    if (!progress || initialized.current) return
    initialized.current = true
    const levels = Object.fromEntries(Object.entries(progress).map(([id, value]) => [id, value.level]))
    let stored: { version: number; levels: Record<string, number> } | undefined
    try {
      stored = JSON.parse(localStorage.getItem(UPGRADE_KEY) ?? 'null') ?? undefined
    } catch {
      stored = undefined
    }

    if (stored?.version === UPGRADE_VERSION) {
      const upgrades = Object.values(progress)
        .filter((item) => item.level > (stored?.levels[item.id] ?? 0))
        .map((item) => item.id)
      setQueue(upgrades)
    }
    localStorage.setItem(UPGRADE_KEY, JSON.stringify({ version: UPGRADE_VERSION, levels }))
  }, [progress])

  useEffect(() => {
    if (!queue.length) return
    const timer = window.setTimeout(() => setQueue((current) => current.slice(1)), 2_800)
    return () => window.clearTimeout(timer)
  }, [queue])

  return queue[0]
}

function initialView(webglAvailable: boolean): MapView {
  if (!webglAvailable) return 'menu'
  const stored = localStorage.getItem(VIEW_KEY)
  return stored === 'menu' || stored === 'diorama' ? stored : 'diorama'
}

function QuizMenu({
  counts,
  progress,
  celebrating,
}: {
  counts?: Record<string, number>
  progress?: StationProgressMap
  celebrating?: PlayStationId
}) {
  const { t } = useTranslation()
  return (
    <nav className="play-quiz-menu" aria-label={t('play.landscape_nav')}>
      {PLAY_QUIZZES.map((quiz, index) => {
        const Icon = MENU_ICONS[quiz.id] ?? Globe2
        const detail = countLabel(quiz, counts)
        return (
          <Link
            key={quiz.id}
            to={`/play/${quiz.id}`}
            className={`play-quiz-menu-item ${celebrating === quiz.id ? 'is-upgraded' : ''}`}
            data-quiz-station={quiz.id}
            data-station-level={progress?.[quiz.id]?.level}
          >
            <span className="play-quiz-menu-index" aria-hidden>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="play-quiz-menu-icon" aria-hidden>
              <Icon strokeWidth={1.65} />
            </span>
            <span className="play-quiz-menu-copy">
              <strong>{t(`category.${quiz.id}`)}</strong>
              {detail ? <small>{detail}</small> : null}
              <StationProgressView progress={progress?.[quiz.id]} />
            </span>
            {celebrating === quiz.id ? (
              <span className="play-station-new">{t('play.upgrade_new')}</span>
            ) : null}
            <span className="play-quiz-menu-arrow" aria-hidden>
              →
            </span>
          </Link>
        )
      })}
      <Link
        to="/daily"
        className={`play-quiz-menu-item is-daily ${celebrating === 'daily' ? 'is-upgraded' : ''}`}
        data-quiz-station="daily"
        data-station-level={progress?.daily?.level}
      >
        <span className="play-quiz-menu-index" aria-hidden>
          {String(PLAY_QUIZZES.length + 1).padStart(2, '0')}
        </span>
        <span className="play-quiz-menu-icon" aria-hidden>
          <Puzzle strokeWidth={1.65} />
        </span>
        <span className="play-quiz-menu-copy">
          <strong>{t('daily.title')}</strong>
          <small>{t('play.daily_count')}</small>
          <StationProgressView progress={progress?.daily} />
        </span>
        {celebrating === 'daily' ? <span className="play-station-new">{t('play.upgrade_new')}</span> : null}
        <span className="play-quiz-menu-arrow" aria-hidden>
          →
        </span>
      </Link>
    </nav>
  )
}

class DioramaBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onError()
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function PlayMapSwitcher({
  counts,
  progress,
}: {
  counts?: Record<string, number>
  progress?: StationProgressMap
}) {
  const { t } = useTranslation()
  const webglAvailable = useMemo(supportsWebGL, [])
  const [view, setView] = useState<MapView>(() => initialView(webglAvailable))
  const [sceneFailed, setSceneFailed] = useState(false)
  const celebrating = useUpgradeCelebration(progress)
  const celebratedProgress = celebrating ? progress?.[celebrating] : undefined

  const selectView = (next: MapView) => {
    const resolved = next === 'diorama' && (!webglAvailable || sceneFailed) ? 'menu' : next
    localStorage.setItem(VIEW_KEY, resolved)
    setView(resolved)
  }

  const fallback = (
    <div className="play-diorama-unavailable" role="status">
      <strong>{t('play.diorama_unavailable')}</strong>
      <button type="button" className="btn-secondary" onClick={() => selectView('menu')}>
        {t('play.view_menu')}
      </button>
    </div>
  )

  return (
    <section
      className="play-map-switcher"
      data-map-view={view}
      data-upgrade-station={celebrating}
      aria-labelledby="play-map-title"
    >
      <header className="play-map-heading">
        <div>
          <span className="play-map-eyebrow">{t('play.landscape_eyebrow')}</span>
          <h1 id="play-map-title">{t('play.title')}</h1>
          <p>{view === 'diorama' ? t('play.diorama_hint') : t('play.menu_hint')}</p>
        </div>
        <div className="play-map-toggle" role="group" aria-label={t('play.view_label')}>
          <button
            type="button"
            className={view === 'menu' ? 'is-active' : ''}
            aria-pressed={view === 'menu'}
            onClick={() => selectView('menu')}
          >
            {t('play.view_menu')}
          </button>
          <button
            type="button"
            className={view === 'diorama' ? 'is-active' : ''}
            aria-pressed={view === 'diorama'}
            disabled={!webglAvailable || sceneFailed}
            onClick={() => selectView('diorama')}
          >
            {t('play.view_diorama')}
          </button>
        </div>
      </header>

      {view === 'menu' ? (
        <QuizMenu counts={counts} progress={progress} celebrating={celebrating} />
      ) : (
        <DioramaBoundary
          fallback={fallback}
          onError={() => {
            setSceneFailed(true)
            localStorage.setItem(VIEW_KEY, 'menu')
          }}
        >
          <Suspense fallback={<div className="play-diorama-loading">{t('play.diorama_loading')}</div>}>
            <QuizDiorama3D counts={counts} progress={progress} celebrating={celebrating} />
          </Suspense>
        </DioramaBoundary>
      )}
      {celebrating && celebratedProgress ? (
        <div className="play-station-upgrade" role="status" data-station={celebrating}>
          <span>{t('play.upgrade_new')}</span>
          <strong>{t('play.upgrade_title')}</strong>
          <p>
            {t('play.upgrade_message', {
              station: celebrating === 'daily' ? t('daily.title') : t(`category.${celebrating}`),
              level: celebratedProgress.level,
              name: t(`play.station_levels.${celebratedProgress.level}`),
            })}
          </p>
        </div>
      ) : null}
    </section>
  )
}
