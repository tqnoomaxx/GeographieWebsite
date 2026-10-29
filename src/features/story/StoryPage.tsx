import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Compass, Heart, LockKeyhole, Star } from 'lucide-react'
import { useDocumentTitle } from '@/app/hooks'
import { useReducedMotion } from '@/services/settings/motion'
import { STORY_LEVELS, levelAsset } from './levels'
import { currentLevelIndex, earnedStars, levelStatus, type StoryAction } from './levelProgress'
import { useStoryProgress } from './useStoryProgress'
import { StoryPanel } from './StoryPanel'
import { StoryJournal } from './StoryJournal'
import { StoryStars } from './StoryStars'
import './story.css'

export default function StoryPage() {
  const { progress, saved, advance, reset } = useStoryProgress()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const selected = STORY_LEVELS.findIndex((level) => level.id === params.get('level'))
  const current = currentLevelIndex(progress)
  const reducedMotion = useReducedMotion()
  const [journal, setJournal] = useState(false)
  const journalButton = useRef<HTMLButtonElement>(null)
  const totalStars = earnedStars(progress)
  useDocumentTitle(selected < 0 ? 'Der Atlas der Winde' : `${STORY_LEVELS[selected].place} · Story`)
  useEffect(() => {
    setJournal(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (params.has('level') && selected < 0) navigate('/story', { replace: true })
  }, [selected, params, navigate])
  const travel = (index: number, start = false) => {
    if (start && levelStatus(progress, index) !== 'locked') advance({ type: 'start', level: index })
    navigate(`/story?level=${STORY_LEVELS[index].id}`)
  }
  const act = (action: StoryAction) => advance(action)
  return (
    <div
      className={`story-page${selected >= 0 ? ' is-level-route' : ''}`}
      data-motion={reducedMotion ? 'paused' : 'running'}
    >
      {selected >= 0 ? (
        <StoryPanel
          index={selected}
          progress={progress}
          saved={saved}
          onAdvance={act}
          onTravel={travel}
          onMap={() => navigate('/story')}
        />
      ) : (
        <>
          <div className="story-route-main">
            <header className="story-page-heading">
              <div>
                <h1>Der Atlas der Winde</h1>
                <p>8 Level. Eine große Reise.</p>
              </div>
              <div className="story-route-tools">
                <span className="story-total-stars">
                  <Star aria-hidden />
                  {totalStars} / 24 <span>Sterne</span>
                </span>
                <button
                  ref={journalButton}
                  type="button"
                  className="story-journal-button"
                  aria-label="Reisetagebuch"
                  onClick={() => setJournal(true)}
                >
                  <BookOpen aria-hidden />
                  <span>Reisetagebuch</span>
                </button>
              </div>
            </header>
            <svg className="story-trail" viewBox="0 0 1536 1024" preserveAspectRatio="none" aria-hidden>
              <path d="M350 290 C450 260 520 390 650 320 S930 260 1140 300 S1390 400 1290 480 C1200 550 950 410 650 520 S400 650 580 680 S1020 560 900 680 S650 720 590 800 S1000 960 1220 850" />
            </svg>
            <nav className="story-level-route" aria-label="Deine Level-Reise">
              {STORY_LEVELS.map((level, index) => {
                const status = levelStatus(progress, index)
                const playing = progress.runs[level.id]?.status === 'playing'
                const active = index === current
                return (
                  <div
                    key={level.id}
                    className={`story-level-node is-${status}${active ? ' is-current' : ''}`}
                    style={
                      {
                        '--level-x': `${level.position.x}%`,
                        '--level-y': `${level.position.y}%`,
                        '--level-color': level.accent,
                      } as CSSProperties
                    }
                  >
                    <button
                      type="button"
                      data-story-route={index}
                      data-journey-chapter={index}
                      data-story-level={index}
                      aria-label={`Level ${index + 1}: ${level.place}, ${status === 'locked' ? 'noch gesperrt, Vorschau öffnen' : playing ? 'fortsetzen' : status === 'complete' ? 'erneut spielen' : 'starten'}`}
                      aria-current={active ? 'step' : undefined}
                      onClick={() => travel(index, status !== 'locked')}
                    >
                      <img
                        className="story-node-art"
                        src={levelAsset(level)}
                        loading="lazy"
                        alt=""
                        aria-hidden
                      />
                      <span className="story-node-number">{index + 1}</span>
                      {status === 'locked' && (
                        <span className="story-node-lock">
                          <LockKeyhole aria-hidden />
                        </span>
                      )}
                      <span className="story-node-label">
                        {active && <small>Level {index + 1}</small>}
                        <strong>{level.place}</strong>
                        <StoryStars count={progress.levels[level.id]?.stars ?? 0} />
                        {active && (
                          <span className="story-node-cta">
                            {playing
                              ? 'Fortsetzen'
                              : status === 'complete'
                                ? 'Erneut spielen'
                                : 'Level starten'}
                            <ArrowRight aria-hidden />
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                )
              })}
            </nav>
            <Compass className="story-map-compass" aria-hidden />
            <p className="story-map-rules">
              <span aria-hidden>
                <Heart />
                <Heart />
                <Heart />
              </span>
              3 Herzen <i>·</i> Hinweise werden knapper <i>·</i> Jedes Level wird schwerer
            </p>
          </div>
          <p className={`story-save-note${saved ? '' : ' is-unsaved'}`} role="status">
            {saved
              ? totalStars === 24
                ? 'Alle 24 Sterne! Du hast den Atlas der Winde gemeistert.'
                : 'Deine Sterne und laufenden Level werden auf diesem Gerät gespeichert.'
              : 'Dein Browser kann gerade nicht speichern. Du kannst weiterspielen; halte diese Seite geöffnet.'}
          </p>
        </>
      )}
      {journal && (
        <StoryJournal
          progress={progress}
          onReset={reset}
          onClose={() => {
            setJournal(false)
            requestAnimationFrame(() => journalButton.current?.focus())
          }}
        />
      )}
    </div>
  )
}
