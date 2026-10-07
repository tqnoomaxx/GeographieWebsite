import { Component, Suspense, lazy, useMemo, useState, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const QuizDiorama3D = lazy(() => import('./QuizDiorama3D'))

type MapView = 'menu' | 'diorama'

const VIEW_KEY = 'atlasfunke.play-view'

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

function initialView(webglAvailable: boolean): MapView {
  if (!webglAvailable) return 'menu'
  const stored = localStorage.getItem(VIEW_KEY)
  return stored === 'menu' || stored === 'diorama' ? stored : 'diorama'
}

function QuizMenu({ counts }: { counts?: Record<string, number> }) {
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
            className="play-quiz-menu-item"
            data-quiz-station={quiz.id}
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
            </span>
            <span className="play-quiz-menu-arrow" aria-hidden>
              →
            </span>
          </Link>
        )
      })}
      <Link to="/daily" className="play-quiz-menu-item is-daily" data-quiz-station="daily">
        <span className="play-quiz-menu-index" aria-hidden>
          {String(PLAY_QUIZZES.length + 1).padStart(2, '0')}
        </span>
        <span className="play-quiz-menu-icon" aria-hidden>
          <Puzzle strokeWidth={1.65} />
        </span>
        <span className="play-quiz-menu-copy">
          <strong>{t('daily.title')}</strong>
          <small>{t('play.daily_count')}</small>
        </span>
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

export function PlayMapSwitcher({ counts }: { counts?: Record<string, number> }) {
  const { t } = useTranslation()
  const webglAvailable = useMemo(supportsWebGL, [])
  const [view, setView] = useState<MapView>(() => initialView(webglAvailable))
  const [sceneFailed, setSceneFailed] = useState(false)

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
    <section className="play-map-switcher" data-map-view={view} aria-labelledby="play-map-title">
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
        <QuizMenu counts={counts} />
      ) : (
        <DioramaBoundary
          fallback={fallback}
          onError={() => {
            setSceneFailed(true)
            localStorage.setItem(VIEW_KEY, 'menu')
          }}
        >
          <Suspense fallback={<div className="play-diorama-loading">{t('play.diorama_loading')}</div>}>
            <QuizDiorama3D counts={counts} />
          </Suspense>
        </DioramaBoundary>
      )}
    </section>
  )
}
