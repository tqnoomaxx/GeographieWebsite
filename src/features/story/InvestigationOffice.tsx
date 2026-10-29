import { ArrowUpRight, Archive, Check, LockKeyhole } from 'lucide-react'
import { INVESTIGATIONS } from './investigations'
import { nextInvestigation, type InvestigationProgress } from './investigationProgress'
import { QuizNotesButton } from '@/features/notes/QuizNotesButton'
import './office.css'

export function InvestigationOffice({
  progress,
  saved,
  onOpen,
  onArchive,
}: {
  progress: InvestigationProgress
  saved: boolean
  onOpen: (index: number) => void
  onArchive: () => void
}) {
  const index = nextInvestigation(progress)
  const file = INVESTIGATIONS[index]
  const completed = progress.cleared.length === INVESTIGATIONS.length
  return (
    <section className="story-office" aria-label="Ermittlungsbüro">
      <div className="office-window">
        <header className="office-header">
          <span className="office-brand">ERMITTLUNGSBÜRO</span>
          <div className="office-tools">
            <QuizNotesButton context="Story · Die falsche Route" />
            <button className="office-archive-button" type="button" onClick={onArchive}>
              <Archive aria-hidden />
              <span>Fallarchiv</span>
              <span className="office-archive-count">{progress.cleared.length}/8</span>
            </button>
          </div>
        </header>
        <div className="office-scene">
          <div className="office-stage">
            <div aria-hidden="true">
              <div className="back-wall" />
              <div className="wall-trim" />
              <div className="blind-window" />
              <div className="pinboard">
                <div className="board-note a" />
                <div className="board-note b" />
                <div className="board-note c" />
                <div className="office-board-progress">
                  {INVESTIGATIONS.map((item, i) => (
                    <span key={item.id} className={progress.cleared.includes(item.id) ? 'is-cleared' : ''}>
                      {progress.cleared.includes(item.id) ? <Check /> : i + 1}
                    </span>
                  ))}
                </div>
              </div>
              <div className="filing-cabinet">
                <div className="cabinet-drawer" />
                <div className="cabinet-drawer" />
              </div>
              <div className="desk" />
              <div className="desk-pad" />
              <div className="loose-paper" />
              <div className="lamp-glow" />
              <div className="desk-lamp">
                <div className="lamp-foot" />
                <div className="lamp-stem" />
                <div className="lamp-shade" />
                <div className="lamp-chain" />
              </div>
              <div className="cup" />
              <div className="pen" />
              <div className="light-shafts" />
              <div className="dust" />
              <div className="desk-front" />
              <div className="vignette" />
            </div>
            <div className="office-title">
              <p className="office-kicker">Eine geografische Ermittlung</p>
              <h1>
                Die falsche
                <br />
                Route.
              </h1>
              <p>
                {completed ? 'Das Originalarchiv ist gesichert.' : 'Acht Akten. Ein verschwundenes Original.'}
              </p>
            </div>
            <button
              type="button"
              className="case-file"
              data-story-route={index}
              aria-label={`Fall ${index + 1}: ${file.title}, ${progress.cases[file.id] ? 'fortsetzen' : 'Akte öffnen'}`}
              onClick={() => onOpen(index)}
            >
              <span className="file-number">
                FALL {String(index + 1).padStart(2, '0')} / {file.region.toLocaleUpperCase('de')}
              </span>
              <span className="file-title">{file.title}</span>
              <span className="file-action">
                {completed
                  ? 'Abschluss ansehen'
                  : progress.cases[file.id]
                    ? 'Ermittlung fortsetzen'
                    : 'Akte öffnen'}{' '}
                <ArrowUpRight aria-hidden />
              </span>
            </button>
          </div>
        </div>
        <footer className="office-footer">
          <span>
            {completed ? 'ALLE 8 FÄLLE GEKLÄRT' : `${progress.cleared.length} VON 8 FÄLLEN GEKLÄRT`}
          </span>
          <span role="status">
            {saved ? 'Auf diesem Gerät gespeichert' : 'Speichern nicht möglich – Seite geöffnet lassen'}
          </span>
        </footer>
      </div>
      <div className="office-introduction">
        <span className="investigation-eyebrow">Dein Auftrag</span>
        <p>
          Jemand hat die Reiseberichte einer Kartografin verändert. Prüfe die Karten, kombiniere Belege und
          finde heraus, wo das Originalarchiv geblieben ist.
        </p>
        <div>
          <span>Markieren</span>
          <i>→</i>
          <span>Belegen</span>
          <i>→</i>
          <span>Widersprüche lösen</span>
        </div>
      </div>
    </section>
  )
}

export function CaseArchive({
  progress,
  onOpen,
  onReset,
}: {
  progress: InvestigationProgress
  onOpen: (index: number) => void
  onReset: () => void
}) {
  return (
    <>
      <p className="archive-intro">
        Jede geklärte Akte öffnet die nächste. Laufende Ermittlungen kannst du jederzeit fortsetzen.
      </p>
      <ol className="investigation-archive-list">
        {INVESTIGATIONS.map((file, index) => {
          const cleared = progress.cleared.includes(file.id)
          const locked = index > progress.cleared.length
          return (
            <li key={file.id}>
              <button type="button" data-story-archive={index} onClick={() => onOpen(index)}>
                <span className="archive-number">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <strong>{file.title}</strong>
                  <small>
                    {file.region} · {file.difficulty}
                  </small>
                </span>
                {cleared ? (
                  <Check aria-label="Geklärt" />
                ) : locked ? (
                  <LockKeyhole aria-label="Noch gesperrt" />
                ) : (
                  <ArrowUpRight aria-label="Öffnen" />
                )}
              </button>
              {cleared && (
                <p className="archive-fragment">
                  <span>{file.fragment.label}</span> <b>{file.fragment.value}</b>
                </p>
              )}
            </li>
          )
        })}
      </ol>
      <button type="button" className="investigation-text-button archive-reset" onClick={onReset}>
        Ermittlungen zurücksetzen …
      </button>
    </>
  )
}
