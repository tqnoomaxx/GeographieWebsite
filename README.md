# ✦ Atlasfunke

Die Welt im Kopf. Den Funken im Blick. Eine interaktive Geografie-Plattform: Quiz, Lernen, Entdecken, Fortschritt und tägliche Rätsel (Flagle, Countryle, Umrissle, Hauptstädtle).

Spezifikation und Roadmap: [`docs/`](docs/README.md). Ursprünglicher Master-Prompt: [`TASK.md`](TASK.md).

## Bedienung

Quiz starten: **Thema → Übung → passende Antwortart und Gebiet → Quiz starten**. Antwortarten mit derselben Aufgabe sind zusammengefasst. Rundenlänge, Fehlerwiederholung und Flaggenhinweise werden unter **Lernoptionen** für die nächsten Quizze gespeichert. Alle-Runden und teilweise gelöste Länderprofile lassen sich auf Start- und Quizseite fortsetzen.

Die interaktive Weltkugel steht direkt auf der Startseite. Unter **Story** (`/story`) wird das bisherige Diorama zur Expeditionsinsel: In **Der Atlas der Winde** reist du mit der Kartografin Mira durch acht zusammenhängende Kapitel. Je drei geografische Aufgaben bringen die Geschichte voran; Hinweise und erneute Versuche helfen ohne Zeitdruck. Fundstücke landen im Reisetagebuch und öffnen das nächste Kapitel. Spielstand und laufende Aufgaben werden auf diesem Gerät gespeichert. Die Reise bleibt auch ohne WebGL spielbar; der frühere Link `/play?view=diorama` führt zum Story-Modus.

Die Kapitel und Dialoge liegen in `src/features/story/chapters.ts`, die validierte Fortschrittslogik in `storyProgress.ts`. Neue Kapitel bekommen eine stabile ID, eine Inselstation, drei Aufgaben und ein Fundstück. Der Story-Fortschritt ist unabhängig von Quizstatistiken. Das Reisetagebuch bietet einen ausdrücklich bestätigten Neustart.

Unter **Entdecken** filtert die Ländersuche die Kontinente direkt. Das gemeinsame Designsystem liegt in `src/styles/simple.css`; die Start- und Quizseite verwenden denselben `QuizCatalog`.

## Neue Quizübungen ergänzen

`src/config/quizCatalog.ts` enthält Themen und konkrete Übungen. Für eine neue Übung mit vorhandenen Generatoren genügt ein `EXERCISES`-Eintrag mit stabiler ID, Thema, Titel, Antwortvarianten, Gebietsregel und Datenpaketen. Menü, Suche, Auswahl, Runden-URL, Fortsetzen und Titel verwenden diesen Eintrag. Ein bestehendes Thema braucht dafür kein neues Diorama-Modell.

Neue Fragesorten benötigen einmalig einen Generator in `src/engine/generators` und die Registrierung in `registry.ts`. Das Länderprofil verwendet `profile_input`: neue Profilkategorien werden über Felddefinitionen mit Label, gültigen Antworten und Normalisierung ergänzt. Die Tests in `src/engine/catalog.test.ts` prüfen für alle Katalogeinträge Datenpakete und echte Fragen. `config/quizzes.ts` bleibt für alte Runden kompatibel und steuert nicht die neue Auswahl.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · react-router · i18next · idb (IndexedDB) · d3-geo · vite-plugin-pwa · Vitest · Playwright

Phase 1 läuft komplett statisch (GitHub Pages), ohne Backend. Fortschritt liegt lokal im Browser. Phase 2 (Supabase) ist über die Service-Schicht vorbereitet, siehe `supabase/`.

## Entwicklung

```bash
npm install
npm run data:all      # Daten importieren (Netzwerk nötig, gecacht in scripts/.cache)
npm run dev
```

Weitere Skripte:

| Skript | Zweck |
|---|---|
| `npm run data:countries` | Länderstammdaten (mledoze/countries) + Umrisse (Natural Earth) |
| `npm run data:legacy` | Flaggen, Regionen, Städte, Sehenswürdigkeiten aus dem Altbestand `ugbzspiele` |
| `npm run data:capitals` | Geprüfte aktuelle Hauptstädte, Mehrfachhauptstädte und Regierungssitze nach den Rohimporten anwenden |
| `npm run data:symbols` | Belegte Tiere, Vögel, Blumen, Bäume, Hymnentitel und amtliche Landesnamen ergänzen |
| `npm run data:landmarks` | Sehenswürdigkeiten und geprüfte, versionierte Fotomotive importieren |
| `npm run data:landmark-facts` | Standortangaben und Kurzfakten für Sehenswürdigkeiten ergänzen |
| `npm run data:wikidata` | Einwohnerzahlen, höchste Punkte (Wikidata) |
| `npm run data:city-recall` | Länderweise Städtedaten über 15.000 Einwohner für das Sammelspiel (`-- --refresh` lädt neu) |
| `npm run data:large-cities` | Alle GeoNames-Städte über 300.000 Einwohner ergänzen (ohne Stadtteile; `-- --refresh` lädt neu) |
| `npm run data:plates` | Kfz-Kennzeichen DE/AT/CH (Wikidata P395) |
| `npm run data:nature` | Flüsse, Seen, Berge (Wikidata, nach Bekanntheit) |
| `npm run data:validate` | Validierung, Index, Suchindex, Attribution; bricht bei Fehlern ab |
| `npm test` | Engine-Tests |
| `npm run e2e` | Playwright-Smoke-Tests gegen den Build |
| `npm run build` | Validierung + Typecheck + Build |

