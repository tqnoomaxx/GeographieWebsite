import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw } from 'lucide-react'
import { useDataResources, useGeoData } from '@/app/DataProvider'
import { useDocumentTitle } from '@/app/hooks'
import type { Exercise } from '@/config/quizCatalog'
import languageCourses from '@/config/languageCourses.json'
import { normalizeAnswer } from '@/engine/normalize'
import { roundPath } from '@/engine/round'
import { ErrorState, LoadingState, Page } from '@/ui'
import { TrainingOptions, useTrainingSettings } from './TrainingOptions'
import './language-course.css'
import './script-fonts.css'

export function LanguageCourseSetup({ exercise }: { exercise: Exercise }) {
  const [params] = useSearchParams()
  const geo = useGeoData()
  const resource = useDataResources(['courseCards'])
  const navigate = useNavigate()
  const course = languageCourses.find((c) => c.code === exercise.language)!
  const [collection, setCollection] = useState(params.get('collection') === 'words' ? 'words' : 'alphabet')
  const [mode, setMode] = useState(params.get('mode') === 'input' ? 'input' : 'choice')
  const [topic, setTopic] = useState('all')
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [training, changeTraining] = useTrainingSettings()
  useDocumentTitle(exercise.title)
  const available = useMemo(
    () =>
      geo
        .contextFor('world')
        .scriptWords.filter(
          (entity) =>
            entity.attributes.course === true &&
            entity.attributes.language === course.code &&
            entity.attributes.kind === (collection === 'words' ? 'word' : 'letter'),
        ),
    [geo, course.code, collection],
  )
  const topics = [...new Set(available.map((entity) => String(entity.attributes.topic)))]
  const cards = useMemo(() => {
    const query = normalizeAnswer(search)
    return available.filter(
      (entity) =>
        (topic === 'all' || entity.attributes.topic === topic) &&
        (!query ||
          normalizeAnswer(
            `${entity.attributes.original} ${entity.attributes.meaning ?? entity.attributes.transliteration}`,
          ).includes(query)),
    )
  }, [available, topic, search])
  const currentPosition = Math.min(position, Math.max(0, cards.length - 1))
  const card = cards[currentPosition]
  const reset = () => {
    setPosition(0)
    setRevealed(false)
  }
  const move = (delta: number) => {
    setPosition(currentPosition + delta)
    setRevealed(false)
  }
  const start = () =>
    navigate(
      roundPath({
        category: 'languages',
        exercise: exercise.id,
        mode,
        scope: 'world',
        collection,
        length: training.length === 'all' || cards.length <= training.length ? 'all' : training.length,
        repeat: training.repeat,
        only: topic !== 'all' || search.trim() ? cards.map((entity) => entity.id) : undefined,
      }),
    )
  return (
    <Page>
      <div className="exercise-setup language-course">
        <Link className="simple-back" to="/play/languages">
          <ArrowLeft aria-hidden />
          Sprachen & Schriften
        </Link>
        <header className="exercise-setup-heading">
          <h1>{exercise.title}</h1>
          <p>Erst entdecken, dann üben. Lerne Zeichen und erweitere deinen Wortschatz Karte für Karte.</p>
        </header>
        {resource.error ? (
          <ErrorState onRetry={resource.retry} />
        ) : resource.loading ? (
          <LoadingState message="Sprachkurs wird geladen …" />
        ) : (
          <>
            <fieldset className="exercise-control">
              <legend>Lernmodus</legend>
              <div className="answer-form-options">
                <button
                  type="button"
                  aria-pressed={collection === 'alphabet'}
                  className={collection === 'alphabet' ? 'is-selected' : ''}
                  onClick={() => {
                    setCollection('alphabet')
                    setTopic('all')
                    setSearch('')
                    reset()
                  }}
                >
                  {course.alphabetTitle}
                  <small>{course.letters} Zeichen</small>
                </button>
                <button
                  type="button"
                  aria-pressed={collection === 'words'}
                  className={collection === 'words' ? 'is-selected' : ''}
                  onClick={() => {
                    setCollection('words')
                    setTopic('all')
                    setSearch('')
                    reset()
                  }}
                >
                  Wörter lernen<small>{course.words} Wörter & Begriffe</small>
                </button>
              </div>
            </fieldset>
            {collection === 'alphabet' && (
              <p className="exercise-note">
                {course.code === 'zh'
                  ? 'Chinesisch verwendet Schriftzeichen. Hier lernst du 30 Grundzeichen und ihre Pinyin-Lesehilfe.'
                  : course.code === 'ja'
                    ? 'Lerne die 46 Grundzeichen jeweils in Hiragana und Katakana. Weitere Lautkombinationen folgen aus diesen Grundlagen.'
                    : course.code === 'ko'
                      ? 'Die 24 Hangul-Grundbuchstaben werden zu Silbenblöcken zusammengesetzt. Die Umschrift ist eine Lesehilfe.'
                      : 'Zeichen und ihre Namen oder Lernumschrift. Die Lesehilfe ersetzt keine Ausspracheaufnahme.'}
              </p>
            )}
            {collection === 'words' && (
              <label className="exercise-control">
                Themenbereich
                <select
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value)
                    reset()
                  }}
                >
                  <option value="all">Alle Themen</option>
                  {topics.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="exercise-control">
              Lernkarten suchen
              <input
                type="search"
                value={search}
                placeholder={
                  collection === 'words' ? 'Wort oder deutsche Bedeutung …' : 'Zeichen oder Lesehilfe …'
                }
                onChange={(e) => {
                  setSearch(e.target.value)
                  reset()
                }}
              />
            </label>
            {card ? (
              <section className="language-flashcard" aria-label="Lernkarte">
                <p className="language-card-progress">
                  {currentPosition + 1} / {cards.length} · {String(card.attributes.topic)}
                </p>
                <strong
                  className="script-study-original"
                  lang={course.code}
                  dir={card.attributes.direction === 'rtl' ? 'rtl' : 'ltr'}
                >
                  {String(card.attributes.original)}
                </strong>
                {revealed ? (
                  <div className="language-card-answer" role="status">
                    {collection === 'words' && <span aria-hidden>{String(card.attributes.symbol)}</span>}
                    <p>
                      {String(
                        collection === 'words' ? card.attributes.meaning : card.attributes.transliteration,
                      )}
                    </p>
                  </div>
                ) : (
                  <button className="language-reveal" type="button" onClick={() => setRevealed(true)}>
                    <BookOpen aria-hidden />
                    {collection === 'words' ? 'Bedeutung zeigen' : 'Lesehilfe zeigen'}
                  </button>
                )}
                <div className="language-card-navigation">
                  <button type="button" disabled={currentPosition === 0} onClick={() => move(-1)}>
                    <ArrowLeft aria-hidden />
                    Zurück
                  </button>
                  <button
                    type="button"
                    disabled={!revealed}
                    onClick={() => setRevealed(false)}
                    aria-label="Antwort verbergen"
                  >
                    <RotateCcw aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={currentPosition === cards.length - 1}
                    onClick={() => move(1)}
                  >
                    Weiter
                    <ArrowRight aria-hidden />
                  </button>
                </div>
              </section>
            ) : (
              <p role="status" className="exercise-note">
                Keine Lernkarten gefunden. Ändere die Suche oder den Themenbereich.
              </p>
            )}
            <fieldset className="exercise-control">
              <legend>Wissen testen</legend>
              <div className="answer-form-options">
                <button
                  type="button"
                  aria-pressed={mode === 'choice'}
                  className={mode === 'choice' ? 'is-selected' : ''}
                  onClick={() => setMode('choice')}
                >
                  Auswählen
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'input'}
                  className={mode === 'input' ? 'is-selected' : ''}
                  onClick={() => setMode('input')}
                >
                  Eintippen
                </button>
              </div>
            </fieldset>
            <p className="exercise-summary">
              {cards.length} {cards.length === 1 ? 'Lernkarte' : 'Lernkarten'} in deiner Auswahl
            </p>
            <button
              type="button"
              className="btn-primary exercise-start"
              disabled={cards.length === 0}
              onClick={start}
            >
              Übung starten
              <ArrowRight aria-hidden />
            </button>
            <TrainingOptions settings={training} onChange={changeTraining} />
            <p className="exercise-note language-course-source">
              Wortschatz:{' '}
              <a href="https://cldr.unicode.org/" target="_blank" rel="noreferrer">
                Unicode CLDR
              </a>{' '}
              ·{' '}
              <a
                href={`${import.meta.env.BASE_URL}data/UNICODE-LICENSE.txt`}
                target="_blank"
                rel="noreferrer"
              >
                Unicode-Lizenz
              </a>
              . Die Begriffe stammen aus den lokalisierten Bezeichnungen für Tiere, Essen, Natur, Reisen und
              Alltag.
            </p>
          </>
        )}
      </div>
    </Page>
  )
}
