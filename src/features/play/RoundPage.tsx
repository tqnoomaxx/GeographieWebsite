import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { advanceSession, baseQuestionPosition, baseQuestionTotal, buildSession, labelFor, pendingRepeatCount, recordAnswer, setupOf, skipQuestion, type QuizSession } from '@/engine/session'
import { defaultRound, fromQuery, roundPath, type RoundConfig } from '@/engine/round'
import { isCategory, quizFor } from '@/config/quizzes'
import type { CategoryId, Question } from '@/engine/types'
import { getRepository } from '@/services/progress'
import { applySession, recomputeLongQuests, type RoundOutcome } from '@/services/gamification'
import { XP } from '@/config/xp'
import { Card, ErrorState, Skeleton, ProgressBar, entityPath } from '@/ui'
import { Icons } from '@/ui/icons'
import { WorldMap, RegionMapView } from '@/ui/maps'
import { ReportDialog } from '@/features/legal/ReportDialog'
import { RoundTitle, useRoundLabel } from './RoundLabel'
import { ChoiceVisualization, hasSideVisualization, QuestionVisualization, usesVisualOptions } from './QuizVisuals'

export default function RoundPage() {
  const { t } = useTranslation()
  const { category: categoryParam, sessionId } = useParams<{ category?: string; sessionId?: string }>()
  const category: CategoryId | undefined = isCategory(categoryParam) ? categoryParam : undefined
  const [params] = useSearchParams()
  const geo = useGeoData()
  const navigate = useNavigate()
  const repo = getRepository()
  const [session, setSession] = useState<QuizSession | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const startedRef = useRef(false)

  // Gespeicherte Runde (Fortsetzen) oder neues Setup aus der URL
  const [stored, setStored] = useState<QuizSession | null | undefined>(sessionId ? undefined : null)
  useEffect(() => {
    if (!sessionId) return
    repo.getSession(sessionId).then((s) => (s ? setStored({ ...s, setup: setupOf(s) }) : setError(new Error('Runde nicht gefunden'))))
  }, [sessionId, repo])
  const setup: RoundConfig | null = stored ? stored.setup : stored === null && category ? fromQuery(category, params) : null
  useEffect(() => {
    if (!sessionId && !category) setError(new Error(t('play.no_questions')))
  }, [sessionId, category, t])
  const label = useRoundLabel()
  useDocumentTitle(setup ? label(setup).title : undefined)

  useEffect(() => {
    if (!geo.ready || startedRef.current || !setup) return
    const needs = quizFor(setup.category).needs ?? []
    if (needs.includes('regions') && !geo.regionsLoaded) return void geo.ensureRegions()
    if (needs.includes('plates') && !geo.platesLoaded) return void geo.ensurePlates()
    startedRef.current = true
    ;(async () => {
      try {
        if (stored) return setSession(stored)
        const progress = await repo.getAllEntityProgress()
        let s = buildSession(geo.contextFor(setup.scope), setup, { progress })
        if (!s.questions.length && category && !setup.only?.length) {
          const fallback = defaultRound(category)
          s = buildSession(geo.contextFor(fallback.scope), fallback, { progress })
        }
        if (!s.questions.length) throw new Error(t('play.no_questions'))
        setSession(s)
        if (s.mode === 'full') {
          await repo.saveSession(s)
          for (const old of (await repo.getOpenSessions()).slice(5)) await repo.deleteSession(old.id) // höchstens 5 offene Runden
        }
      } catch (e) {
        setError(e as Error)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.ready, geo.regionsLoaded, geo.platesLoaded, stored, category])

  // Kontext nach Nachladen aktualisieren (für das Nachladen weiterer Fragen bei „Alle“)
  const ctx = useMemo(() => (session && geo.ready ? geo.contextFor(session.scope) : null), [session?.scope, geo.ready, geo.regionsLoaded, geo.platesLoaded, geo, session])

  /** Zwischenstand nur bei „Alle“-Runden speichern (R11). */
  const persist = useCallback(async (s: QuizSession) => s.mode === 'full' && repo.saveSession(s), [repo])

  const finish = useCallback(
    async (s: QuizSession) => {
      const done = { ...s, completedAt: new Date().toISOString() }
      setSession(done)
      await repo.saveSession(done)
      const out = await applySession(repo, done, geo.byId)
      await recomputeLongQuests(repo, geo.byId)
      setOutcome(out)
    },
    [repo, geo.byId],
  )

  const answer = useCallback(
    async (given: string) => {
      if (!session) return
      const next = recordAnswer(session, given)
      if (next === session) return
      setSession(next)
      await persist(next)
    },
    [session, persist],
  )

  const skip = useCallback(async () => {
    if (!session) return
    const next = skipQuestion(session)
    setSession(next)
    await persist(next)
  }, [session, persist])

  const advance = useCallback(async () => {
    if (!session || !ctx) return
    const next = advanceSession(session, ctx)
    if (!next) return finish({ ...session, position: session.position + 1 })
    setSession(next)
    await persist(next)
  }, [session, ctx, finish, persist])

  const quit = useCallback(async () => {
    if (!session) return navigate('/play')
    if (session.mode === 'full') {
      await repo.saveSession(session)
      return navigate('/play')
    }
    if (session.questions.some((q) => q.given !== undefined)) await finish(session)
    else navigate('/play')
  }, [session, repo, navigate, finish])

  if (error) return <div className="mx-auto max-w-md p-4"><ErrorState message={error.message} onRetry={() => navigate('/play')} /></div>
  if (!session) return <div className="mx-auto max-w-2xl p-4"><Skeleton className="h-8 w-40" /><Skeleton className="mt-6 h-48" /><Skeleton className="mt-6 h-14" /><Skeleton className="mt-2 h-14" /></div>
  if (session.completedAt) return <ResultView session={session} outcome={outcome} />

  const current = session.questions[session.position]
  const total = baseQuestionTotal(session)
  const position = baseQuestionPosition(session)
  const repeats = pendingRepeatCount(session)
  return (
    <div className="atlas-surface min-h-dvh">
      <header className="quiz-topbar">
        <div className="quiz-topbar-inner">
          <div className="quiz-topbar-identity">
            <button className="quiz-quit" onClick={quit} aria-label={t('nav.quit')}>
              <span aria-hidden>←</span> <span className="hidden sm:inline">{t('nav.quit')}</span>
            </button>
            <span className="quiz-topbar-divider" aria-hidden />
            <RoundTitle setup={session.setup} className="min-w-0 text-xs sm:text-sm" />
          </div>
          <div className="quiz-topbar-progress">
            <ProgressBar value={position / total} />
            <strong>{position} / {total}</strong>
          </div>
          <div className="quiz-topbar-score">
            {repeats > 0 && <span className="quiz-repeat-count">↻ {repeats}</span>}
            {session.streak > 1 && <span className="inline-flex items-center gap-1 text-warn"><Icons.flame className="h-4 w-4" /> {session.streak}</span>}
            <strong>{session.points.toLocaleString('de-DE')} <span className="hidden sm:inline">{t('play.points')}</span></strong>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col px-4 py-7 sm:px-8 md:py-10 lg:px-12">
        <QuestionView key={current.question.id} q={current.question} given={current.given} correct={current.correct} repeated={current.repeated} attempts={current.attempts ?? 0} lastWrong={session.lastWrongMapGuess} onAnswer={answer} onNext={advance} onSkip={current.question.map?.kind === 'europe' ? skip : undefined} />
      </main>
    </div>
  )
}

function QuestionView({ q, given, correct, repeated, attempts, lastWrong, onAnswer, onNext, onSkip }: { q: Question; given?: string; correct?: boolean; repeated?: boolean; attempts: number; lastWrong?: string; onAnswer: (v: string) => void; onNext: () => void; onSkip?: () => void }) {
  const { t } = useTranslation()
  const geo = useGeoData()
  const [text, setText] = useState('')
  const [report, setReport] = useState(false)
  const answered = given !== undefined
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (q.question_type === 'text_input') inputRef.current?.focus()
  }, [q.id, q.question_type])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        if (answered && e.key === 'Enter') onNext()
        return
      }
      if (answered && (e.key === 'Enter' || e.key === ' ')) return onNext()
      if (!answered && q.options && /^[1-4]$/.test(e.key)) {
        const opt = q.options[Number(e.key) - 1]
        if (opt) onAnswer(opt.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, q, onAnswer, onNext])

  // Europa-Karte: Feedback nach 650 ms automatisch weiter (wie Vorgängerversion)
  useEffect(() => {
    if (!answered || q.map?.kind !== 'europe') return
    const t = setTimeout(onNext, 650)
    return () => clearTimeout(t)
  }, [answered, q.map?.kind, onNext])
  const correctLabel = labelFor(q, q.answer, geo.byId)
  const givenLabel = given && given !== '__skip__' ? labelFor(q, given, geo.byId) : undefined
  const givenImage = given ? q.options?.find((option) => option.id === given)?.image : undefined
  const correctImage = q.options?.find((option) => option.id === q.answer)?.image
  const answerEntity = geo.byId.get(q.answer)
  const entities = q.entities.map((id) => geo.byId.get(id)).filter((entity): entity is NonNullable<typeof entity> => !!entity)
  const sideVisual = hasSideVisualization(q) && !answered
  const visualOptions = usesVisualOptions(q)
  const xp = correct ? (repeated ? XP.wrong_answer : XP.correct_answer + (XP.difficulty_bonus[q.difficulty] ?? 0)) : XP.wrong_answer

  return (
    <div className="flex flex-1 flex-col" data-question-type={q.question_type} data-quiz-kind={q.type} data-generator={q.metadata.generator} data-answer={q.answer}>
      {repeated && <p className="eyebrow mb-3 text-center !text-accent">↻ {t('play.repeated')}</p>}
      <div className={answered && !q.map ? 'quiz-feedback-layout' : sideVisual ? 'quiz-water-layout' : ''}>
        {sideVisual && <QuestionVisualization question={q} entities={entities} side />}
        <section className="quiz-question-main">
          {q.media && (
            <figure className="quiz-prompt-media">
              <img
                src={q.media.url}
                alt={q.media.alt}
                className={`${q.map ? 'max-h-24 md:max-h-32' : 'max-h-48 md:max-h-56'} w-auto max-w-full rounded-xl border border-line object-contain ${q.media.kind === 'flag' ? 'bg-white' : ''}`}
                decoding="async"
              />
              {answered && q.media.attribution && (
                <figcaption className="mt-1 text-[11px] text-ink-2">
                  {q.media.source_url ? <a href={q.media.source_url} target="_blank" rel="noreferrer" className="underline">{q.media.attribution}</a> : q.media.attribution}
                </figcaption>
              )}
            </figure>
          )}
          <h1 className={`quiz-question-heading ${q.map ? 'quiz-question-heading-map' : ''} ${sideVisual ? 'quiz-question-heading-side' : ''}`}>{t(q.prompt.key, q.prompt.params)}</h1>
          {!sideVisual && <QuestionVisualization question={q} entities={entities} />}

      {q.map && (
        <div className="quiz-map-stage">
          {q.map.kind === 'world' ? (
            <WorldMap onPick={onAnswer} disabled={answered} correct={answered ? q.answer : undefined} wrong={!answered ? lastWrong : undefined} />
          ) : (
            <RegionMapView iso2={q.map.kind === 'europe' ? 'europe' : q.map.iso2!} onPick={onAnswer} disabled={answered} correct={answered ? q.answer : undefined} wrong={!answered ? lastWrong : undefined} />
          )}
          {!answered && <p className="mt-2 text-center text-sm text-ink-2">{attempts > 0 ? `${t('play.try_again')} (${attempts})` : t('play.map_hint')}</p>}
          {!answered && onSkip && <button type="button" className="btn-ghost mx-auto mt-1 block text-sm" onClick={onSkip}>{t('play.skip')} →</button>}
        </div>
      )}

      {q.question_type === 'text_input' && (
        <form
          className="quiz-text-answer"
          onSubmit={(e) => {
            e.preventDefault()
            if (!answered && text.trim()) onAnswer(text)
          }}
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={answered}
            placeholder={t('play.type_answer')}
            autoComplete="off"
            autoCapitalize="words"
            className="min-h-14 min-w-0 flex-1 rounded-xl border border-line bg-card px-5 text-lg shadow-sm"
            aria-label={t('play.type_answer')}
          />
          {!answered && (
            <button className="btn-primary" type="submit">
              {t('play.check')}
            </button>
          )}
        </form>
      )}

      {q.options && (
        <div className={`quiz-options ${visualOptions ? 'quiz-options-visual' : ''} ${sideVisual ? 'quiz-options-side' : ''}`} role="group">
          {q.options.map((o, i) => {
            const isAnswer = o.id === q.answer
            const isGiven = o.id === given
            const cls = answered ? (isAnswer ? 'quiz-answer-correct' : isGiven ? 'quiz-answer-wrong' : 'opacity-45') : 'quiz-answer'
            const optionLabel = o.label || geo.byId.get(o.id)?.names.de || o.id
            const optionEntity = geo.byId.get(o.id)
            const choiceVisual = visualOptions && q.question_type !== 'image_choice'
            return (
              <button
                key={o.id}
                type="button"
                disabled={answered}
                onClick={() => onAnswer(o.id)}
                className={`quiz-option ${o.image || choiceVisual ? 'quiz-option-media' : ''} ${cls}`}
                aria-label={optionLabel}
                data-option-id={o.id}
              >
                <span className="quiz-option-number">{i + 1}</span>
                {o.image && <img src={o.image} alt="" className="quiz-option-image" />}
                {choiceVisual && <ChoiceVisualization question={q} entity={optionEntity} />}
                {(!o.image || answered) && <span className="quiz-option-label">{optionLabel}</span>}
                {answered && isAnswer && <span className="quiz-option-mark quiz-option-mark-correct" aria-hidden>✓</span>}
                {answered && isGiven && !isAnswer && <span className="quiz-option-mark quiz-option-mark-wrong" aria-hidden>✕</span>}
              </button>
            )
          })}
        </div>
      )}
        </section>

      {answered && (
        <aside className={`quiz-feedback ${correct ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}`} role="status" aria-live="polite">
          <p className="quiz-feedback-title">{correct ? `✓ ${t('play.correct')}` : q.question_type === 'map_click' && given !== '__skip__' ? `✓ ${t('play.found_after', { n: attempts })}` : `✕ ${t('play.wrong')}`}</p>
          {givenLabel && <p className="quiz-feedback-label">{t('play.your_answer')}</p>}
          {givenLabel && <div className="quiz-feedback-answer">{givenImage && <img src={givenImage} alt="" />}<p className="font-medium">{givenLabel}</p></div>}
          {!correct && q.question_type !== 'map_click' && <><p className="quiz-feedback-label">{t('play.correct_answer')}</p><div className="quiz-feedback-answer">{correctImage && <img src={correctImage} alt="" />}<p className="font-medium">{correctLabel}</p></div></>}
          {q.question_type === 'map_click' && <p>{given === '__skip__' ? t('play.would_be', { answer: correctLabel }) : correctLabel}</p>}
          {q.explanation && <p className="mt-3 border-t border-ink/10 pt-3 text-sm text-ink-2">{q.explanation}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{correct ? t('play.xp', { xp }) : t('play.xp_try', { xp })}</span>
            {answerEntity && (
              <Link to={entityPath(answerEntity)} className="text-ink-2 underline">
                {answerEntity.names.de} →
              </Link>
            )}
            <button className="ml-auto text-xs text-ink-2 underline" onClick={() => setReport(true)}>
              ⚠ {t('play.report')}
            </button>
          </div>
          <button className="btn-navy mt-4 w-full" onClick={onNext} autoFocus>
            {t('play.next')}
          </button>
        </aside>
      )}
      </div>
      {report && <ReportDialog question={q} onClose={() => setReport(false)} />}
    </div>
  )
}

function ResultView({ session, outcome }: { session: QuizSession; outcome: RoundOutcome | null }) {
  const { t } = useTranslation()
  const geo = useGeoData()
  const answered = session.questions.filter((q) => q.given !== undefined)
  const baseAnswered = answered.filter((q) => !q.repeated)
  const correct = baseAnswered.filter((q) => q.correct).length
  const wrong = [...new Set(baseAnswered.filter((q) => !q.correct).map((q) => q.question.entities[0]))]
  const recovered = new Set(answered.filter((q) => q.repeated && q.correct).map((q) => q.question.entities[0])).size
  const pct = baseAnswered.length ? Math.round((correct / baseAnswered.length) * 100) : 0
  const again = roundPath({ ...session.setup, only: undefined })
  const repeat = roundPath({ ...session.setup, length: wrong.length, only: wrong, repeat: false })
  const firstTry = correct
  const baseTotal = baseAnswered.length
  return (
    <div className="atlas-surface min-h-dvh px-4 pb-24 pt-10 md:pb-12 md:pt-16">
      <div className="mx-auto w-full max-w-3xl text-center">
      <p className="eyebrow mb-3">{t('play.expedition_report')}</p>
      <h1 className="text-4xl font-medium md:text-6xl">{session.mode === 'full' ? t('play.full_done') : t('play.round_done')}</h1>
      <RoundTitle setup={session.setup} className="mx-auto mt-3 w-fit text-left" />
      <div className="mx-auto mt-7 flex h-44 w-44 flex-col items-center justify-center rounded-full border-[10px] border-accent-soft bg-card shadow-sm">
        <p className="text-5xl font-semibold tabular-nums">{pct}<span className="text-2xl">%</span></p>
        <p className="text-sm text-ink-2">{t('play.result', { correct, total: baseTotal })}</p>
      </div>
      <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Card className="p-3"><div className="text-xl font-semibold tabular-nums">{session.points.toLocaleString('de-DE')}</div><div className="text-xs text-ink-2">{t('play.points')}</div></Card>
        <Card className="p-3"><div className="text-xl font-semibold tabular-nums">{session.bestStreak}</div><div className="text-xs text-ink-2">{t('play.best_streak')}</div></Card>
        <Card className="p-3"><div className="text-xl font-semibold tabular-nums">{firstTry}/{baseTotal}</div><div className="text-xs text-ink-2">{t('play.first_try')}</div></Card>
        <Card className="p-3"><div className="text-xl font-semibold tabular-nums">{recovered}</div><div className="text-xs text-ink-2">{t('play.recovered')}</div></Card>
      </div>
      {outcome ? <p className="mt-2 text-lg font-medium text-accent">+{outcome.xp} XP</p> : <Skeleton className="mx-auto mt-2 h-6 w-24" />}
      {outcome?.levelUp && <p className="mt-2 font-medium">⭐ {t('play.level_up', { level: outcome.levelUp })}</p>}
      {outcome?.newAchievements.map((a) => (
        <Card key={a.id} className="mt-3 text-left">
          <p className="text-xs uppercase tracking-wider text-ink-2">🏆 {t('play.new_achievement')}</p>
          <p className="font-semibold">{a.icon} {t(`achievements.${a.id}.title`)}</p>
          <p className="text-sm text-ink-2">{t(`achievements.${a.id}.desc`)}</p>
        </Card>
      ))}
      {outcome?.completedQuests.map((q) => (
        <Card key={q.id} className="mt-3 text-left">
          <p className="text-xs uppercase tracking-wider text-ink-2">📜 {t('play.quest_done')}</p>
          <p className="font-semibold">{t(`quests.${q.id}`)} · +{q.reward_xp} XP</p>
        </Card>
      ))}
      {wrong.length > 0 && (
        <Card className="mt-5 text-left">
          <p className="mb-2 font-medium">{t('play.errors_title', { count: wrong.length })}</p>
          <ul className="flex flex-wrap gap-2">
            {wrong.map((id) => {
              const e = geo.byId.get(id)
              return e ? (
                <li key={id}>
                  <Link to={entityPath(e)} className="chip">
                    {e.names.de}
                  </Link>
                </li>
              ) : null
            })}
          </ul>
        </Card>
      )}
      <div className="mx-auto mt-7 grid max-w-xl gap-2 sm:grid-cols-2">
        <Link to={again} className="btn-primary sm:col-span-2">
          {t('play.again')}
        </Link>
        {wrong.length > 0 && (
          <Link to={repeat} className="btn-secondary">
            {t('play.repeat_errors', { count: wrong.length })}
          </Link>
        )}
        <Link to={`/play/${session.category}`} className="btn-ghost">
          {t('play.continue')}
        </Link>
      </div>
      <p className="mt-8 text-xs text-ink-2">{t('play.guest_hint')}</p>
      </div>
    </div>
  )
}
