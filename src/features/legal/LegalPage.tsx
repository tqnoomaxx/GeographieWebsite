import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocumentTitle } from '@/app/hooks'
import { LEGAL, BRAND_NAME, legalDetailsComplete } from '@/config/brand'
import { authConfigured } from '@/services/auth'
import { Page, Card } from '@/ui'

const external = 'underline underline-offset-2 hover:text-ink'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line pb-5 last:border-0 last:pb-0">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="space-y-2 whitespace-pre-line text-sm leading-6 text-ink-2">{children}</div>
    </section>
  )
}

function Operator() {
  return (
    <address className="not-italic">
      {LEGAL.operator || '[Vollständiger Name des Betreibers]'}
      {'\n'}
      {LEGAL.address || '[Straße Hausnummer]\n[PLZ Ort]\nDeutschland'}
      {'\n'}
      E-Mail: {LEGAL.email ? <a className={external} href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> : '[kontakt@example.de]'}
      {LEGAL.extraImprint && `\n${LEGAL.extraImprint}`}
    </address>
  )
}

function Imprint() {
  return (
    <>
      <Section title="Anbieterkennzeichnung"><p>Angaben nach § 5 Digitale-Dienste-Gesetz (DDG), soweit anwendbar:</p><Operator /></Section>
      <Section title="Inhaltlich verantwortlich"><Operator /></Section>
      <Section title="Hinweise zu Inhalten und Links">
        <p>Die geografischen Inhalte werden aus den in der Quellenübersicht genannten Datensätzen zusammengestellt. Trotz sorgfältiger Prüfung können Fehler oder veraltete Angaben nicht ausgeschlossen werden.</p>
        <p>Für Inhalte externer Seiten sind ausschließlich deren Anbieter verantwortlich. Externe Seiten werden erst durch einen bewussten Klick geöffnet.</p>
      </Section>
    </>
  )
}

