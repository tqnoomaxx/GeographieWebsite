import { ArrowLeft, ArrowRight, Compass, Heart, LockKeyhole, RotateCcw, Star, Trophy } from 'lucide-react'
import { useMemo, useEffect, useRef, type CSSProperties } from 'react'
import { useDataResources, useGeoData, type DataResource } from '@/app/DataProvider'
import { ErrorState } from '@/ui'
import { STORY_LEVELS, STORY_LIVES, levelAsset } from './levels'
import {
  currentTask,
  currentLevelIndex,
  levelStatus,
  runStars,
  type StoryAction,
  type StoryProgress,
} from './levelProgress'
import { StoryTasks } from './StoryTasks'
import { StoryStars } from './StoryStars'
import { QuizNotesButton } from '@/features/notes/QuizNotesButton'

export function StoryPanel({
  index,
  progress,
  saved,
  onAdvance,
  onTravel,
  onMap,
}: {
  index: number
  progress: StoryProgress
  saved: boolean
  onAdvance: (action: StoryAction) => void
  onTravel: (index: number, start?: boolean) => void
  onMap: () => void
}) {
  const level = STORY_LEVELS[index]
  const geo = useGeoData()
  const resourceKeys = useMemo<DataResource[]>(
    () => [
      'countries',
      ...new Set(
        level.tasks.flatMap((task): DataResource[] =>
          task.mode === 'features' ? [task.featureType === 'river' ? 'rivers' : 'mountains'] : [],
        ),
      ),
    ],
    [level],
  )
  const resources = useDataResources(resourceKeys)
  const run = progress.runs[level.id]
  const status = levelStatus(progress, index)
  const task = currentTask(level, run)
  const hearts = STORY_LIVES - (run?.mistakes ?? 0)
  const finished = run?.status === 'cleared'
  const failed = run?.status === 'failed'
  const completedTasks = finished ? level.taskCount : (run?.cursor ?? 0) + (run?.feedback?.correct ? 1 : 0)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (finished || failed) resultHeading.current?.focus({ preventScroll: true })
  }, [finished, failed])
  const answerName = (value: string) => geo.byId.get(value)?.names.de ?? value
  return (
    <div
      className={`story-level-stage scene-${level.biome}`}
      data-scene={level.biome}
      data-level={index + 1}
      style={{ '--scene-accent': level.accent } as CSSProperties}
    >
      <img className="story-scene-art" src={levelAsset(level)} alt="" aria-hidden fetchPriority="high" />
      <header className="story-level-hud">
        <button className="story-map-back" type="button" onClick={onMap}>
          <ArrowLeft aria-hidden />
          <span>Zur Karte</span>
        </button>
        <div className="story-hud-center">
          <h1>
            Level {index + 1} · {level.place}
          </h1>
          <div
            className="story-level-progress"
            role="progressbar"
            aria-label="Level-Fortschritt"
            aria-valuemin={0}
            aria-valuemax={level.taskCount}
            aria-valuenow={completedTasks}
          >
            {Array.from({ length: level.taskCount }, (_, i) => (
              <i key={i} className={i < completedTasks ? 'is-done' : ''} />
            ))}
          </div>
          <span>
            Prüfung {Math.min((run?.cursor ?? 0) + 1, level.taskCount)} / {level.taskCount}
          </span>
        </div>
        <div className="story-hud-stats">
          <QuizNotesButton context={`Story · Level ${index + 1}: ${level.place}`} />
          <div className="story-hearts" role="img" aria-label={`${hearts} von ${STORY_LIVES} Herzen`}>
            {[0, 1, 2].map((i) => (
              <Heart key={i} aria-hidden className={i < hearts ? 'is-full' : ''} />
            ))}
          </div>
          <span className="story-best-stars" title="Deine beste Leistung">
            <Star aria-hidden />
            {progress.levels[level.id]?.stars ?? 0}/3
          </span>
        </div>
      </header>
      <div className="story-playfield">
        <p className="story-scene-caption">
          <Compass aria-hidden />
          <span>{level.goal}</span>
        </p>
        {status === 'locked' ? (
          <section className="story-task-panel story-intro story-locked" aria-label="Level noch gesperrt">
            <LockKeyhole className="story-result-icon" aria-hidden />
            <h2>{level.place}</h2>
            <p>{level.description}</p>
            <p>Schließe zuerst Level {index} ab, um diese Welt zu betreten.</p>
            <button
              className="story-primary"
              type="button"
              onClick={() => onTravel(currentLevelIndex(progress), true)}
            >
              Zum aktuellen Level <ArrowRight aria-hidden />
            </button>
          </section>
        ) : resources.error ? (
          <section className="story-task-panel">
            <ErrorState
              message="Die Karten für dieses Level konnten nicht geladen werden."
              onRetry={resources.retry}
            />
          </section>
        ) : resources.loading ? (
          <section className="story-task-panel story-intro" role="status">
            <Compass className="story-result-icon" aria-hidden />
            <h2>Dein Atlas wird aufgeschlagen …</h2>
            <p>Die Karten für {level.place} werden geladen.</p>
          </section>
        ) : failed || finished ? (
          <section
            className={`story-task-panel story-result${finished ? ' is-victory' : ''}`}
            data-story-result={finished ? 'cleared' : 'failed'}
          >
            {finished ? (
              <Trophy className="story-result-icon" aria-hidden />
            ) : (
              <Heart className="story-result-icon is-empty" aria-hidden />
            )}
            <h2 ref={resultHeading} tabIndex={-1}>
              {finished
                ? index === STORY_LEVELS.length - 1
                  ? 'Der Atlas erwacht.'
                  : 'Level geschafft!'
                : 'Ein neuer Versuch wartet.'}
            </h2>
            {finished ? (
              <>
                <StoryStars count={runStars(run!)} large />
                <p>{level.ending}</p>
                <div className="story-earned-artifact">
                  <Compass aria-hidden />
                  <div>
                    <small>Fundstück erhalten</small>
                    <strong>{level.artifact}</strong>
                  </div>
                </div>
                <p className="story-result-stats">
                  {level.taskCount} Prüfungen · {run!.mistakes} Fehler · {run!.hints.length} Hinweise
                </p>
                <button
                  className="story-primary"
                  type="button"
                  onClick={() => (index < STORY_LEVELS.length - 1 ? onTravel(index + 1, true) : onMap())}
                >
                  {index < STORY_LEVELS.length - 1 ? 'Nächstes Level' : 'Zur Reisekarte'}{' '}
                  <ArrowRight aria-hidden />
                </button>
                <button
                  className="story-secondary"
                  type="button"
                  onClick={() => onAdvance({ type: 'retry', level: index })}
                >
                  {(progress.levels[level.id]?.stars ?? 0) < 3
                    ? 'Auf drei Sterne spielen'
                    : 'Noch einmal spielen'}{' '}
                  <RotateCcw aria-hidden />
                </button>
              </>
            ) : (
              <>
                <p>
                  Drei Fehler, aber kein verlorener Weg. Sieh dir die Spuren an und versuche es mit einer
                  neuen Aufgabenfolge. Deine besten Sterne bleiben erhalten.
                </p>
                <details className="story-review">
                  <summary>Aus deinen Fehlern lernen</summary>
                  {level.tasks
                    .filter((item) => run!.rejected[item.id]?.length)
                    .map((item) => (
                      <div key={item.id}>
                        <strong>{item.prompt}</strong>
                        <p>
                          {Array.isArray(item.answer)
                            ? item.answer.map(answerName).join(' · ')
                            : answerName(item.answer)}
                        </p>
                        <small>{item.explanation}</small>
                      </div>
                    ))}
                </details>
                <button
                  className="story-primary"
                  type="button"
                  onClick={() => onAdvance({ type: 'retry', level: index })}
                >
                  Neu versuchen <RotateCcw aria-hidden />
                </button>
              </>
            )}
          </section>
        ) : !run ? (
          <section className="story-task-panel story-intro">
            <span className="story-level-rank">{level.rank}</span>
            <h2>{level.place}</h2>
            <p>{level.description}</p>
            <blockquote>
              „{level.dialogue}“ <cite>— Mira</cite>
            </blockquote>
            <div className="story-intro-rules">
              <span>{level.taskCount} Prüfungen</span>
              <span>3 Herzen</span>
              <span>{level.hintLimit} Hinweise</span>
            </div>
            <p className="story-mechanics">{level.mechanics}</p>
            <button
              className="story-primary"
              type="button"
              onClick={() => onAdvance({ type: 'start', level: index })}
            >
              Level starten <ArrowRight aria-hidden />
            </button>
          </section>
        ) : task ? (
          <StoryTasks
            key={`${level.id}:${run.attempt}:${task.id}`}
            index={index}
            level={level}
            task={task}
            run={run}
            advance={onAdvance}
          />
        ) : null}
      </div>
      {!saved && (
        <p className="story-save-note is-unsaved" role="status">
          Dein Browser kann gerade nicht speichern. Halte diese Seite geöffnet, um weiterzuspielen.
        </p>
      )}
    </div>
  )
}
