import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Compass, Lightbulb, LockKeyhole, Sparkles } from 'lucide-react'
import { STORY_CHAPTERS } from './chapters'
import type { ChapterProgress, ChapterStatus, StoryAction } from './storyProgress'

const EMPTY_CHAPTER: ChapterProgress = { started: false, solved: 0, collected: false }

export function StoryPanel({
  index,
  status,
  progress = EMPTY_CHAPTER,
  current,
  onAdvance,
  onTravel,
}: {
  index: number
  status: ChapterStatus
  progress?: ChapterProgress
  current: number
  onAdvance: (action: StoryAction) => void
  onTravel: (index: number) => void
}) {
  const chapter = STORY_CHAPTERS[index]
  const [feedback, setFeedback] = useState<{ task: number; choice: number; correct: boolean }>()
  const [hint, setHint] = useState(false)
  const [tried, setTried] = useState<number[]>([])
  const nextButton = useRef<HTMLButtonElement>(null)
  const taskHeading = useRef<HTMLHeadingElement>(null)
  const chapterHeading = useRef<HTMLHeadingElement>(null)
  const [focusQuestion, setFocusQuestion] = useState(false)
  useEffect(() => {
    if (feedback?.correct) {
      nextButton.current?.focus({ preventScroll: true })
      if (window.matchMedia('(max-width: 950px)').matches)
        nextButton.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [feedback])
  useEffect(() => {
    if (focusQuestion) {
      const target = taskHeading.current ?? chapterHeading.current
      target?.focus({ preventScroll: true })
      if (window.matchMedia('(max-width: 950px)').matches)
        target?.scrollIntoView({ block: taskHeading.current ? 'center' : 'start' })
    }
  }, [focusQuestion])

  const taskIndex = feedback?.task ?? progress.solved
  const task = chapter.tasks[taskIndex]
  const reward = progress.started && progress.solved === chapter.tasks.length && !feedback
  const complete = status === 'complete'
  const locked = status === 'locked'
  const playing = !locked && progress.started && !complete && !reward
  const answer = (choice: number) => {
    if (!task || feedback?.correct || tried.includes(choice)) return
    const correct = choice === task.answer
    setFocusQuestion(false)
    setFeedback({ task: taskIndex, choice, correct })
    if (correct) onAdvance({ type: 'solve', chapter: index, task: taskIndex, answer: choice })
    else setTried((previous) => [...previous, choice])
  }
  const next = () => {
    setFeedback(undefined)
    setHint(false)
    setTried([])
    setFocusQuestion(true)
  }

  return (
    <section
      className={`story-panel ${playing ? 'is-playing' : ''}`}
      aria-labelledby="story-chapter-title"
      data-story-chapter={chapter.id}
    >
      <p className="story-chapter-number">
        Kapitel {String(index + 1).padStart(2, '0')} <span>·</span> {chapter.place}
      </p>
      <h2 ref={chapterHeading} id="story-chapter-title" tabIndex={-1}>
        {chapter.title}
      </h2>
      <div className="story-heading-rule" />
      {playing && task ? (
        <>
          <div
            className="story-task-progress"
            aria-label={`Aufgabe ${taskIndex + 1} von ${chapter.tasks.length}`}
          >
            <span>
              Spur {taskIndex + 1} von {chapter.tasks.length}
            </span>
            <div aria-hidden>
              {chapter.tasks.map((_, i) => (
                <i
                  key={i}
                  className={i < progress.solved ? 'is-done' : i === taskIndex ? 'is-current' : ''}
                />
              ))}
            </div>
          </div>
          {task.flag && (
            <img
              className="story-task-flag"
              src={`${import.meta.env.BASE_URL}media/flags/countries/${task.flag}.svg`}
              alt="Die Signalflagge auf dem Hügel"
            />
          )}
          <h3 ref={taskHeading} tabIndex={-1} className="story-task-prompt">
            {task.prompt}
          </h3>
          <div className="story-answers" role="group" aria-label="Deine Antwort">
            {task.choices.map((choice, i) => (
              <button
                key={choice}
                type="button"
                onClick={() => answer(i)}
                disabled={feedback?.correct || tried.includes(i)}
                className={
                  feedback?.correct && i === task.answer ? 'is-correct' : tried.includes(i) ? 'is-wrong' : ''
                }
              >
                <span aria-hidden>{String.fromCharCode(65 + i)}</span>
                {choice}
                {feedback?.correct && i === task.answer ? <Check aria-hidden /> : null}
              </button>
            ))}
          </div>
          <div
            aria-live="polite"
            aria-atomic="true"
            className={`story-feedback ${feedback?.correct ? 'is-correct' : ''}`}
          >
            {feedback ? (
              feedback.correct ? (
                <p>
                  <strong>Spur gefunden.</strong> {task.explanation}
                </p>
              ) : (
                <p>
                  <strong>Noch eine andere Idee?</strong> {task.hint} Versuche es noch einmal.
                </p>
              )
            ) : null}
          </div>
          {feedback?.correct ? (
            <button ref={nextButton} className="story-primary" type="button" onClick={next}>
              {progress.solved === chapter.tasks.length ? 'Fundstück entdecken' : 'Der Spur folgen'}
              <ArrowRight aria-hidden />
            </button>
          ) : (
            <div className="story-hint-area">
              <button
                type="button"
                className="story-hint-button"
                aria-expanded={hint}
                onClick={() => setHint(!hint)}
              >
                <Lightbulb aria-hidden />
                {hint ? 'Hinweis ausblenden' : 'Mira um einen Hinweis bitten'}
              </button>
              {hint && <p className="story-hint">{task.hint}</p>}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="story-description">{reward || complete ? chapter.ending : chapter.description}</p>
          {!reward && !complete && (
            <div className="story-dialogue">
              <span className="story-mira" aria-hidden>
                M
              </span>
              <div>
                <span>Mira, die Kartografin</span>
                <blockquote>„{chapter.dialogue}“</blockquote>
              </div>
            </div>
          )}
          <div className={`story-artifact ${reward || complete ? 'is-found' : ''}`}>
            <span className="story-artifact-icon">
              {reward || complete ? <Sparkles aria-hidden /> : <Compass aria-hidden />}
            </span>
            <div>
              <small>
                {complete
                  ? 'In deinem Reisetagebuch'
                  : reward
                    ? 'Fundstück entdeckt'
                    : 'Fundstück dieses Kapitels'}
              </small>
              <strong>{chapter.artifact}</strong>
            </div>
          </div>
          {(reward || complete) && (
            <p className="story-artifact-description">{chapter.artifactDescription}</p>
          )}
          {locked ? (
            <div className="story-locked">
              <p>
                <LockKeyhole aria-hidden />
                Dieser Ort wartet noch auf dich.
              </p>
              <button type="button" className="story-primary" onClick={() => onTravel(current)}>
                Weiter mit Kapitel {current + 1}
                <ArrowRight aria-hidden />
              </button>
            </div>
          ) : complete ? (
            <>
              <p className="story-complete-note">
                <Check aria-hidden />
                {index === STORY_CHAPTERS.length - 1
                  ? 'Abenteuer abgeschlossen · Alle acht Fundstücke vereint'
                  : 'Kapitel abgeschlossen'}
              </p>
              <button
                type="button"
                className="story-primary"
                onClick={() => onTravel(index === STORY_CHAPTERS.length - 1 ? 0 : current)}
              >
                {index === STORY_CHAPTERS.length - 1 ? 'Die Insel wieder besuchen' : 'Reise fortsetzen'}
                <ArrowRight aria-hidden />
              </button>
            </>
          ) : reward ? (
            <button
              type="button"
              className="story-primary"
              onClick={() => onAdvance({ type: 'collect', chapter: index })}
            >
              {' '}
              {index === STORY_CHAPTERS.length - 1 ? 'Den Atlas vollenden' : 'Ins Reisetagebuch legen'}
              <Check aria-hidden />
            </button>
          ) : (
            <>
              <p className="story-goal">{chapter.goal}</p>
              <button
                type="button"
                className="story-primary"
                onClick={() => {
                  onAdvance({ type: 'start', chapter: index })
                  setFocusQuestion(true)
                }}
              >
                {index === 0 ? 'Abenteuer beginnen' : 'Kapitel beginnen'}
                <ArrowRight aria-hidden />
              </button>
            </>
          )}
        </>
      )}
    </section>
  )
}
