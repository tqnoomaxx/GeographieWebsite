import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '@/app/hooks'
import { Page, Card } from '@/ui'

const CONTENT: Record<string, { title: string; sections: Array<[string, string]> }> = {
  imprint: {
    title: 'Impressum',
    sections: [
      ['Angaben gemäß § 5 DDG', '[Name des Betreibers]\n[Straße Hausnummer]\n[PLZ Ort]\n[Land]'],
      ['Kontakt', 'E-Mail: [kontakt@example.org]'],
      ['Verantwortlich für den Inhalt', '[Name]'],
      ['Haftung für Inhalte und Links', 'Die geografischen Daten stammen aus öffentlichen Quellen (siehe Quellen und Lizenzen) und werden ohne Gewähr auf Richtigkeit und Aktualität bereitgestellt.'],
    ],
  },
  privacy: {
    title: 'Datenschutzerklärung',
    sections: [
      ['Grundsatz', 'GeoKompass ist datensparsam aufgebaut. In der aktuellen Version werden keine personenbezogenen Daten an einen Server übertragen, es gibt keine Nutzerkonten, kein Tracking und keine Analyse-Dienste.'],
      ['Lokale Speicherung', 'Spielfortschritt, Einstellungen, Favoriten und Rätselergebnisse werden ausschließlich lokal im Browser gespeichert (IndexedDB und LocalStorage). Sie können diese Daten jederzeit unter Einstellungen → Meine Daten exportieren oder löschen.'],
      ['Hosting', 'Die Website wird über GitHub Pages ausgeliefert. Beim Abruf verarbeitet der Hosting-Anbieter technisch notwendige Verbindungsdaten (z. B. IP-Adresse) in Server-Logs. Details: Datenschutzerklärung von GitHub.'],
      ['Externe Links', 'Quellenangaben verlinken auf Wikimedia Commons, Wikidata, Wikipedia und GitHub. Beim Anklicken gelten die Datenschutzbestimmungen der jeweiligen Anbieter.'],
      ['Cookies', 'Es werden keine Cookies gesetzt. Ein Consent-Banner ist deshalb nicht erforderlich.'],
      ['Kontakt und Vorschläge', 'Formulare öffnen in dieser Version einen vorausgefüllten GitHub-Issue; die Übermittlung erfolgt durch Sie selbst bei GitHub.'],
    ],
  },
  terms: {
    title: 'Nutzungsbedingungen',
    sections: [
      ['Nutzung', 'GeoKompass ist ein kostenloses Lern- und Quizangebot. Die Nutzung erfolgt auf eigene Verantwortung.'],
      ['Inhalte und Lizenzen', 'Flaggen, Fotos und Geodaten stehen unter den jeweils angegebenen freien Lizenzen (siehe Quellen und Lizenzen). Der Anwendungscode steht unter der im Repository angegebenen Lizenz.'],
      ['Fairness', 'Es gibt keine käuflichen Vorteile, keine Rangliste und keine Bestrafung für Pausen. Der Fortschritt dient ausschließlich der eigenen Motivation.'],
    ],
  },
}

export default function LegalPage({ page }: { page: 'imprint' | 'privacy' | 'terms' }) {
  const { t } = useTranslation()
  const c = CONTENT[page]
  useDocumentTitle(c.title)
  return (
    <Page title={c.title} back="/settings">
      <p className="mb-4 rounded-xl bg-warn-soft px-4 py-2 text-sm">⚠ {t('legal.draft')}</p>
      <Card className="grid gap-4">
        {c.sections.map(([h, body]) => (
          <section key={h}>
            <h2 className="mb-1 font-medium">{h}</h2>
            <p className="whitespace-pre-line text-sm text-ink-2">{body}</p>
          </section>
        ))}
      </Card>
    </Page>
  )
}
