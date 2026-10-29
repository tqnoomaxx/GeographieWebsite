import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, NotebookPen } from 'lucide-react'
import { useDocumentTitle } from '@/app/hooks'
import { parseNotebookLink } from '@/services/notes/model'
import { NotesPanel } from './NotesPanel'

export default function NotesPage() {
  useDocumentTitle('Meine Lernnotizen')
  const [initialAccess] = useState(() => parseNotebookLink(location.href))
  return (
    <div className="notes-page">
      <Link to="/play" className="notes-page-back">
        <ArrowLeft aria-hidden />
        Zu den Quizzes
      </Link>
      <section className="notes-page-panel">
        <header className="learning-notes-heading">
          <NotebookPen aria-hidden />
          <div>
            <h1>Meine Lernnotizen</h1>
            <p>Dein Notizbuch für die nächsten Lernziele.</p>
          </div>
        </header>
        <NotesPanel initialAccess={initialAccess} />
      </section>
    </div>
  )
}
