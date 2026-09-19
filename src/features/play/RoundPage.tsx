import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import { advanceSession, buildSession, labelFor, recordAnswer, setupOf, skipQuestion, type QuizSession } from '@/engine/session'
import { fromQuery, roundPath, type RoundConfig } from '@/engine/round'
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
        const s = buildSession(geo.contextFor(setup.scope), setup, { progress })
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
  const total = session.questions.length + (session.remaining?.length ?? 0)
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-6 pt-3">
      <div className="mb-2 flex items-center gap-3">
        <button className="btn-ghost -ml-2 px-2 text-ink-2" onClick={quit}>
          ← {t('nav.quit')}
        </button>
        <div className="ml-auto flex items-center gap-3 text-sm tabular-nums text-ink-2">
          {session.streak > 1 && <span className="inline-flex items-center gap-1 text-warn"><Icons.flame className="h-4 w-4" /> {session.streak}</span>}
          <span>{session.points.toLocaleString('de-DE')} {t('play.points')}</span>
          <span>{t('play.question_of', { n: session.position + 1, total })}</span>
        </div>
      </div>
      <RoundTitle setup={session.setup} className="mb-3 text-sm" />
      <ProgressBar value={session.position / total} className="mb-4" />
      <QuestionView key={current.question.id} q={current.question} given={current.given} correct={current.correct} repeated={current.repeated} attempts={current.attempts ?? 0} lastWrong={session.lastWrongMapGuess} onAnswer={answer} onNext={advance} onSkip={current.question.map?.kind === 'europe' ? skip : undefined} />
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
  const answerEntity = geo.byId.get(q.answer)
  const xp = correct ? XP.correct_answer + (XP.difficulty_bonus[q.difficulty] ?? 0) : XP.wrong_answer

  return (
    <div className="flex flex-1 flex-col" data-question-type={q.question_type} data-answer={q.answer}>
      {q.media && (
        <figure className="mb-4 flex flex-col items-center">
          <img
            src={q.media.url}
            alt={q.media.alt}
            className={`${q.map ? 'max-h-24 md:max-h-32' : 'max-h-56 md:max-h-72'} w-auto max-w-full rounded-xl border border-line object-contain ${q.media.kind === 'flag' ? 'bg-white' : ''}`}
            decoding="async"
          />
          {answered && q.media.attribution && (
            <figcaption className="mt-1 text-[11px] text-ink-2">
              {q.media.source_url ? <a href={q.media.source_url} target="_blank" rel="noreferrer" className="underline">{q.media.attribution}</a> : q.media.attribution}
            </figcaption>
          )}
        </figure>
      )}
      {repeated && <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wider text-accent">↻ {t('play.repeated')}</p>}
      <h1 className={`${q.map ? 'mb-2 text-lg md:text-xl' : 'mb-4 text-xl md:text-2xl'} text-center font-semibold`}>{t(q.prompt.key, q.prompt.params)}</h1>

      {q.map && (
        <div className="mb-4">
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
          className="mb-4 flex gap-2"
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
            className="min-h-12 flex-1 rounded-xl border border-line bg-card px-4"
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
        <div className={`grid gap-2 ${q.question_type === 'image_choice' ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`} role="group">
          {q.options.map((o, i) => {
            const isAnswer = o.id === q.answer
            const isGiven = o.id === given
            const cls = answered ? (isAnswer ? 'border-ok bg-ok-soft' : isGiven ? 'border-bad bg-bad-soft' : 'opacity-60') : 'hover:bg-card-2'
            return (
              <button
                key={o.id}
                type="button"
                disabled={answered}
                onClick={() => onAnswer(o.id)}
                className={`card flex min-h-14 items-center gap-3 text-left transition ${o.image ? 'justify-center p-3' : 'px-4 py-3'} ${cls}`}
                aria-label={o.label || geo.byId.get(o.id)?.names.de}
              >
                {!o.image && <span className="hidden text-xs text-ink-2 md:inline">{i + 1}</span>}
                {o.image && <img src={o.image} alt="" className="max-h-28 w-full rounded-md border border-line bg-white object-contain md:max-h-36" />}
                <span className="font-medium">{o.label}</span>
                {answered && isAnswer && <span className="ml-auto text-ok" aria-hidden>✓</span>}
                {answered && isGiven && !isAnswer && <span className="ml-auto text-bad" aria-hidden>✕</span>}
              </button>
            )
          })}
        </div>
      )}

      {answered && (
        <div className={`mt-4 rounded-2xl p-4 ${correct ? 'bg-ok-soft' : 'bg-bad-soft'}`} role="status" aria-live="polite">
          <p className="text-lg font-semibold">{correct ? `✓ ${t('play.correct')}` : q.question_type === 'map_click' && given !== '__skip__' ? `✓ ${t('play.found_after', { n: attempts })}` : `✕ ${t('play.wrong')}`}</p>
          {!correct && q.question_type !== 'map_click' && <p>{t('play.would_be', { answer: correctLabel })}</p>}
          {q.question_type === 'map_click' && <p>{given === '__skip__' ? t('play.would_be', { answer: correctLabel }) : correctLabel}</p>}
          {q.explanation && <p className="mt-1 text-sm text-ink-2">{q.explanation}</p>}
          <div className="mt-2 flex items-center gap-3 text-sm">
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
          <button className="btn-primary mt-3 w-full" onClick={onNext} autoFocus>
            {t('play.next')}
          </button>
        </div>
      )}
      {report && <ReportDialog question={q} onClose={() => setReport(false)} />}
    </div>
  )
}

function ResultView({ session, outcome }: { session: QuizSession; outcome: RoundOutcome | null }) {
  const { t } = useTranslation()
  const geo = useGeoData()
  const answered = session.questions.filter((q) => q.given !== undefined)
  const correct = answered.filter((q) => q.correct).length
  const wrong = [...new Set(answered.filter((q) => !q.correct).map((q) => q.question.entities[0]))]
  const pct = answered.length ? Math.round((correct / answered.length) * 100) : 0
  const again = roundPath({ ...session.setup, only: undefined })
  const repeat = roundPath({ ...session.setup, length: wrong.length, only: wrong, repeat: false })
  const firstTry = answered.filter((q) => q.correct && !q.repeated).length
  const baseTotal = session.questions.filter((q) => !q.repeated).length
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-8 text-center md:pb-10">
      <h1 className="text-2xl font-semibold">{session.mode === 'full' ? t('play.full_done') : t('play.round_done')}</h1>
      <RoundTitle setup={session.setup} className="mx-auto mt-3 w-fit text-left" />
      <p className="mt-5 text-4xl font-semibold tabular-nums">{t('play.result', { correct, total: answered.length })}</p>
      <p className="text-ink-2">{pct} %</p>
      <div className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-2 text-sm">
        <Card className="p-2"><div className="font-semibold tabular-nums">{session.points.toLocaleString('de-DE')}</div><div className="text-xs text-ink-2">{t('play.points')}</div></Card>
        <Card className="p-2"><div className="font-semibold tabular-nums">{session.bestStreak}</div><div className="text-xs text-ink-2">{t('play.best_streak')}</div></Card>
        <Card className="p-2"><div className="font-semibold tabular-nums">{firstTry}/{baseTotal}</div><div className="text-xs text-ink-2">{t('play.first_try')}</div></Card>
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
      <div className="mt-6 grid gap-2">
        <Link to={again} className="btn-primary">
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
  )
}
