import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useGeoData } from '@/app/DataProvider'
import { useAsync, useDocumentTitle } from '@/app/hooks'
import { Page, LoadingState, ErrorState } from '@/ui'
import type { Exercise } from '@/config/quizCatalog'
import { CITY_RECALL_DEFAULT, CITY_RECALL_MINIMUM, validCityMinimum } from '@/domain/cityRecall'
import { loadRecallIndex } from '@/services/data/cityRecall'
import { normalizeAnswer } from '@/engine/normalize'
import { roundPath } from '@/engine/round'
import './city-recall.css'
export function CityRecallSetup({ exercise }: { exercise: Exercise }) {
  const geo = useGeoData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const index = useAsync(loadRecallIndex, [])
  const [country, setCountry] = useState(params.get('scope') ?? 'country:DE')
  const [search, setSearch] = useState('')
  const [value, setValue] = useState(params.get('population') ?? String(CITY_RECALL_DEFAULT))
  const minimum = Number(value)
  const valid = value.trim() !== '' && validCityMinimum(minimum)
  useDocumentTitle(exercise.title)
  const countries = useMemo(
    () =>
      Object.entries(index.data?.countries ?? {})
        .map(([id, entry]) => ({
          id,
          name: geo.byId.get(id)?.names.de ?? id,
          count: valid ? entry.populations.filter((p) => p > minimum).length : 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [index.data, geo.byId, minimum, valid],
  )
  const world = {
    id: 'world',
    name: 'der ganzen Welt',
    count: countries.reduce((sum, c) => sum + c.count, 0),
  }
  const filteredCountries = countries.filter((c) =>
    normalizeAnswer(c.name + ' ' + c.id.slice(8)).includes(normalizeAnswer(search)),
  )
  const selected =
    country === 'world'
      ? world
      : (countries.find((c) => c.id === country) ??
        (geo.byId.has(country)
          ? { id: country, name: geo.byId.get(country)!.names.de, count: 0 }
          : undefined) ??
        countries.find((c) => c.id === 'country:DE') ??
        countries[0])
  const start = () => {
    if (selected && valid && selected.count)
      navigate(
        roundPath({
          category: 'cities',
          exercise: exercise.id,
          mode: 'input',
          scope: selected.id,
          length: 'all',
          repeat: false,
          minPopulation: minimum,
        }),
      )
  }
  return (
    <Page>
      <div className="exercise-setup">
        <Link className="simple-back" to="/play/cities">
          <ArrowLeft aria-hidden />
          Städte
        </Link>
        <header className="exercise-setup-heading">
          <h1>{exercise.title}</h1>
          <p>Wie viele Städte kennst du? Richtige Namen erscheinen auf der Karte.</p>
        </header>
        {index.error ? (
          <ErrorState message="Städteauswahl konnte nicht geladen werden." onRetry={index.reload} />
        ) : index.loading ? (
          <LoadingState message="Städteauswahl wird geladen …" />
        ) : (
          <>
            <fieldset className="city-recall-scope">
              <legend>Spielbereich</legend>
              <div>
                <button
                  type="button"
                  aria-pressed={country !== 'world'}
                  onClick={() => setCountry('country:DE')}
                >
                  Land
                </button>
                <button type="button" aria-pressed={country === 'world'} onClick={() => setCountry('world')}>
                  Welt
                </button>
              </div>
            </fieldset>
            {country !== 'world' && (
              <>
                <label className="exercise-control">
                  Land suchen
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Land oder Ländercode eingeben …"
                  />
                </label>
                <label className="exercise-control">
                  Land
                  <select
                    aria-label="Land"
                    value={selected?.id ?? ''}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {selected && !filteredCountries.some((c) => c.id === selected.id) && (
                      <option value={selected.id}>{selected.name} (ausgewählt)</option>
                    )}
                    {filteredCountries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {filteredCountries.length === 0 && (
                  <p className="exercise-note" role="status">
                    Kein Land gefunden.
                  </p>
                )}
              </>
            )}
            <label className="exercise-control">
              Einwohnergrenze
              <input
                type="number"
                inputMode="numeric"
                aria-label="Einwohnergrenze"
                aria-describedby="city-minimum-note"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min={CITY_RECALL_MINIMUM}
                max={1_000_000_000}
                step="1"
                required
              />
            </label>
            <p id="city-minimum-note" className="exercise-note">
              Frei einstellbar ab 15.000 Einwohnern. Gesucht sind Städte mit <strong>mehr als</strong> dieser
              Zahl, nach GeoNames-Abgrenzung. Stadtteile zählen nicht separat.
            </p>
            {!valid ? (
              <p className="exercise-note" role="status">
                Gib eine ganze Zahl zwischen 15.000 und 1.000.000.000 ein.
              </p>
            ) : (
              <p className="exercise-summary" aria-live="polite">
                {selected?.count.toLocaleString('de-DE') ?? 0} Städte über {minimum.toLocaleString('de-DE')}{' '}
                Einwohnern in {selected?.name}
              </p>
            )}
            {valid && selected?.count === 0 && (
              <p className="exercise-note" role="status">
                Für diese Grenze sind hier keine Städte erfasst. Verringere die Zahl oder wähle ein anderes
                Land.
              </p>
            )}
            <button
              type="button"
              className="btn-primary exercise-start"
              onClick={start}
              disabled={!valid || !selected?.count}
            >
              Quiz starten
              <ArrowRight aria-hidden />
            </button>
          </>
        )}
      </div>
    </Page>
  )
}
