import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import type { Country } from '@/domain/types'
import { getRepository } from '@/services/progress'
import type { PuzzleResult } from '@/services/progress/types'
import { applyPuzzleSolved } from '@/services/gamification'
import { todayKey } from '@/engine/rng'
import { matchesAnswer, normalizeAnswer } from '@/engine/normalize'
import { mediaUrl } from '@/services/data/dataService'
import { Card, Flag, Skeleton, useToast, formatNumber, entityPath } from '@/ui'
import { Outline } from '@/ui/maps'
import { MAX_ATTEMPTS, PUZZLES, arrowFor, bearing, compare, distanceKm, pickDaily, proximityEmoji, shareText, type PuzzleDef } from './puzzles'

export default function PuzzlePage() {
  const { t } = useTranslation()
  const { puzzle } = useParams<{ puzzle: PuzzleDef['id'] }>()
  const [params, setParams] = useSearchParams()
  const geo = useGeoData()
  const repo = getRepository()
  const def = PUZZLES.find((p) => p.id === puzzle)
  useDocumentTitle(def ? t(`daily.${def.id}`) : undefined)
  const practice = params.get('practice')
  const date = todayKey()
  const key = practice ? `${puzzle}:practice:${practice}` : `${puzzle}:${date}`
  const [result, setResult] = useState<PuzzleResult | null>(null)
  const [input, setInput] = useState('')
  const [xp, setXp] = useState<number | null>(null)
  const { show, toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const target = useMemo(() => (geo.ready && def ? pickDaily(geo.countries, def.id, date, practice ?? undefined) : null), [geo.ready, geo.countries, def, date, practice])
  const capital = target?.attributes.capital ? geo.byId.get(target.attributes.capital) : undefined
  const solutionEntity = def?.id === 'capitale' ? capital : target
  const pool = useMemo(() => (def?.id === 'capitale' ? geo.cities.filter((c) => c.attributes.is_capital) : geo.countries.filter((c) => (c as Country).attributes.independent !== false)), [def, geo.cities, geo.countries])

  useEffect(() => {
    setXp(null)
    void repo.getPuzzle(key).then((r) => setResult(r ?? { key, puzzle: puzzle!, date: practice ? `practice:${practice}` : date, guesses: [], solved: false }))
  }, [key, repo, puzzle, date, practice])

  const suggestions = useMemo(() => {
    const n = normalizeAnswer(input)
    if (n.length < 2) return []
    return pool.filter((e) => normalizeAnswer(e.names.de).includes(n) || (e.aliases ?? []).some((a) => normalizeAnswer(a).startsWith(n))).slice(0, 6)
  }, [input, pool])

  const guess = useCallback(
    async (name: string) => {
      if (!result || !solutionEntity || result.finishedAt) return
      const entity = pool.find((e) => matchesAnswer(name, [e.names.de, ...(e.aliases ?? [])]))
      if (!entity) return show(t('search.no_results'))
      if (result.guesses.includes(entity.id)) return
      const guesses = [...result.guesses, entity.id]
      const solved = entity.id === solutionEntity.id
      const finished = solved || guesses.length >= MAX_ATTEMPTS
      const next: PuzzleResult = { ...result, guesses, solved, finishedAt: finished ? new Date().toISOString() : undefined }
      setResult(next)
      setInput('')
      await repo.savePuzzle(next)
      if (finished && !practice) {
        const out = await applyPuzzleSolved(repo, guesses.length, solved)
        setXp(out.xp)
      }
    },
    [result, solutionEntity, pool, repo, show, t, practice],
  )

  if (!def || !target || !result || !solutionEntity) return <div className="mx-auto max-w-xl p-4"><Skeleton className="h-64" /></div>
  const attempts = result.guesses.length
  const finished = !!result.finishedAt
  const guessedEntities = result.guesses.map((id) => geo.byId.get(id)!).filter(Boolean)
  const rows = guessedEntities.map((g) => rowEmoji(def.id, g as Country, target, solutionEntity.id))
  const share = shareText(t(`daily.${def.id}`), practice ? t('daily.practice') : date, rows, result.solved, attempts)

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-8 pt-3">
      <div className="mb-3 flex items-center gap-3">
        <Link to="/daily" className="btn-ghost -ml-2 px-2 text-ink-2">
          ← {t('daily.title')}
        </Link>
        <span className="ml-auto text-sm tabular-nums text-ink-2">{t('daily.attempts', { n: attempts, max: MAX_ATTEMPTS })}</span>
      </div>
      <h1 className="mb-3 text-center text-2xl font-semibold">
        {def.icon} {t(`daily.${def.id}`)} {practice && <span className="text-sm font-normal text-ink-2">· {t('daily.practice')}</span>}
      </h1>

      <Card className="mb-4 flex flex-col items-center">
        {def.id === 'flagle' && <FlagleBoard country={target} revealed={finished ? 6 : attempts} />}
        {def.id === 'outline' && <Outline iso2={target.attributes.iso2} className="max-h-72" />}
        {def.id === 'countryle' && <p className="py-6 text-center text-ink-2">{t('daily.countryle_desc')}</p>}
        {def.id === 'capitale' && <CapitaleHints country={target} capitalName={solutionEntity.names.de} revealed={attempts} />}
      </Card>

      {!finished && (
        <form
          className="relative mb-3"
          onSubmit={(e) => {
            e.preventDefault()
            void guess(suggestions[0]?.names.de ?? input)
          }}
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={def.id === 'capitale' ? t('play.type_answer') : t('daily.placeholder')}
              className="min-h-12 flex-1 rounded-xl border border-line bg-card px-4"
              autoComplete="off"
              aria-label={t('daily.guess')}
              autoFocus
            />
            <button className="btn-primary" type="submit">
              {t('daily.guess')}
            </button>
          </div>
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-card shadow-lg" role="listbox">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button type="button" className="w-full px-4 py-2.5 text-left hover:bg-card-2" onClick={() => void guess(s.names.de)}>
                    {s.names.de}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}

      <ol className="grid gap-2">
        {guessedEntities.map((g, i) => (
          <li key={g.id} className={`card flex items-center gap-2 px-3 py-2 text-sm ${g.id === solutionEntity.id ? 'border-ok bg-ok-soft' : ''}`}>
            <span className="w-4 text-ink-2">{i + 1}</span>
            <span className="flex-1 font-medium">{g.names.de}</span>
            <HintRow puzzle={def.id} guess={g as Country} target={target} solutionId={solutionEntity.id} />
          </li>
        ))}
      </ol>

      {finished && (
        <Card className="mt-4 text-center">
          <p className="text-lg font-semibold">{result.solved ? `✓ ${t('daily.solved')}` : `✕ ${t('daily.failed')}`}</p>
          {!result.solved && <p>{t('daily.answer_was', { name: solutionEntity.names.de })}</p>}
          {xp !== null && <p className="mt-1 font-medium text-accent">+{xp} XP</p>}
          <div className="mt-3 flex items-center justify-center gap-2">
            <Flag entity={target} size="sm" />
            <Link to={entityPath(target)} className="underline">
              {target.names.de} →
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            <button
              className="btn-secondary"
              onClick={() => {
                if (navigator.share) void navigator.share({ text: share }).catch(() => undefined)
                else void navigator.clipboard.writeText(share).then(() => show(t('daily.copied')))
              }}
            >
              {t('daily.share')}
            </button>
            <button className="btn-ghost" onClick={() => setParams({ practice: String(Date.now()) })}>
              🔁 {t('daily.practice')}
            </button>
          </div>
          {!practice && <p className="mt-3 text-xs text-ink-2">{t('daily.come_back')}</p>}
        </Card>
      )}
      {toast}
    </div>
  )
}

function FlagleBoard({ country, revealed }: { country: Country; revealed: number }) {
  const flag = country.media?.find((m) => m.kind === 'flag')
  // Kachelreihenfolge fest, damit jeder Nutzer dieselben Kacheln sieht.
  const order = [4, 1, 3, 0, 5, 2]
  const shown = new Set(order.slice(0, revealed))
  return (
    <div className="relative aspect-[3/2] w-full max-w-md overflow-hidden rounded-xl border border-line bg-white">
      {flag && <img src={mediaUrl(flag.url)} alt="Flagge, teilweise verdeckt" className="h-full w-full object-fill" />}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`border border-bg/40 transition-opacity ${shown.has(i) ? 'opacity-0' : 'bg-card-2 opacity-100'}`} aria-hidden />
        ))}
      </div>
    </div>
  )
}

