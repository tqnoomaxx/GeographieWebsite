import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { buildSession, checkAnswer, extendSession, labelFor, type QuizSession } from '@/engine/session'
import type { CategoryId, Question } from '@/engine/types'
import { getRepository } from '@/services/progress'
import { applySession, recomputeLongQuests, type RoundOutcome } from '@/services/gamification'
import { XP } from '@/config/xp'
import { Card, ErrorState, Skeleton, ProgressBar, entityPath } from '@/ui'
import { WorldMap, RegionMapView } from '@/ui/maps'
import { ReportDialog } from '@/features/legal/ReportDialog'

const REGION_CATEGORIES: CategoryId[] = ['regions', 'cities', 'maps', 'mixed']
const PLATE_CATEGORIES: CategoryId[] = ['license_plates', 'mixed']

export default function RoundPage() {
  const { t } = useTranslation()
  const { category, sessionId } = useParams<{ category?: CategoryId; sessionId?: string }>()
  const [params] = useSearchParams()
  const geo = useGeoData()
  const navigate = useNavigate()
  const repo = getRepository()
  const [session, setSession] = useState<QuizSession | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const startedRef = useRef(false)

  const scope = params.get('scope') ?? 'world'
  const lenParam = params.get('len') ?? '10'
  const length: number | 'all' = lenParam === 'all' ? 'all' : Number(lenParam)
  const only = params.get('only')?.split(',').filter(Boolean)

  const [stored, setStored] = useState<QuizSession | null | undefined>(sessionId ? undefined : null)
  useEffect(() => {
    if (!sessionId) return
    repo.getSession(sessionId).then((s) => (s ? setStored(s) : setError(new Error('Session nicht gefunden'))))
  }, [sessionId, repo])

  useEffect(() => {
    if (!geo.ready || startedRef.current || stored === undefined) return
    const cat = stored?.category ?? category
    const sc = stored?.scope ?? scope
    if (!cat) return setError(new Error('Kategorie fehlt'))
    const needRegions = REGION_CATEGORIES.includes(cat) || sc.startsWith('country:')
    const needPlates = PLATE_CATEGORIES.includes(cat)
    if (needRegions && !geo.regionsLoaded) return void geo.ensureRegions()
    if (needPlates && !geo.platesLoaded) return void geo.ensurePlates()
    startedRef.current = true
    ;(async () => {
      try {
        if (stored) {
          setSession(stored)
          return
        }
        const progress = await repo.getAllEntityProgress()
        const ctx = geo.contextFor(sc)
        const s = buildSession(ctx, { category: cat, scope: sc, length, progress, onlyEntities: only, mode: only ? 'repeat_errors' : undefined })
        if (!s.questions.length) throw new Error(t('play.no_questions'))
        setSession(s)
        if (s.mode === 'full') await repo.saveSession(s)
      } catch (e) {
        setError(e as Error)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.ready, geo.regionsLoaded, geo.platesLoaded, stored])

  // Kontext nach Regionen-Nachladen aktualisieren (für extendSession)
  const ctx = useMemo(() => (session && geo.ready ? geo.contextFor(session.scope) : null), [session?.scope, geo.ready, geo.regionsLoaded, geo.platesLoaded, geo, session])

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
      const q = session.questions[session.position]
      if (!q || q.given !== undefined) return
      const correct = checkAnswer(q.question, given)
      const questions = session.questions.map((x, i) => (i === session.position ? { ...x, given, correct, answeredAt: new Date().toISOString() } : x))
      const next = { ...session, questions, score: session.score + (correct ? 1 : 0) }
      setSession(next)
      if (next.mode === 'full') await repo.saveSession(next)
    },
    [session, repo],
  )

  const advance = useCallback(async () => {
    if (!session || !ctx) return
    let s = { ...session, position: session.position + 1 }
    if (s.position >= s.questions.length && s.remaining?.length) s = extendSession(s, ctx)
    if (s.position >= s.questions.length) {
      await finish(s)
      return
    }
    setSession(s)
    if (s.mode === 'full') await repo.saveSession(s)
  }, [session, ctx, finish, repo])

  const quit = useCallback(async () => {
    if (!session) return navigate('/play')
    if (session.mode === 'full') {
      await repo.saveSession(session)
      navigate('/play')
      return
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
      <div className="mb-3 flex items-center gap-3">
        <button className="btn-ghost -ml-2 px-2 text-ink-2" onClick={quit}>
          ← {t('nav.quit')}
        </button>
        <div className="ml-auto text-sm tabular-nums text-ink-2">{t('play.question_of', { n: session.position + 1, total })}</div>
      </div>
      <ProgressBar value={session.position / total} className="mb-4" />
      <QuestionView key={current.question.id} q={current.question} given={current.given} correct={current.correct} onAnswer={answer} onNext={advance} />
    </div>
  )
}

function QuestionView({ q, given, correct, onAnswer, onNext }: { q: Question; given?: string; correct?: boolean; onAnswer: (v: string) => void; onNext: () => void }) {
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

  const correctLabel = labelFor(q, q.answer, geo.byId)
  const answerEntity = geo.byId.get(q.answer)
  const xp = correct ? XP.correct_answer + (XP.difficulty_bonus[q.difficulty] ?? 0) : XP.wrong_answer

  return (
    <div className="flex flex-1 flex-col">
      {q.media && (
        <figure className="mb-4 flex flex-col items-center">
          <img
            src={q.media.url}
            alt={q.media.alt}
            className={`max-h-56 w-auto max-w-full rounded-xl border border-line object-contain md:max-h-72 ${q.media.kind === 'flag' ? 'bg-white' : ''}`}
            decoding="async"
          />
          {answered && q.media.attribution && (
            <figcaption className="mt-1 text-[11px] text-ink-2">
              {q.media.source_url ? <a href={q.media.source_url} target="_blank" rel="noreferrer" className="underline">{q.media.attribution}</a> : q.media.attribution}
            </figcaption>
          )}
        </figure>
      )}
      <h1 className="mb-4 text-center text-xl font-semibold md:text-2xl">{t(q.prompt.key, q.prompt.params)}</h1>

      {q.map && (
        <div className="mb-4">
          {q.map.kind === 'world' ? (
            <WorldMap onPick={onAnswer} disabled={answered} correct={answered ? q.answer : undefined} wrong={answered && !correct ? given : undefined} />
          ) : (
            <RegionMapView iso2={q.map.iso2!} onPick={onAnswer} disabled={answered} correct={answered ? q.answer : undefined} wrong={answered && !correct ? given : undefined} />
          )}
          {!answered && <p className="mt-2 text-center text-sm text-ink-2">{t('play.map_hint')}</p>}
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
                className={`card flex min-h-14 items-center gap-3 px-4 py-3 text-left transition ${cls}`}
                aria-label={o.label || geo.byId.get(o.id)?.names.de}
              >
                <span className="hidden text-xs text-ink-2 md:inline">{i + 1}</span>
                {o.image && <img src={o.image} alt="" className="h-16 w-auto rounded-md border border-line bg-white object-contain md:h-24" />}
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
          <p className="text-lg font-semibold">{correct ? `✓ ${t('play.correct')}` : `✕ ${t('play.wrong')}`}</p>
          {!correct && <p>{t('play.would_be', { answer: correctLabel })}</p>}
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
  const again = `/play/${session.category}/round?scope=${encodeURIComponent(session.scope)}&len=${session.length}`
  const repeat = `/play/${session.category}/round?scope=${encodeURIComponent(session.scope)}&len=${wrong.length}&only=${wrong.join(',')}`
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-8 text-center md:pb-10">
      <h1 className="text-2xl font-semibold">{session.mode === 'full' ? t('play.full_done') : t('play.round_done')}</h1>
      <p className="mt-4 text-4xl font-semibold tabular-nums">{t('play.result', { correct, total: answered.length })}</p>
      <p className="text-ink-2">{pct} %</p>
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
        <Link to="/play" className="btn-ghost">
          {t('play.continue')}
        </Link>
      </div>
      <p className="mt-8 text-xs text-ink-2">{t('play.guest_hint')}</p>
    </div>
  )
}
