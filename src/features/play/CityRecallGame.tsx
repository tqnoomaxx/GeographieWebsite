import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Entity } from '@/domain/types'
import type { QuizSession } from '@/engine/session'
import { cityRecallHits, recallCitiesFromSession } from '@/engine/cityRecall'
import { cityMinimum } from '@/domain/cityRecall'
import { matchesExactly } from '@/engine/normalize'
import { roundPath } from '@/engine/round'
import { CityRecallMap } from './CityRecallMap'
import './city-recall.css'

export function CityRecallGame({
  session,
  country,
  onGuess,
  onReveal,
  onFinish,
}: {
  session: QuizSession
  country?: Entity
  onGuess: (input: string) => Promise<void>
  onReveal: () => Promise<void>
  onFinish: () => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<string>()
  const [composing, setComposing] = useState(false)
  // Ortsdaten bleiben während der Runde unverändert. Eingaben bauen die Karte nicht neu auf.
  const [cities] = useState(() => recallCitiesFromSession(session).cities)
  const found = useMemo(
    () => session.questions.filter((q) => q.correct).map((q) => q.question.entities[0]),
    [session.questions],
  )
  const foundSet = useMemo(() => new Set(found), [found])
  const revealed = !!session.cityRecallRevealed
  const complete = found.length === cities.length
  const ended = revealed || complete || !!session.completedAt
  const name = country?.names.de ?? session.scope.replace('country:', '')
  const minimum = cityMinimum(session.setup.minPopulation)
  const center = useMemo<[number, number]>(
    () => [country?.location?.lon ?? cities[0]?.lon ?? 0, country?.location?.lat ?? cities[0]?.lat ?? 0],
    [country, cities],
  )
  const chosen = cities.find((c) => c.id === selected)
  const onSelect = useCallback((id: string) => setSelected(id), [])
  const guess = useCallback(
    (manual = false) => {
      if (ended || composing || !value.trim()) return
      const hits = cityRecallHits(session, value)
      if (!hits.length) {
        if (manual) {
          const duplicate = session.questions.some(
            (q) => q.correct && matchesExactly(value, q.question.accepted ?? []),
          )
          setMessage(
            duplicate
              ? 'Diese Stadt hast du schon gefunden.'
              : 'Kein Treffer. Gesucht sind Städte dieses Landes über der gewählten Einwohnergrenze.',
          )
          if (duplicate) setValue('')
        }
        return
      }
      setSelected(hits[0].question.entities[0])
      setMessage(
        hits.length > 1
          ? `${hits.length} gleichnamige Städte gefunden.`
          : `${hits[0].question.place?.name} gefunden!`,
      )
      setValue('')
      void onGuess(value)
    },
    [session, value, ended, composing, onGuess],
  )
  useEffect(() => {
    if (!value.trim() || ended || composing) return
    const timeout = setTimeout(() => guess(), 350)
    return () => clearTimeout(timeout)
  }, [value, ended, composing, guess])

  return (
    <section className="city-recall-game" data-question-type="city_recall" data-generator="city_recall">
      <header className="city-recall-heading">
        <div>
          <p className="city-recall-eyebrow">Städte sammeln</p>
          <h1>{name}</h1>
          <p>Alle erfassten Städte mit mehr als {minimum.toLocaleString('de-DE')} Einwohnern.</p>
        </div>
        <div className="city-recall-count" aria-label="Gefundene Städte">
          <strong>{found.length.toLocaleString('de-DE')}</strong>
          <span>von {cities.length.toLocaleString('de-DE')} gefunden</span>
        </div>
      </header>
      {!ended ? (
        <form
          className="city-recall-form"
          onSubmit={(e) => {
            e.preventDefault()
            guess(true)
          }}
        >
          <label htmlFor="city-guess">Welche Städte kennst du?</label>
          <div className="city-recall-input-row">
            <input
              id="city-guess"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              placeholder="Stadtnamen eingeben …"
              aria-describedby="city-guess-help city-guess-status"
            />
            <button type="submit" className="city-recall-primary">
              Prüfen
            </button>
          </div>
          <p id="city-guess-help">
            Richtige Namen werden automatisch übernommen. Du kannst auch Enter drücken.
          </p>
        </form>
      ) : (
        <div className="city-recall-finish-note" role="status">
          {complete
            ? 'Alle Städte gefunden – starke Runde!'
            : 'Aufgelöst. Die fehlenden Städte sind jetzt auf der Karte zu sehen.'}
          {session.completedAt && <span> Dein Ergebnis wurde gespeichert.</span>}
        </div>
      )}
      <p id="city-guess-status" className="city-recall-status" role="status" aria-live="polite">
        {message || '\u00a0'}
      </p>
      <CityRecallMap
        iso={session.scope.slice(8)}
        center={center}
        cities={cities}
        found={found}
        revealed={revealed}
        selected={selected}
        onSelect={onSelect}
      />
      <div className="city-recall-map-caption">
        {chosen ? (
          <p>
            <strong>{chosen.name}</strong>
            <span>
              {chosen.population.toLocaleString('de-DE')} Einwohner ·{' '}
              {foundSet.has(chosen.id) ? 'gefunden' : 'nicht gefunden'}
            </span>
          </p>
        ) : (
          <p>Klicke auf einen Stadtpunkt für Name und Einwohnerzahl.</p>
        )}
        <span className="city-recall-legend">
          <i />
          Gefunden
          {revealed && (
            <>
              <i className="is-missing" />
              Fehlend
            </>
          )}
        </span>
      </div>
      <div className="city-recall-actions">
        {session.completedAt ? (
          <>
            <Link className="city-recall-primary" to={roundPath(session.setup)}>
              Noch einmal
            </Link>
            <Link
              className="city-recall-secondary"
              to={
                '/play/cities?quiz=city-recall&scope=' +
                encodeURIComponent(session.scope) +
                '&population=' +
                minimum
              }
            >
              Land oder Grenze ändern
            </Link>
          </>
        ) : ended ? (
          <button className="city-recall-primary" onClick={() => void onFinish()}>
            Ergebnis speichern
          </button>
        ) : (
          <button className="city-recall-secondary" onClick={() => void onReveal()}>
            Auflösen & fehlende Städte zeigen
          </button>
        )}
      </div>
      {(found.length > 0 || revealed) && (
        <details className="city-recall-list">
          <summary>
            {revealed ? 'Alle Städte' : 'Gefundene Städte'} ({revealed ? cities.length : found.length})
          </summary>
          <div>
            {cities
              .filter((c) => foundSet.has(c.id) || revealed)
              .sort((a, b) => a.name.localeCompare(b.name, 'de'))
              .map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className={foundSet.has(city.id) ? 'is-found' : ''}
                  onClick={() => setSelected(city.id)}
                >
                  <span>{city.name}</span>
                  <small>
                    {city.population.toLocaleString('de-DE')}
                    {foundSet.has(city.id) ? ' ✓' : ''}
                  </small>
                </button>
              ))}
          </div>
        </details>
      )}
      <p className="city-recall-source">
        Daten:{' '}
        <a href="https://download.geonames.org/export/dump/readme.txt" target="_blank" rel="noreferrer">
          GeoNames
        </a>{' '}
        ·{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . Erfasst sind Orte über 15.000 Einwohnern; Einwohnerstand und Stadtgrenzen folgen der Quelle.
      </p>
    </section>
  )
}
