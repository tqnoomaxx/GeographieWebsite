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
import { MAX_ATTEMPTS, PUZZLES, arrowFor, bearing, compare, distanceKm, pickDaily, pickDailyFrom, proximityEmoji, shareText, type PuzzleDef } from './puzzles'
import type { Entity } from '@/domain/types'
import { RegionMapView } from '@/ui/maps'
import { Icons } from '@/ui/icons'
import { PuzzleArt } from './PuzzleArt'

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

  const isCountryPuzzle = def && ['flagle', 'countryle', 'outline', 'capitale'].includes(def.id)
  useEffect(() => {
    if (def?.id === 'kennzeichle' && !geo.platesLoaded) void geo.ensurePlates()
  }, [def, geo])
  const landmarksWithPhoto = useMemo(() => geo.landmarks.filter((l) => l.media?.some((m) => m.kind === 'photo')), [geo.landmarks])
  const dePlates = useMemo(() => geo.plates.filter((p) => p.attributes.country === 'country:DE'), [geo.plates])
  const target = useMemo(() => {
    if (!geo.ready || !def) return null
    if (isCountryPuzzle) return pickDaily(geo.countries, def.id as 'flagle', date, practice ?? undefined)
    return null
  }, [geo.ready, geo.countries, def, date, practice, isCountryPuzzle])
  const special = useMemo<Entity | undefined>(() => {
    if (!def || isCountryPuzzle) return undefined
    if (def.id === 'bildle') return pickDailyFrom(landmarksWithPhoto, def.id, date, practice ?? undefined)
    if (def.id === 'kennzeichle') return pickDailyFrom(dePlates, def.id, date, practice ?? undefined)
    return undefined
  }, [def, isCountryPuzzle, landmarksWithPhoto, dePlates, date, practice])
  const capital = target?.attributes.capital ? geo.byId.get(target.attributes.capital) : undefined
  const solutionEntity: Entity | undefined = def?.id === 'capitale' ? capital : isCountryPuzzle ? target ?? undefined : special
  const pool = useMemo<Entity[]>(() => {
    if (def?.id === 'capitale') return geo.cities.filter((c) => c.attributes.is_capital)
    if (def?.id === 'bildle') return landmarksWithPhoto
    if (def?.id === 'kennzeichle') return dePlates
    return geo.countries.filter((c) => (c as Country).attributes.independent !== false)
  }, [def, geo.cities, geo.countries, landmarksWithPhoto, dePlates])

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

  if (!def || !result || !solutionEntity || (isCountryPuzzle && !target)) return <div className="mx-auto max-w-xl p-4"><Skeleton className="h-64" /></div>
  const tgt = (target ?? solutionEntity) as Country
  const attempts = result.guesses.length
  const finished = !!result.finishedAt
  const guessedEntities = result.guesses.map((id) => geo.byId.get(id)!).filter(Boolean)
  const rows = guessedEntities.map((g) => rowEmoji(def.id, g as Country, tgt, solutionEntity.id))
  const share = shareText(t(`daily.${def.id}`), practice ? t('daily.practice') : date, rows, result.solved, attempts)

  return (
    <div className="daily-game-shell atlas-surface">
    <div className="daily-game-container">
      <header className="daily-game-topbar">
        <Link to="/daily" className="daily-game-back">
          <Icons.back aria-hidden /> {t('daily.title')}
        </Link>
        <div className="daily-attempt-progress" aria-label={t('daily.attempts', { n: attempts, max: MAX_ATTEMPTS })}>
          <div aria-hidden>{Array.from({ length: MAX_ATTEMPTS }, (_, index) => <span key={index} className={index < attempts ? 'is-used' : ''} />)}</div>
          <strong>{t('daily.attempts', { n: attempts, max: MAX_ATTEMPTS })}</strong>
        </div>
      </header>

      <section className="daily-game-heading">
        <PuzzleArt puzzle={def.id} featured />
        <div>
          <p className="eyebrow">{practice ? t('daily.practice') : t('daily.today')}</p>
          <h1>{t(`daily.${def.id}`)}</h1>
          <p>{t(`daily.${def.id}_desc`)}</p>
        </div>
      </section>

      <Card className="daily-game-board">
        {def.id === 'flagle' && <FlagleBoard country={tgt} revealed={finished ? 6 : attempts} />}
        {def.id === 'outline' && <Outline iso2={tgt.attributes.iso2} className="max-h-72" />}
        {def.id === 'countryle' && <p className="py-6 text-center text-ink-2">{t('daily.countryle_desc')}</p>}
        {def.id === 'capitale' && <CapitaleHints country={tgt} capitalName={solutionEntity.names.de} revealed={attempts} />}
        {def.id === 'bildle' && <BildleBoard landmark={solutionEntity} revealed={finished ? 6 : attempts} />}
        {def.id === 'kennzeichle' && <KennzeichleBoard plate={solutionEntity} revealed={finished ? 6 : attempts} />}
      </Card>

      {!finished && (
        <form
          className="daily-guess-form"
          onSubmit={(e) => {
            e.preventDefault()
            void guess(suggestions[0]?.names.de ?? input)
          }}
        >
          <label htmlFor="daily-guess">{t('daily.your_guess')}</label>
          <div className="daily-guess-row">
            <input
              id="daily-guess"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isCountryPuzzle && def.id !== 'capitale' ? t('daily.placeholder') : t('play.type_answer')}
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
            <ul className="daily-suggestions" role="listbox">
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

      <ol className="daily-guess-history">
        {guessedEntities.map((g, i) => (
          <li key={g.id} className={`${g.id === solutionEntity.id ? 'is-correct' : ''}`}>
            <span className="daily-guess-number">{String(i + 1).padStart(2, '0')}</span>
            <span className="flex-1 font-medium">{g.names.de}</span>
            <HintRow puzzle={def.id} guess={g as Country} target={tgt} solutionId={solutionEntity.id} />
          </li>
        ))}
      </ol>

      {finished && (
        <Card className={`daily-result ${result.solved ? 'is-solved' : 'is-failed'}`}>
          <p className="text-lg font-semibold">{result.solved ? `✓ ${t('daily.solved')}` : `✕ ${t('daily.failed')}`}</p>
          {!result.solved && <p>{t('daily.answer_was', { name: solutionEntity.names.de })}</p>}
          {xp !== null && <p className="mt-1 font-medium text-accent">+{xp} XP</p>}
          <div className="mt-3 flex items-center justify-center gap-2">
            {isCountryPuzzle && <Flag entity={tgt} size="sm" />}
            <Link to={entityPath(solutionEntity)} className="underline">
              {solutionEntity.names.de} →
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
    </div>
  )
}

function FlagleBoard({ country, revealed }: { country: Country; revealed: number }) {
  const flag = country.media?.find((m) => m.kind === 'flag')
  // Kachelreihenfolge fest, damit jeder Nutzer dieselben Kacheln sieht.
  const order = [4, 1, 3, 0, 5, 2]
  // Eine Kachel ist von Beginn an sichtbar; nach jedem Fehlversuch kommt eine weitere dazu.
  const shown = new Set(order.slice(0, Math.min(6, revealed + 1)))
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
  if (puzzle === 'capitale' || puzzle === 'bildle') return <span className="text-bad">✕</span>
  if (puzzle === 'kennzeichle') return <span title="Bundesland">{guess.attributes.region === target.attributes.region ? '🟩 gleiches Bundesland' : '⬜'} · {guess.attributes.code as string}</span>
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
  if (puzzle === 'capitale' || puzzle === 'bildle') return '⬜'
  if (puzzle === 'kennzeichle') return guess.attributes.region === target.attributes.region ? '🟩' : '⬜'
  if (puzzle === 'flagle') return guess.attributes.continent === target.attributes.continent ? '🟩' : '⬜'
  if (!guess.location || !target.location) return '⬜'
  return `${proximityEmoji(distanceKm(guess.location, target.location))} ${arrowFor(bearing(guess.location, target.location))}`
}

function BildleBoard({ landmark, revealed }: { landmark: Entity; revealed: number }) {
  const photo = landmark.media?.find((m) => m.kind === 'photo')
  // Stufenweise: stark gezoomt und unscharf → klar. Gleiche Stufen für alle Nutzer.
  const scale = [3, 2.4, 1.9, 1.5, 1.2, 1, 1][Math.min(revealed, 6)]
  const blur = [10, 7, 5, 3, 1.5, 0, 0][Math.min(revealed, 6)]
  return (
    <div className="aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border border-line bg-card-2">
      {photo && (
        <img
          src={mediaUrl(photo.url)}
          alt="Sehenswürdigkeit, teilweise verdeckt"
          className="h-full w-full object-cover transition-all duration-500"
          style={{ transform: `scale(${scale})`, filter: `blur(${blur}px)`, transformOrigin: '40% 45%' }}
        />
      )}
    </div>
  )
}

function KennzeichleBoard({ plate, revealed }: { plate: Entity; revealed: number }) {
  const geo = useGeoData()
  const { t } = useTranslation()
  const code = plate.attributes.code as string
  const region = plate.attributes.region ? geo.byId.get(plate.attributes.region as string) : undefined
  const hints = [
    `${t('daily.hint_length')}: ${code.length}`,
    `${t('daily.hint_letter')}: ${code[0]}`,
    region ? `Bundesland: ${region.names.de}` : '',
    `${t('facts.population')}-Klasse: ${code.length === 1 ? 'Großstadt' : code.length === 2 ? 'Stadt / Kreis' : 'Landkreis'}`,
    `Ort beginnt mit: ${plate.names.de[0]}`,
  ].filter(Boolean)
  return (
    <div className="w-full">
      <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-lg border-2 border-ink bg-white px-4 py-2 font-mono text-3xl font-bold tracking-widest text-black">
        <span className="rounded bg-blue-700 px-1 text-xs text-white">D</span>
        {revealed >= 6 ? code : code.split('').map((ch, i) => (i < Math.max(0, revealed - 1) ? ch : '?')).join('')}
      </div>
      {region && revealed >= 1 && <div className="mx-auto mb-2 max-w-xs"><RegionMapView iso2="DE" highlight={region.id} /></div>}
      <ul className="grid w-full gap-1 text-sm">
        {hints.slice(0, Math.max(1, Math.min(revealed + 1, hints.length))).map((h, i) => (
          <li key={i} className="rounded-lg bg-card-2 px-3 py-2">{h}</li>
        ))}
      </ul>
    </div>
  )
}
