import { Component, Suspense, lazy, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookOpen, Check, Compass, HardDrive, LockKeyhole } from 'lucide-react'
import { useDocumentTitle } from '@/app/hooks'
import { STORY_CHAPTERS } from './chapters'
import { chapterStatus, currentChapterIndex, type StoryAction } from './storyProgress'
import { useStoryProgress } from './useStoryProgress'
import { StoryPanel } from './StoryPanel'
import { StoryJournal } from './StoryJournal'
import './story.css'

const StoryIsland = lazy(() => import('./StoryIsland3D'))

function IslandFallback() {
  return (
    <div className="story-island-fallback">
      <Compass aria-hidden />
      <strong>Die Windinsel wartet auf dich.</strong>
      <p>Die 3D-Ansicht ist hier nicht verfügbar. Du kannst alle Kapitel über die Reiseroute spielen.</p>
    </div>
  )
}
class IslandBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <IslandFallback /> : this.props.children
  }
}
function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function StoryPage() {
  useDocumentTitle('Der Atlas der Winde')
  const { progress, saved, advance, reset } = useStoryProgress()
  const current = currentChapterIndex(progress)
  const [selected, setSelected] = useState(current)
  const [journal, setJournal] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const journalButton = useRef<HTMLButtonElement>(null)
  const webgl = useMemo(supportsWebGL, [])
  const collected = STORY_CHAPTERS.filter((chapter) => progress.chapters[chapter.id]?.collected).length
  // Task answers do not rebuild the expensive scene; only collected artifacts change its appearance.
  const islandChapters = useMemo(
    () =>
      STORY_CHAPTERS.map((chapter, index) => ({
        station: chapter.station,
        title: chapter.title,
        status: chapterStatus(progress, index),
      })),
    [collected],
  )
  const travel = useCallback((index: number) => {
    setSelected(index)
    if (window.matchMedia('(max-width: 950px)').matches)
      panel.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
    requestAnimationFrame(() =>
      panel.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }),
    )
  }, [])
  const act = (action: StoryAction) => {
    advance(action)
    if (action.type === 'collect' && selected < STORY_CHAPTERS.length - 1) travel(selected + 1)
  }

  return (
    <div className="story-page">
      <header className="story-page-heading">
        <div>
          <h1>Der Atlas der Winde</h1>
          <p>Eine Insel. Acht Kapitel. Dein Abenteuer.</p>
        </div>
        <button
          ref={journalButton}
          type="button"
          className="story-journal-button"
          aria-label="Reisetagebuch"
          onClick={() => setJournal(true)}
        >
          <BookOpen aria-hidden />
          <span>Reisetagebuch</span>
          {collected > 0 && <span className="story-journal-count">{collected}/8</span>}
        </button>
      </header>
      <div className="story-workspace">
        <IslandBoundary>
          {webgl ? (
            <Suspense
              fallback={
                <div className="story-island-loading" role="status">
                  <Compass aria-hidden />
                  <span>Die Windinsel taucht am Horizont auf …</span>
                </div>
              }
            >
              <StoryIsland chapters={islandChapters} selected={selected} onSelect={travel} />
            </Suspense>
          ) : (
            <IslandFallback />
          )}
        </IslandBoundary>
        <div ref={panel} className="story-panel-anchor">
          <StoryPanel
            key={`${selected}:${progress.chapters[STORY_CHAPTERS[selected].id]?.collected ?? false}`}
            index={selected}
            current={current}
            status={chapterStatus(progress, selected)}
            progress={progress.chapters[STORY_CHAPTERS[selected].id]}
            onAdvance={act}
            onTravel={travel}
          />
        </div>
      </div>
      <section className="story-journey" aria-labelledby="story-journey-title">
        <div className="story-journey-heading">
          <h2 id="story-journey-title">Die Reise</h2>
          <span>
            {collected === 8 ? 'Dein Atlas ist vollständig.' : `${collected} von 8 Kapiteln abgeschlossen`}
          </span>
        </div>
        <ol>
          {STORY_CHAPTERS.map((chapter, index) => {
            const status = chapterStatus(progress, index)
            return (
              <li key={chapter.id} className={`is-${status} ${index === selected ? 'is-selected' : ''}`}>
                <button
                  type="button"
                  onClick={() => travel(index)}
                  aria-current={index === selected ? 'step' : undefined}
                  data-journey-chapter={index}
                  aria-label={`${chapter.place}, ${status === 'locked' ? 'noch verschlossen' : status === 'complete' ? 'abgeschlossen' : 'spielbar'}`}
                >
                  <span className="story-journey-index">
                    {status === 'complete' ? <Check aria-hidden /> : index + 1}
                  </span>
                  <span className="story-journey-copy">
                    <strong>
                      {status === 'locked' && <LockKeyhole aria-hidden />}
                      {chapter.place}
                    </strong>
                    <small>{chapter.title}</small>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>
      <p className={`story-save-note ${saved ? '' : 'is-unsaved'}`} role="status">
        <HardDrive aria-hidden />
        {saved
          ? 'Dein Fortschritt wird auf diesem Gerät gespeichert.'
          : 'Dein Browser kann gerade nicht speichern. Du kannst weiterspielen; halte diese Seite geöffnet.'}
      </p>
      {journal && (
        <StoryJournal
          progress={progress}
          onClose={() => {
            setJournal(false)
            journalButton.current?.focus()
          }}
          onReset={() => {
            reset()
            setSelected(0)
          }}
        />
      )}
    </div>
  )
}
