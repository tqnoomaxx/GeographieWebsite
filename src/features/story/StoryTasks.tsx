import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, GripVertical, Lightbulb, ArrowRight } from 'lucide-react'
import { useGeoData } from '@/app/DataProvider'
import { FeatureMap } from '@/ui/FeatureMap'
import { createRng } from '@/engine/rng'
import { normalizeAnswer } from '@/engine/normalize'
import type { StoryLevel, StoryTask } from './levels'
import type { LevelRun, StoryAction } from './levelProgress'
import { StoryCountryMap } from './StoryCountryMap'
import '../play/script-fonts.css'

export function StoryTasks({
  level,
  index,
  task,
  run,
  advance,
}: {
  level: StoryLevel
  index: number
  task: StoryTask
  run: LevelRun
  advance: (action: StoryAction) => void
}) {
  const geo = useGeoData()
  const [text, setText] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const nextButton = useRef<HTMLButtonElement>(null)
  const correct = !!run.feedback?.correct
  const wrong = run.feedback && !correct
  const hinted = run.hints.includes(task.id)
  const choiceOptions = useMemo(
    () =>
      task.mode === 'choice'
        ? createRng(`${level.id}:${run.attempt}:${task.id}:choices`).shuffle(task.choices)
        : [],
    [level.id, task, run.attempt],
  )
  const features = useMemo(
    () =>
      task.mode === 'features'
        ? task.features.flatMap((id) => (geo.byId.get(id) ? [geo.byId.get(id)!] : []))
        : [],
    [task, geo.byId],
  )
  const answer = (value: string | string[]) =>
    advance({ type: 'answer', level: index, task: task.id, answer: value })
  const move = (from: number, to: number) => advance({ type: 'order', level: index, task: task.id, from, to })
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [task.id])
  useEffect(() => {
    if (correct) {
      nextButton.current?.focus({ preventScroll: true })
      if (window.matchMedia('(max-width: 800px)').matches)
        nextButton.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [correct])
  return (
    <section
      className={`story-task-panel${task.mode === 'map' || task.mode === 'features' ? ' is-map-task' : ''}${correct ? ' is-solved' : ''}`}
      aria-labelledby="story-task-heading"
      data-story-task={task.id}
      data-task-mode={task.mode}
    >
      <h2 id="story-task-heading" className="story-task-prompt" tabIndex={-1} ref={heading}>
        {task.prompt}
      </h2>
      {task.mode === 'order' && <p className="story-task-instruction">{task.instruction}</p>}
      {task.flag && (
        <img
          className="story-task-flag"
          src={`${import.meta.env.BASE_URL}media/flags/countries/${task.flag}.svg`}
          alt="Signalflagge"
        />
      )}
      {task.sample && (
        <div className="story-script-sample">
          <strong className="script-study-original" lang={task.sample.lang} dir={task.sample.dir ?? 'ltr'}>
            {task.sample.text}
          </strong>
        </div>
      )}
      {task.mode === 'choice' && (
        <div className="story-answers" role="group" aria-label="Deine Antwort">
          {choiceOptions.map((option, i) => {
            const rejected = run.rejected[task.id]?.includes(normalizeAnswer(option))
            return (
              <button
                key={option}
                type="button"
                onClick={() => answer(option)}
                disabled={correct || rejected}
                className={correct && option === task.answer ? 'is-correct' : rejected ? 'is-wrong' : ''}
              >
                <span aria-hidden>{String.fromCharCode(65 + i)}</span>
                <b>{option}</b>
                {correct && option === task.answer && <Check aria-hidden />}
              </button>
            )
          })}
        </div>
      )}
      {task.mode === 'input' && (
        <form
          className="story-input-form"
          onSubmit={(event) => {
            event.preventDefault()
            answer(text)
          }}
        >
          <label htmlFor="story-answer-input">Deine Antwort</label>
          <input
            id="story-answer-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Antwort eintippen …"
            maxLength={120}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="none"
            dir="auto"
            disabled={correct}
            aria-invalid={!!wrong}
          />
          {!correct && (
            <button className="story-primary" type="submit" disabled={!text.trim()}>
              Antwort prüfen <ArrowRight aria-hidden />
            </button>
          )}
        </form>
      )}
      {task.mode === 'order' && (
        <ol className="story-order" aria-label="Deine Reihenfolge">
          {run.orders[task.id]?.map((item, i) => (
            <li
              key={item}
              data-order-item={item}
              draggable={!correct}
              onDragStart={(event) => event.dataTransfer.setData('text/plain', item)}
              onDragOver={(event) => {
                if (!correct) event.preventDefault()
              }}
              onDrop={(event) => {
                event.preventDefault()
                const from = run.orders[task.id].indexOf(event.dataTransfer.getData('text/plain'))
                if (!correct) move(from, i)
              }}
            >
              <GripVertical aria-hidden />
              <span className="story-order-index">{i + 1}</span>
              <strong>{item}</strong>
              <button
                type="button"
                aria-label={`${item} nach oben`}
                data-order="up"
                disabled={correct || i === 0}
                onClick={() => move(i, i - 1)}
              >
                <ArrowUp aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`${item} nach unten`}
                data-order="down"
                disabled={correct || i === run.orders[task.id].length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ArrowDown aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}
      {task.mode === 'map' && (
        <StoryCountryMap
          countries={task.countries}
          onPick={answer}
          disabled={correct}
          correct={correct ? task.answer : undefined}
          wrong={wrong && typeof run.feedback?.given === 'string' ? run.feedback.given : undefined}
        />
      )}
      {task.mode === 'features' && (
        <FeatureMap
          entities={features}
          type={task.featureType}
          scope={task.scope}
          onPick={answer}
          disabled={correct}
          correct={correct ? task.answer : undefined}
          wrong={wrong && typeof run.feedback?.given === 'string' ? run.feedback.given : undefined}
        />
      )}
      <div className={`story-feedback${correct ? ' is-correct' : ''}`} role="status" aria-live="polite">
        {correct ? (
          <p>
            <Check aria-hidden />
            <span>
              <strong>Geschafft.</strong> {task.explanation}
            </span>
          </p>
        ) : wrong ? (
          <p>Das passt noch nicht. Ein Herz verloren – versuche es noch einmal.</p>
        ) : null}
      </div>
      {hinted && (
        <p className="story-hint">
          <Lightbulb aria-hidden />
          {task.hint}
        </p>
      )}
      <div className="story-task-actions">
        {correct ? (
          <button
            ref={nextButton}
            type="button"
            className="story-primary"
            onClick={() => advance({ type: 'next', level: index, task: task.id })}
          >
            {run.cursor + 1 === level.taskCount ? 'Level abschließen' : 'Weiter'} <ArrowRight aria-hidden />
          </button>
        ) : (
          <>
            <button
              type="button"
              className="story-hint-button"
              disabled={hinted || run.hints.length >= level.hintLimit}
              onClick={() => advance({ type: 'hint', level: index, task: task.id })}
            >
              <Lightbulb aria-hidden />{' '}
              {hinted ? 'Hinweis genutzt' : `Hinweis (${level.hintLimit - run.hints.length})`}
            </button>
            {task.mode === 'order' && (
              <button type="button" className="story-primary" onClick={() => answer(run.orders[task.id])}>
                Reihenfolge prüfen <ArrowRight aria-hidden />
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
