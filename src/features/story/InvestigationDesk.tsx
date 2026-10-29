import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  FileText,
  Fingerprint,
  Lightbulb,
  LockKeyhole,
  MapPin,
  RotateCcw,
  X,
} from 'lucide-react'
import { useAsync } from '@/app/hooks'
import { fetchJson } from '@/services/data/dataService'
import { QuizNotesButton } from '@/features/notes/QuizNotesButton'
import { INVESTIGATIONS, type CaseEvidence, type Investigation } from './investigations'
import {
  caseAvailable,
  caseRating,
  newInvestigationRun,
  nextInvestigation,
  ratingLabel,
  type InvestigationAction,
  type InvestigationProgress,
  type InvestigationRun,
  type MapData,
} from './investigationProgress'
import { InvestigationMap } from './InvestigationMap'

function CaseSources({ file }: { file: Investigation }) {
  return (
    <details className="investigation-sources">
      <summary>Geografische Quellen &amp; Einordnung</summary>
      <p>
        Die Reisedokumente und die Handlung sind erfunden. Orte, Gewässer und geografische Zusammenhänge sind
        real. Die Abschriften enthalten absichtlich falsche Angaben, die du überprüfen sollst.
      </p>
      <ul>
        {file.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label} ↗
            </a>
          </li>
        ))}
      </ul>
      <p>
        Geodaten: Natural Earth (Public Domain); am Zusammenfluss bei Mzcheta zusätzlich OpenStreetMap (ODbL).
        Stand: Oktober 2026.
      </p>
    </details>
  )
}
function ArchiveFragments({ progress }: { progress: InvestigationProgress }) {
  return (
    <dl className="investigation-fragments">
      {INVESTIGATIONS.slice(0, 7)
        .filter((file) => progress.cleared.includes(file.id))
        .map((file, index) => (
          <div key={file.id}>
            <dt>
              <span>AKTE {String(index + 1).padStart(2, '0')}</span>
              {file.fragment.label}
            </dt>
            <dd>{file.fragment.value}</dd>
          </div>
        ))}
    </dl>
  )
}
function EvidenceDocument({
  evidence,
  run,
  file,
  progress,
  onAdvance,
}: {
  evidence: CaseEvidence
  run: InvestigationRun
  file: Investigation
  progress: InvestigationProgress
  onAdvance: (action: InvestigationAction) => void
}) {
  const selected = run.proof.includes(evidence.id)
  return (
    <article className={`evidence-document document-${evidence.kind}`}>
      <div className="document-label">{evidence.label}</div>
      <h2>{evidence.title}</h2>
      {evidence.glyphs && (
        <p className="evidence-glyphs" lang="lo">
          {evidence.glyphs}
        </p>
      )}
      <p className="document-text">{evidence.text}</p>
      {evidence.rows && (
        <table className="evidence-table">
          <tbody>
            {evidence.rows.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {evidence.detail && <p className="document-detail">{evidence.detail}</p>}
      {evidence.kind === 'archive' && <ArchiveFragments progress={progress} />}
      <fieldset className="evidence-classification">
        <legend>Einordnung dieser Unterlage</legend>
        <label className={selected ? 'is-selected' : ''}>
          <input
            type="checkbox"
            checked={selected}
            disabled={!selected && run.proof.length >= file.proof.length}
            onChange={() => onAdvance({ type: 'proof', caseId: file.id, evidence: evidence.id })}
          />
          <span>Als Beleg verwenden</span>
          <CheckCheck aria-hidden />
        </label>
        <label className={run.rejected === evidence.id ? 'is-rejected' : ''}>
          <input
            type="radio"
            name={`rejected-${file.id}`}
            checked={run.rejected === evidence.id}
            onChange={() => onAdvance({ type: 'reject', caseId: file.id, evidence: evidence.id })}
          />
          <span>Enthält die falsche Schlussfolgerung</span>
          <Fingerprint aria-hidden />
        </label>
      </fieldset>
    </article>
  )
}
function CaseResult({
  file,
  index,
  run,
  data,
  onOpen,
  onOffice,
  onAdvance,
  progress,
}: {
  file: Investigation
  index: number
  run: InvestigationRun
  data?: MapData
  onOpen: (index: number) => void
  onOffice: () => void
  onAdvance: (action: InvestigationAction) => void
  progress: InvestigationProgress
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [review, setReview] = useState(false)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return (
    <section className="investigation-result" data-investigation-result="solved">
      <div className="case-result-paper">
        <span className="case-cleared-stamp">
          <Check aria-hidden />
          AKTE GEKLÄRT
        </span>
        <p className="investigation-eyebrow">Ermittlungsbericht / {String(index + 1).padStart(2, '0')}</p>
        <h1 ref={heading} tabIndex={-1}>
          {index === 7 ? 'Das Original ist gesichert.' : file.title}
        </h1>
        <p className="case-result-solution">{file.solution}</p>
        <div className="case-result-counterproof">
          <Fingerprint aria-hidden />
          <p>{file.reject?.explanation}</p>
        </div>
        <div className="case-result-ending">
          <span className="investigation-eyebrow">
            {index === 7 ? 'Der versiegelte Brief' : 'Die nächste Spur'}
          </span>
          <p>{file.ending}</p>
        </div>
        <div className="case-result-metrics">
          <span>{ratingLabel(caseRating(run))}</span>
          <span>
            {run.hints} {run.hints === 1 ? 'Denkanstoß' : 'Denkanstöße'} · {run.submissions}{' '}
            {run.submissions === 1 ? 'Prüfung' : 'Prüfungen'}
          </span>
        </div>
        <div className="case-result-actions">
          <button
            type="button"
            className="investigation-primary"
            onClick={() => (index < 7 ? onOpen(index + 1) : onOffice())}
          >
            {index < 7 ? 'Nächste Akte öffnen' : 'Zurück ins Büro'}
            <ArrowRight aria-hidden />
          </button>
          {index < 7 && (
            <button type="button" className="investigation-secondary" onClick={onOffice}>
              Ins Büro
            </button>
          )}
        </div>
        <button
          type="button"
          className="investigation-text-button"
          onClick={() => {
            onAdvance({ type: 'replay', caseId: file.id })
            window.scrollTo({ top: 0, behavior: 'instant' })
          }}
        >
          <RotateCcw aria-hidden />
          Fall erneut ermitteln
        </button>
        <CaseSources file={file} />
      </div>
      <aside className="case-result-find">
        <span className="investigation-eyebrow">Gesicherter Archivfund</span>
        <div className="archive-find-value">{file.fragment.value}</div>
        <p>{file.fragment.label}</p>
        <span className="archive-find-case">
          Aus Akte {String(index + 1).padStart(2, '0')}
          <br />
          {file.title}
        </span>
        <p className="archive-find-note">
          {index === 7
            ? 'Das Originalarchiv ist vollständig.'
            : 'Im Fallarchiv aufbewahrt. Du brauchst diesen Fund für die letzte Ermittlung.'}
        </p>
        {index === 7 && <ArchiveFragments progress={progress} />}
        {data && (
          <button type="button" className="investigation-text-button" onClick={() => setReview(!review)}>
            {review ? 'Karte schließen' : 'Gesicherte Karte ansehen'}
            <MapPin aria-hidden />
          </button>
        )}
      </aside>
      {review && data && (
        <div className="case-result-map">
          <InvestigationMap
            file={file}
            data={data}
            pins={run.pins}
            activeTarget={file.targets[0].id}
            onPin={() => {}}
            readOnly
          />
        </div>
      )}
    </section>
  )
}

export function InvestigationDesk({
  index,
  progress,
  saved,
  onAdvance,
  onOpen,
  onOffice,
  onArchive,
}: {
  index: number
  progress: InvestigationProgress
  saved: boolean
  onAdvance: (action: InvestigationAction) => void
  onOpen: (index: number) => void
  onOffice: () => void
  onArchive: () => void
}) {
  const file = INVESTIGATIONS[index]
  const run = progress.cases[file.id] ?? newInvestigationRun()
  const [activeTarget, setActiveTarget] = useState(file.targets[0].id)
  const [evidenceId, setEvidenceId] = useState(run.opened.at(-1) ?? file.evidence[0].id)
  const [showFeedback, setShowFeedback] = useState(false)
  const [mobileView, setMobileView] = useState<'map' | 'evidence'>('map')
  const feedback = useRef<HTMLDivElement>(null)
  const available = caseAvailable(progress, file.id)
  const { data, loading, error, reload } = useAsync(
    () => (available ? fetchJson<MapData>(`story/${file.map}.geojson`) : Promise.resolve(undefined)),
    [file.map, available],
  )
  const evidence = file.evidence.find((item) => item.id === evidenceId) ?? file.evidence[0]
  useEffect(() => {
    if (available) {
      onAdvance({ type: 'start', caseId: file.id })
      onAdvance({ type: 'open', caseId: file.id, evidence: evidenceId })
    }
  }, [file.id, available, onAdvance, evidenceId])
  useEffect(() => {
    if (showFeedback && run.feedback && !run.solved) feedback.current?.focus({ preventScroll: true })
  }, [run.feedback, run.solved, showFeedback])
  const selectEvidence = (id: string) => {
    setEvidenceId(id)
    onAdvance({ type: 'open', caseId: file.id, evidence: id })
  }
  return (
    <div
      className={`investigation-desk theme-${file.theme}`}
      style={{ '--case-accent': file.accent } as CSSProperties}
      data-case={file.id}
    >
      <header className="investigation-topbar">
        <button type="button" className="investigation-text-button" onClick={onOffice}>
          <ArrowLeft aria-hidden />
          <span>Ins Büro</span>
        </button>
        <span className="investigation-case-number">AKTE {String(index + 1).padStart(2, '0')} / 08</span>
        <div>
          <QuizNotesButton context={`Story · Fall ${index + 1}: ${file.title}`} />
          <button type="button" className="investigation-text-button" onClick={onArchive}>
            Fallarchiv
          </button>
        </div>
      </header>
      {!available ? (
        <section className="investigation-locked">
          <LockKeyhole aria-hidden />
          <p className="investigation-eyebrow">Akte noch versiegelt</p>
          <h1>{file.title}</h1>
          <p>
            {file.region} · {file.difficulty}
          </p>
          <p>Kläre zuerst die vorherige Akte. Ihre Ergebnisse werden für diese Ermittlung gebraucht.</p>
          <button
            type="button"
            className="investigation-primary"
            onClick={() => onOpen(nextInvestigation(progress))}
          >
            Zur aktuellen Ermittlung
            <ArrowRight aria-hidden />
          </button>
        </section>
      ) : run.solved ? (
        <CaseResult
          key={`${file.id}-result`}
          file={file}
          index={index}
          run={run}
          data={data}
          onOpen={onOpen}
          onOffice={onOffice}
          onAdvance={onAdvance}
          progress={progress}
        />
      ) : (
        <>
          <div className="investigation-masthead">
            <div>
              <p className="investigation-eyebrow">
                {file.region} <span> / </span> {file.difficulty}
              </p>
              <h1>{file.title}</h1>
            </div>
            <span className="investigation-open-stamp">IN ERMITTLUNG</span>
          </div>
          <div className="investigation-brief">
            <p>{file.objective}</p>
            <details>
              <summary>Die Geschichte bis hierher</summary>
              <p>{file.intro}</p>
            </details>
          </div>
          <nav className="investigation-mobile-tabs" aria-label="Arbeitsfläche">
            <button type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}>
              Karte &amp; Markierungen{' '}
              <span>
                {Object.keys(run.pins).length}/{file.targets.length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={mobileView === 'evidence'}
              onClick={() => setMobileView('evidence')}
            >
              Unterlagen &amp; Belege <span>{run.proof.length}/2</span>
            </button>
          </nav>
          <div className={`investigation-workspace mobile-${mobileView}`}>
            <section className="investigation-map-column" aria-label="Kartenarbeit">
              <div className="investigation-targets" aria-label="Zu markierende Orte">
                {file.targets.map((target, i) => (
                  <button
                    type="button"
                    key={target.id}
                    aria-pressed={activeTarget === target.id}
                    onClick={() => setActiveTarget(target.id)}
                  >
                    <span>{i + 1}</span>
                    <strong>{target.label}</strong>
                    {run.pins[target.id] && <Check aria-label="Markierung gesetzt" />}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="investigation-map-loading" role="status">
                  Die Karte wird auf dem Schreibtisch ausgebreitet …
                </div>
              ) : error || !data ? (
                <div className="investigation-map-loading" role="alert">
                  <p>Die Karte konnte nicht geladen werden. Deine Ermittlung bleibt gespeichert.</p>
                  <button type="button" className="investigation-secondary" onClick={reload}>
                    Karte erneut laden
                  </button>
                </div>
              ) : (
                <InvestigationMap
                  file={file}
                  data={data}
                  pins={run.pins}
                  activeTarget={activeTarget}
                  onPin={(point) => {
                    onAdvance({ type: 'pin', caseId: file.id, target: activeTarget, point })
                    const next = file.targets.find((item) => item.id !== activeTarget && !run.pins[item.id])
                    if (next) setActiveTarget(next.id)
                  }}
                />
              )}
              {Object.keys(run.pins).length > 0 && (
                <div className="investigation-pin-list">
                  {file.targets
                    .filter((target) => run.pins[target.id])
                    .map((target) => (
                      <span key={target.id}>
                        {target.label}: {run.pins[target.id].lat.toFixed(3)}°,{' '}
                        {run.pins[target.id].lon.toFixed(3)}°
                        <button
                          type="button"
                          aria-label={`${target.label} entfernen`}
                          onClick={() =>
                            onAdvance({ type: 'remove-pin', caseId: file.id, target: target.id })
                          }
                        >
                          <X aria-hidden />
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </section>
            <section className="investigation-evidence-column" aria-label="Unterlagen und Schlussfolgerung">
              <div className="evidence-section-heading">
                <span className="investigation-eyebrow">Unterlagen</span>
                <span>
                  {run.opened.length}/{file.evidence.length} gelesen
                </span>
              </div>
              <div
                className="evidence-tabs"
                role="tablist"
                aria-label="Unterlagen"
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                  event.preventDefault()
                  const current = file.evidence.findIndex((item) => item.id === evidenceId)
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? file.evidence.length - 1
                        : (current + (event.key === 'ArrowRight' ? 1 : -1) + file.evidence.length) %
                          file.evidence.length
                  selectEvidence(file.evidence[next].id)
                  event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next].focus()
                }}
              >
                {file.evidence.map((item, i) => (
                  <button
                    type="button"
                    key={item.id}
                    role="tab"
                    id={`evidence-tab-${item.id}`}
                    aria-selected={evidenceId === item.id}
                    aria-controls={`evidence-panel-${file.id}`}
                    tabIndex={evidenceId === item.id ? 0 : -1}
                    aria-label={`Unterlage ${i + 1}: ${item.title}`}
                    onClick={() => selectEvidence(item.id)}
                  >
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <span>{item.title}</span>
                    {run.proof.includes(item.id) ? (
                      <CheckCheck aria-hidden />
                    ) : run.rejected === item.id ? (
                      <Fingerprint aria-hidden />
                    ) : (
                      <FileText aria-hidden />
                    )}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`evidence-panel-${file.id}`}
                aria-labelledby={`evidence-tab-${evidence.id}`}
              >
                <EvidenceDocument
                  key={evidence.id}
                  evidence={evidence}
                  run={run}
                  file={file}
                  progress={progress}
                  onAdvance={onAdvance}
                />
              </div>
              <div className="investigation-conclusion">
                <p className="investigation-eyebrow">Deine Schlussfolgerung</p>
                <div className="investigation-proof-summary">
                  <span>Belege</span>
                  <strong>
                    {run.proof.length} / {file.proof.length}
                  </strong>
                </div>
                {run.proof.length > 0 ? (
                  <ul className="investigation-chosen-proof">
                    {run.proof.map((id) => (
                      <li key={id}>
                        <CheckCheck aria-hidden />
                        <span>{file.evidence.find((item) => item.id === id)?.title}</span>
                        <button
                          type="button"
                          aria-label={`Beleg ${file.evidence.find((item) => item.id === id)?.title} entfernen`}
                          onClick={() => onAdvance({ type: 'proof', caseId: file.id, evidence: id })}
                        >
                          <X aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="conclusion-help">
                    Lies die Unterlagen und wähle zwei, die deine Markierung gemeinsam belegen.
                  </p>
                )}
                <div className="investigation-rejected-summary">
                  <Fingerprint aria-hidden />
                  <span>
                    {run.rejected
                      ? `Unzuverlässig: ${file.evidence.find((item) => item.id === run.rejected)?.title}`
                      : 'Noch keine falsche Schlussfolgerung gekennzeichnet.'}
                  </span>
                </div>
                {file.calculation && (
                  <label className="investigation-calculation">
                    {file.calculation.label}
                    <span>
                      <input
                        inputMode="decimal"
                        aria-label={file.calculation.label}
                        value={run.calculation}
                        onChange={(event) =>
                          onAdvance({ type: 'calculation', caseId: file.id, value: event.target.value })
                        }
                      />
                      <span>{file.calculation.unit}</span>
                    </span>
                  </label>
                )}
                <button
                  type="button"
                  className="investigation-primary"
                  disabled={!data || loading || !!error}
                  onClick={() => {
                    if (data) {
                      setShowFeedback(true)
                      onAdvance({ type: 'submit', caseId: file.id, map: data })
                    }
                  }}
                >
                  Schlussfolgerung prüfen
                  <ArrowRight aria-hidden />
                </button>
                <p className="investigation-no-penalty">
                  Du kannst Markierungen und Belege jederzeit korrigieren.
                </p>
                {run.feedback && (
                  <div ref={feedback} tabIndex={-1} className="investigation-feedback" role="status">
                    <strong>Noch nicht schlüssig.</strong>
                    <ul>
                      {run.feedback.checks.map((check) => (
                        <li key={check.id} className={check.correct ? 'is-correct' : ''}>
                          {check.correct ? (
                            <Check aria-hidden />
                          ) : (
                            <span className="check-open" aria-hidden>
                              ○
                            </span>
                          )}
                          <span>{check.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="investigation-hints">
                {run.hints > 0 && (
                  <ol>
                    {file.hints.slice(0, run.hints).map((hint) => (
                      <li key={hint}>{hint}</li>
                    ))}
                  </ol>
                )}
                <button
                  type="button"
                  className="investigation-text-button"
                  disabled={run.hints >= file.hints.length}
                  onClick={() => onAdvance({ type: 'hint', caseId: file.id })}
                >
                  <Lightbulb aria-hidden />
                  {run.hints >= file.hints.length
                    ? 'Alle Denkanstöße geöffnet'
                    : `Denkanstoß ansehen (${run.hints + 1}/${file.hints.length})`}
                </button>
                {run.hints === 0 && (
                  <p>
                    Von einem kleinen Anstoß bis zur Auflösung. Das Öffnen fließt in deinen Ermittlungsbericht
                    ein.
                  </p>
                )}
              </div>
              <CaseSources file={file} />
            </section>
          </div>
        </>
      )}
      <p className={`investigation-save-status${saved ? '' : ' is-unsaved'}`} role="status">
        {saved
          ? 'Markierungen, Belege und Archivfunde werden auf diesem Gerät gespeichert.'
          : 'Dein Browser kann gerade nicht speichern. Du kannst weiter ermitteln; halte diese Seite geöffnet.'}
      </p>
    </div>
  )
}
