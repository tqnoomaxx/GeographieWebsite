import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Wrench } from 'lucide-react'
import type { Question } from '@/engine/types'
import { improvementContext } from '@/services/improvements'
import { useDeveloperAccess } from './useDeveloperAccess'
import { ImprovementDialog } from './ImprovementDialog'

export function DeveloperQuizButton({ context, question }: { context: string; question?: Question }) {
  const access = useDeveloperAccess()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  if (!access.allowed) return null
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="dev-quiz-trigger"
        aria-label="Verbesserung notieren"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Wrench aria-hidden />
        <span>Verbessern</span>
      </button>
      {open && (
        <ImprovementDialog
          context={improvementContext(context, location.pathname + location.search, question)}
          onClose={() => {
            setOpen(false)
            requestAnimationFrame(() => trigger.current?.focus())
          }}
        />
      )}
    </>
  )
}