## Deployment

`git push` auf `main` → GitHub Actions → Release-Prüfung, Validierung, Tests, Build → GitHub Pages. Für die Projektseite wird `VITE_BASE_URL=/<repo>/` gesetzt; für eine eigene Domain `VITE_BASE_URL=/` und eine `CNAME`-Datei in `public/`.

Der Workflow baut einmal das Artefakt `release-build`. Die vollständigen Playwright-Projekte `mobile` und `desktop` prüfen diesen Build auf getrennten Runnern mit jeweils einem Browser-Worker. Browserinstallation und Tests haben getrennte Zeitbudgets; Testberichte und Traces liegen in `playwright-results-mobile` beziehungsweise `playwright-results-desktop`. Erst wenn beide Projekte erfolgreich sind, wird derselbe Build veröffentlicht. Neue Läufe brechen nur ältere Läufe desselben Branches beziehungsweise Pull Requests ab.

Vor dem ersten öffentlichen Deployment müssen in den GitHub-Actions-Variablen mindestens `VITE_LEGAL_NAME`, `VITE_LEGAL_ADDRESS` und `VITE_CONTACT_EMAIL` gesetzt werden. Die vollständige Liste steht in `.env.example`. Fehlen Pflichtangaben, blockiert `npm run release:check` das Deployment absichtlich.

Die App enthält eine CSP und Referrer-Regel direkt im HTML. `public/_headers` ergänzt auf unterstützten Hosts (z. B. Cloudflare Pages oder Netlify) HSTS, Clickjacking-, MIME- und Permissions-Schutz. GitHub Pages wertet diese Datei nicht aus; für die vollständige Header-Konfiguration ist daher ein Host mit benutzerdefinierten Response-Headern vorzuziehen.

Supabase bleibt standardmäßig deaktiviert. Vor der Aktivierung müssen Projektregion, Auftragsverarbeitung, Unterauftragsverarbeiter, Löschfristen und E-Mail-Versand anhand des realen Projekts geprüft und in den Release-Variablen dokumentiert werden.

Der Name „Atlasfunke“ hatte bei einer ersten exakten Web-/DPMA-/EUIPO-Suche am 22.09.2026 keine Treffer. Das ist nur eine Vorprüfung und keine rechtliche Markenfreigabe; vor Domainkauf oder größerer Vermarktung sollte eine professionelle Ähnlichkeitsrecherche in den relevanten Waren- und Dienstleistungsklassen erfolgen.

## Daten und Lizenzen

Alle Medien tragen Lizenz und Attribution in den Metadaten; der Build schlägt fehl, wenn ein Medium ohne Lizenz existiert. Übersicht in der App unter *Einstellungen → Quellen und Lizenzen* (`public/data/attribution.json`).

- Länderflaggen: [country-flag-icons](https://github.com/catamphetamine/country-flag-icons) (MIT)
- Regionalflaggen: [niemela/flags](https://github.com/niemela/flags) (Metadaten CC BY-SA 4.0, Flaggen je Ursprungslizenz)
- Fotos: Wikimedia Commons (je Bild angegeben)
- Länderdaten: [mledoze/countries](https://github.com/mledoze/countries) (ODbL 1.0), [Wikidata](https://www.wikidata.org) (CC0)
- Großstädte über 300.000 Einwohner: [GeoNames](https://download.geonames.org/export/dump/) (CC BY 4.0); ohne Limit je Land, Einwohnerzahlen nach dortiger Gebietsabgrenzung und Datenstand
- Geometrien: [Natural Earth](https://www.naturalearthdata.com/) (Public Domain), [geoBoundaries](https://www.geoboundaries.org/) (CC BY 4.0)

Code: MIT (siehe `LICENSE`).

### Städte auf der Karte sammeln

Unter **Spielen → Städte → Städte auf der Karte sammeln** ein Land und eine beliebige ganze Einwohnergrenze ab 15.000 wählen (z. B. 50.000 oder 175.001). Es zählen erfasste Orte mit **mehr als** dieser Zahl. Passende Namen und Aliasse werden automatisch angenommen; nur gefundene Städte erscheinen als Punkte. Gleichnamige Orte werden gemeinsam markiert. Auflösen zeigt die fehlenden Städte und beendet die Eingabe. Die Runde wird mit Grenzwert, Treffern und Ortsdaten zum Fortsetzen gespeichert.

Die bearbeiteten [GeoNames-cities15000-Daten](https://download.geonames.org/export/dump/readme.txt) stehen unter [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Stadtteile, historische und aufgegebene Orte sind ausgeschlossen. Einwohnerzahlen folgen den unterschiedlichen Erhebungsständen und Ortsabgrenzungen der Quelle. `public/data/city-recall/index.json` enthält Quelle, Datenuntergrenze und Datum des heruntergeladenen Auszugs; die Länderdateien werden einzeln bei Spielstart geladen. Andere Quizze verwenden weiterhin den bisherigen Städtebestand. Der Datenvalidator prüft die Ortsdaten und bezieht sie in die Cache-Version ein.
