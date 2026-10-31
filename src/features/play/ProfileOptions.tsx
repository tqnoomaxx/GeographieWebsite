import { useMemo } from 'react'
import { useGeoData } from '@/app/DataProvider'
import type { Country } from '@/domain/types'
import { countryProfileFields } from '@/engine/generators/countryProfile'
import { isSovereign } from '@/engine/generators/base'
import { DEFAULT_PROFILE_FIELDS, PROFILE_CATEGORIES } from '@/engine/profile'

export function ProfileOptions({
  fields,
  scope = 'world',
  onFieldsChange,
  learning,
  onLearningChange,
  length,
  onLengthChange,
}: {
  scope?: string
  fields: string[]
  onFieldsChange: (fields: string[]) => void
  learning: boolean
  onLearningChange: (value: boolean) => void
  length: number | 'all'
  onLengthChange: (value: number | 'all') => void
}) {
  const geo = useGeoData()
  const coverage = useMemo(() => {
    const context = geo.contextFor(scope)
    const counts = new Map<string, number>()
    for (const country of context.countries.filter(
      (country) => country.id === scope || isSovereign(country),
    )) {
      for (const field of countryProfileFields(country as Country, context)) {
        if (field.answers.length && field.display) counts.set(field.id, (counts.get(field.id) ?? 0) + 1)
      }
    }
    return counts
  }, [geo, scope])
  const countryFocus = scope.startsWith('country:')
  const supported = (ids: string[]) => (countryFocus ? ids.filter((id) => coverage.has(id)) : ids)
  return (
    <>
      <fieldset className="exercise-control profile-learning-options">
        <legend>Spielweise</legend>
        <div className="answer-form-options">
          <button
            type="button"
            aria-pressed={!learning}
            className={!learning ? 'is-selected' : ''}
            onClick={() => onLearningChange(false)}
          >
            Wissen testen
          </button>
          <button
            type="button"
            aria-pressed={learning}
            className={learning ? 'is-selected' : ''}
            onClick={() => onLearningChange(true)}
          >
            Wiederholungslernen
          </button>
        </div>
        <p>
          {learning
            ? countryFocus
              ? 'Übe die gewählten Wissensfelder dieses Landes erneut, bis du sie selbst lösen kannst.'
              : 'Aufgelöste Kategorien kommen nach einigen Ländern erneut dran – so lange, bis du sie selbst lösen kannst. Bereits gewusste Felder bleiben ausgespart.'
            : 'Vervollständige jedes Länderprofil einmal. Du kannst fehlende Antworten jederzeit auflösen.'}
        </p>
      </fieldset>
      {!countryFocus && (
        <label className="exercise-control">
          Länder pro Runde
          <select
            aria-label="Länder pro Runde"
            value={length}
            onChange={(event) =>
              onLengthChange(event.target.value === 'all' ? 'all' : Number(event.target.value))
            }
          >
            <option value="10">10 Länder</option>
            <option value="20">20 Länder</option>
            <option value="50">50 Länder</option>
            <option value="all">Alle passenden Länder</option>
          </select>
        </label>
      )}
      <details className="profile-category-options" open>
        <summary>
          Kategorien auswählen <span>{fields.length} ausgewählt</span>
        </summary>
        <div className="profile-presets" role="group" aria-label="Kategorien-Vorlagen">
          <button type="button" onClick={() => onFieldsChange(supported([...DEFAULT_PROFILE_FIELDS]))}>
            Grundwissen
          </button>
          <button
            type="button"
            onClick={() =>
              onFieldsChange(
                supported(['capital', 'continent', 'language', 'highest_point', 'neighbors', 'subregion']),
              )
            }
          >
            Geografie
          </button>
          <button type="button" onClick={() => onFieldsChange([])}>
            Alle abwählen
          </button>
        </div>
        <div className="profile-category-grid">
          {PROFILE_CATEGORIES.map((category) => (
            <label key={category.id}>
              <input
                type="checkbox"
                aria-label={category.title}
                checked={fields.includes(category.id)}
                disabled={countryFocus && !coverage.has(category.id) && !fields.includes(category.id)}
                onChange={() =>
                  onFieldsChange(
                    fields.includes(category.id)
                      ? fields.filter((id) => id !== category.id)
                      : [...fields, category.id],
                  )
                }
              />
              <span>
                {category.title}
                <small>
                  {countryFocus
                    ? coverage.has(category.id)
                      ? 'Angaben vorhanden'
                      : 'Keine Angaben für dieses Land'
                    : `${coverage.get(category.id) ?? 0} Länder mit Angaben`}
                </small>
              </span>
            </label>
          ))}
        </div>
        <p className="profile-coverage-note">
          {countryFocus
            ? 'Wähle mindestens ein Wissensfeld für dieses Land. Kategorien ohne Angaben sind entsprechend gekennzeichnet.'
            : 'Angeboten werden Länder mit Angaben in allen ausgewählten Kategorien. Wähle mindestens eine Kategorie.'}
        </p>
      </details>
    </>
  )
}