function Privacy() {
  return (
    <>
      <Section title="1. Verantwortlicher"><Operator /></Section>
      <Section title="2. Datenschutz auf einen Blick">
        <p>{BRAND_NAME} verwendet keine Werbung, keine Reichweitenmessung, keine Tracking-Pixel und keine Social-Media-Plugins. Schriftarten, Karten, Flaggen und Anwendungsdateien werden vom selben Ursprung geladen.</p>
        <p>Der Spielfortschritt bleibt im normalen Gastbetrieb auf Ihrem Gerät. Eine Übertragung an uns findet dabei nicht statt.</p>
      </Section>
      <Section title="3. Aufruf und Hosting">
        <p>Beim Aufruf übermittelt Ihr Browser technisch erforderliche Verbindungsdaten an den Hosting-Anbieter {LEGAL.hostingProvider}. Dazu können IP-Adresse, Zeitpunkt, angeforderte Datei, Referrer sowie Browser- und Betriebssystemangaben gehören. Die Verarbeitung dient der sicheren und fehlerfreien Bereitstellung der Website auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.</p>
        <p>Speicherdauer und weitere Einzelheiten bestimmt der Hosting-Anbieter. <a className={external} href={LEGAL.hostingPrivacyUrl} target="_blank" rel="noreferrer">Datenschutzhinweise des Hosting-Anbieters</a></p>
      </Section>
      <Section title="4. Lokaler Spielfortschritt und Einstellungen">
        <p>Für die ausdrücklich gewählten Lern-, Offline- und Fortschrittsfunktionen speichert die App Einstellungen, Favoriten, Quizverläufe, Lernstände und Rätselergebnisse in LocalStorage, IndexedDB und im Browser-Cache. Diese Informationen verlassen Ihr Gerät nicht.</p>
        <p>Die lokale Speicherung ist für diese vom Nutzer angeforderten Funktionen erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Sie können die Daten unter Einstellungen → Meine Daten exportieren oder vollständig löschen. Ohne gespeicherten Fortschritt kann die Website nach dem Löschen neu begonnen werden.</p>
      </Section>
      <Section title="5. Offline-Funktion">
        <p>Ein Service Worker hält Programmdateien, Geodaten und Medien im Browser-Cache vor. Dadurch funktionieren bereits geladene Inhalte auch offline und müssen nicht bei jedem Besuch erneut übertragen werden. Die Caches lassen sich über die Browser-Einstellungen oder durch Löschen der Website-Daten entfernen.</p>
      </Section>
      <Section title="6. Optionale Konten">
        {authConfigured ? (
          <>
            <p>Wenn Sie freiwillig ein Konto anlegen, werden E-Mail-Adresse, Authentifizierungsdaten, Profilangaben und synchronisierter Spielfortschritt bei unserem Auftragsverarbeiter Supabase verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO zur Bereitstellung der gewünschten Konto- und Synchronisationsfunktion.</p>
            <p>Ein öffentliches Profil wird nur nach Ihrer ausdrücklichen Aktivierung sichtbar. Kontodaten werden bis zur Löschung des Kontos gespeichert; die Löschfunktion befindet sich direkt im Kontobereich. Projektregion: {LEGAL.supabaseRegion || '[vor Aktivierung ergänzen]'}. {LEGAL.supabaseDpaUrl ? <a className={external} href={LEGAL.supabaseDpaUrl} target="_blank" rel="noreferrer">Auftragsverarbeitung und Unterauftragsverarbeiter</a> : 'Angaben zu Auftragsverarbeitung, Unterauftragsverarbeitern und möglichen Drittlandübermittlungen müssen vor Aktivierung ergänzt werden.'}</p>
          </>
        ) : <p>Konten und Cloud-Synchronisierung sind in dieser veröffentlichten Konfiguration nicht aktiviert. Es werden daher keine Konto- oder Fortschrittsdaten an Supabase übertragen.</p>}
      </Section>
      <Section title="7. Kontakt, Vorschläge und Fehlermeldungen">
        <p>Kontakt öffnet Ihr lokales E-Mail-Programm. Vorschläge und Fehlermeldungen öffnen nach einem weiteren bewussten Klick ein vorausgefülltes GitHub-Formular. Die eingegebenen Formulardaten werden vorher nicht an GitHub übertragen. GitHub kann Inhalte eines dort abgesendeten Issues öffentlich anzeigen; tragen Sie dort keine vertraulichen oder personenbezogenen Daten ein.</p>
      </Section>
      <Section title="8. Externe Links">
        <p>Quellenangaben können unter anderem zu Wikimedia Commons, Wikidata, Wikipedia und GitHub führen. Erst beim Anklicken stellt Ihr Browser eine Verbindung zum jeweiligen Anbieter her. Durch die Referrer-Richtlinie der App wird dabei keine Adresse der zuvor besuchten Unterseite mitgesendet.</p>
      </Section>
      <Section title="9. Ihre Rechte">
        <p>Soweit personenbezogene Daten verarbeitet werden, bestehen insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch nach Art. 15 bis 21 DSGVO. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.</p>
        <p><a className={external} href="https://www.bfdi.bund.de/DE/Service/Anschriften/anschriften_table.html" target="_blank" rel="noreferrer">Anschriften der deutschen Datenschutz-Aufsichtsbehörden</a></p>
      </Section>
      <p className="text-xs text-ink-2">Stand: 22. September 2026</p>
    </>
  )
}

function Terms() {
  return (
    <>
      <Section title="Kostenlose Nutzung"><p>{BRAND_NAME} ist ein kostenloses Lern- und Quizangebot. Es gibt keine Käufe, Werbung, Ranglisten oder käuflichen Spielvorteile.</p></Section>
      <Section title="Inhalte und Lizenzen"><p>Flaggen, Fotos, Karten und Geodaten unterliegen den jeweils in der Quellenübersicht angegebenen Lizenzen. Der Anwendungscode steht unter der im Repository genannten Lizenz.</p></Section>
      <Section title="Fairer Umgang"><p>Automatisierte Angriffe, missbräuchliche Belastung von Diensten und Versuche, technische Schutzmaßnahmen zu umgehen, sind nicht gestattet.</p></Section>
    </>
  )
}

export default function LegalPage({ page }: { page: 'imprint' | 'privacy' | 'terms' }) {
  const { t } = useTranslation()
  const title = page === 'imprint' ? t('legal.imprint') : page === 'privacy' ? t('legal.privacy') : t('legal.terms')
  useDocumentTitle(title)
  return (
    <Page title={title} back="/settings">
      {!legalDetailsComplete && <p role="alert" className="mb-4 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm">⚠ {t('legal.draft')}</p>}
      <Card className="grid gap-5 p-5 md:p-7">
        {page === 'imprint' ? <Imprint /> : page === 'privacy' ? <Privacy /> : <Terms />}
      </Card>
    </Page>
  )
}
