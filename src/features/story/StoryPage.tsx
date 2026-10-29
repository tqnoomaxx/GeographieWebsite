import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { useDocumentTitle } from '@/app/hooks'
import { useReducedMotion } from '@/services/settings/motion'
import { INVESTIGATIONS } from './investigations'
import { useInvestigationProgress } from './useInvestigationProgress'
import { CaseArchive, InvestigationOffice } from './InvestigationOffice'
import { InvestigationDesk } from './InvestigationDesk'
import './story.css'

export default function StoryPage() {
  const { progress, saved, advance, reset } = useInvestigationProgress()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const selected = INVESTIGATIONS.findIndex((file) => file.id === params.get('case'))
  const reducedMotion = useReducedMotion()
  const [archive, setArchive] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  useDocumentTitle(selected >= 0 ? `${INVESTIGATIONS[selected].title} · Story` : 'Die falsche Route · Story')
  useEffect(() => {
    if ((params.has('case') && selected < 0) || params.has('level')) navigate('/story', { replace: true })
  }, [selected, params, navigate])
  useEffect(() => {
    if (archive && !dialog.current?.open) dialog.current?.showModal()
  }, [archive])
  const openArchive = () => {
    returnFocus.current = document.activeElement as HTMLElement
    setConfirmReset(false)
    setArchive(true)
  }
  const closeArchive = () => {
    setArchive(false)
    setConfirmReset(false)
    requestAnimationFrame(() => returnFocus.current?.focus())
  }
  const openCase = (index: number) => {
    setArchive(false)
    navigate(`/story?case=${INVESTIGATIONS[index].id}`)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  return (
    <div
      className={`story-page investigation-page${selected >= 0 ? ' is-case-route' : ''}`}
      data-motion={reducedMotion ? 'paused' : 'running'}
    >
      {selected >= 0 ? (
        <InvestigationDesk
          key={INVESTIGATIONS[selected].id}
          index={selected}
          progress={progress}
          saved={saved}
          onAdvance={advance}
          onOpen={openCase}
          onOffice={() => navigate('/story')}
          onArchive={openArchive}
        />
      ) : (
        <InvestigationOffice progress={progress} saved={saved} onOpen={openCase} onArchive={openArchive} />
      )}
      {archive && (
        <dialog
          ref={dialog}
          className="investigation-archive"
          aria-labelledby="case-archive-title"
          onCancel={(event) => {
            event.preventDefault()
            closeArchive()
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeArchive()
          }}
        >
          <header>
            <div>
              <p className="investigation-eyebrow">Die falsche Route</p>
              <h2 id="case-archive-title">
                {confirmReset ? 'Ermittlungen zurücksetzen?' : 'Das Fallarchiv'}
              </h2>
            </div>
            <button type="button" aria-label="Fallarchiv schließen" autoFocus onClick={closeArchive}>
              <X aria-hidden />
            </button>
          </header>
          {confirmReset ? (
            <div className="investigation-reset-confirm">
              <p>
                Damit löschst du alle Markierungen, Belege und Archivfunde dieser Kampagne auf diesem Gerät.
              </p>
              <div>
                <button
                  type="button"
                  className="investigation-secondary"
                  onClick={() => setConfirmReset(false)}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  className="investigation-primary"
                  onClick={() => {
                    reset()
                    closeArchive()
                    navigate('/story')
                  }}
                >
                  Ja, Ermittlungen zurücksetzen
                </button>
              </div>
            </div>
          ) : (
            <CaseArchive progress={progress} onOpen={openCase} onReset={() => setConfirmReset(true)} />
          )}
        </dialog>
      )}
    </div>
  )
}