function CapitaleHints({ country, capitalName, revealed }: { country: Country; capitalName: string; revealed: number }) {
  const { t } = useTranslation()
  const hints = [
    `${t('facts.country')}: ${country.names.de}`,
    `${t('daily.hint_length')}: ${capitalName.replace(/[^\p{L}]/gu, '').length}`,
    `${t('daily.hint_letter')}: ${capitalName[0]}`,
    `${t('facts.continent')}: ${t(`scope.${country.attributes.continent}`)}`,
    `${t('facts.population')} (${t('facts.country')}): ${formatNumber(country.attributes.population)}`,
  ]
  return (
    <ul className="grid w-full gap-1 py-2 text-sm">
      {hints.slice(0, Math.max(1, revealed + 1)).map((h, i) => (
        <li key={i} className="rounded-lg bg-card-2 px-3 py-2">
          {h}
        </li>
      ))}
    </ul>
  )
}

function HintRow({ puzzle, guess, target, solutionId }: { puzzle: PuzzleDef['id']; guess: Country; target: Country; solutionId: string }) {
  if (guess.id === solutionId) return <span className="text-ok">✓</span>
  if (puzzle === 'capitale') return <span className="text-bad">✕</span>
  if (puzzle === 'flagle') {
    const same = guess.attributes.continent === target.attributes.continent
    return <span title="Kontinent">{same ? '🟩' : '⬜'} {guess.attributes.continent ? guess.attributes.continent : ''}</span>
  }
  if (!guess.location || !target.location) return null
  const km = distanceKm(guess.location, target.location)
  const dir = arrowFor(bearing(guess.location, target.location))
  return (
    <span className="flex items-center gap-2 tabular-nums">
      {puzzle === 'countryle' && <span title="Kontinent">{guess.attributes.continent === target.attributes.continent ? '🟩' : '⬜'}</span>}
      <span title="Entfernung">{km.toLocaleString('de-DE')} km</span>
      <span title="Richtung">{dir}</span>
      {puzzle === 'countryle' && (
        <>
          <span title="Einwohner">👥{compare(guess.attributes.population, target.attributes.population)}</span>
          <span title="Fläche">📐{compare(guess.attributes.area_km2, target.attributes.area_km2)}</span>
        </>
      )}
    </span>
  )
}

function rowEmoji(puzzle: PuzzleDef['id'], guess: Country, target: Country, solutionId: string): string {
  if (guess.id === solutionId) return '🟩🟩🟩🟩🟩 ✓'
  if (puzzle === 'capitale') return '⬜'
  if (puzzle === 'flagle') return guess.attributes.continent === target.attributes.continent ? '🟩' : '⬜'
  if (!guess.location || !target.location) return '⬜'
  return `${proximityEmoji(distanceKm(guess.location, target.location))} ${arrowFor(bearing(guess.location, target.location))}`
}
