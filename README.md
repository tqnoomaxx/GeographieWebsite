# ✦ Atlasfunke

Die Welt im Kopf. Den Funken im Blick. Eine interaktive Geografie-Plattform: Quiz, Lernen, Entdecken, Fortschritt und tägliche Rätsel (Flagle, Countryle, Umrissle, Hauptstädtle).

Spezifikation und Roadmap: [`docs/`](docs/README.md). Ursprünglicher Master-Prompt: [`TASK.md`](TASK.md).

## Bedienung

Quiz starten: **Thema → Übung → passende Antwortart und Gebiet → Quiz starten**. Antwortarten mit derselben Aufgabe sind zusammengefasst. Rundenlänge, Fehlerwiederholung und Flaggenhinweise werden unter **Lernoptionen** für die nächsten Quizze gespeichert. Alle-Runden und teilweise gelöste Länderprofile lassen sich auf Start- und Quizseite fortsetzen.

**Länderprofil ausfüllen** bietet 15 frei kombinierbare Kategorien, darunter höchste Erhebung (einschließlich Außengebieten), Nachbarländer, Weltregion und Nationalsymbole. Die angezeigte Länderauswahl enthält nur Länder mit Angaben zu allen ausgewählten Kategorien. Ein gültiger Treffer deckt die vollständige Antwortliste des Feldes auf, etwa alle Hauptstädte oder Sprachen. Unter **Wiederholungslernen** werden beim Auflösen nur die ungelösten Felder nach einigen weiteren Ländern erneut abgefragt, bis sie selbst gelöst sind. Zehn, zwanzig, fünfzig oder alle passenden Länder sind wählbar. Alle-Runden speichern auch die Wiederholungsschlange und teilweise ausgefüllte Profile.

Im Kartenmodus von Gewässer- und Bergquizzen werden die gesuchten Objekte direkt ausgewählt: Flüsse als echte Flussläufe, Seen als Uferumrisse und Berge als Gipfelmarkierungen. Ländergrenzen dienen zur Orientierung. Länder- und Regionalflaggen behalten ihre jeweiligen Gebietsflächen als Klickziele. `npm run data:nature-maps` verknüpft die Natural-Earth-Geometrien (Public Domain) über Wikidata-IDs mit dem Bestand; Objekte ohne echte Geometrie werden im Kartenmodus nicht angeboten. Die normale Länderzuordnung bleibt über die Antwortart „Auswählen“ erreichbar.

Die interaktive Weltkugel steht direkt auf der Startseite. Unter **Story** (`/story`) reist du in **Der Atlas der Winde** mit der Kartografin Mira durch acht Level mit eigenen Landschaften: Küste, Wald, Hafen, Dschungel, Wüste, Schriftenkammer, Eispass und Sternenwarte. Vier bis acht Prüfungen pro Versuch stammen aus einem Pool von 64 Aufgaben. Die Schwierigkeit steigt von einfachen Auswahlfragen zu freien Eingaben, Karten, echten Flussläufen und Gipfeln sowie sortierbaren Routen. Drei Herzen, knapper werdende Hinweise und bis zu drei Sterne machen Wiederholungen sinnvoll; erst ein bestandenes Level öffnet das nächste. Sterne, laufende Versuche und Reihenfolgen bleiben auf diesem Gerät gespeichert. Abgeschlossene Kapitel aus dem alten Story-Modus werden mit je einem Stern übernommen. Die Reise funktioniert ohne WebGL; der frühere Link `/play?view=diorama` führt weiterhin zur Story.

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
| `npm run data:wikidata` | Höchste Punkte und Wikidata-IDs; überschreibt keine Einwohnerzahlen |
| `npm run data:population` | Versionierten UN-WPP-Auszug für Ländereinwohnerzahlen anwenden |
| `npm run data:city-recall` | Länderweise Städtedaten über 15.000 Einwohner für das Sammelspiel (`-- --refresh` lädt neu) |
| `npm run data:large-cities` | Alle GeoNames-Städte über 300.000 Einwohner ergänzen (ohne Stadtteile; `-- --refresh` lädt neu) |
| `npm run data:plates` | Kfz-Kennzeichen DE/AT/CH (Wikidata P395) |
| `npm run data:nature` | Flüsse, Seen, Berge (Wikidata, nach Bekanntheit) |
| `npm run data:scripts` | 322 Lernkarten für 7 Schriften und 63 Textproben für 21 Sprachen |
| `npm run data:languages` | Versionierten Sprach-Textbestand offline importieren (`-- --refresh` zum Neuabruf der festgehaltenen Quellrevision) |
| `npm run data:trivia` | 150 redaktionelle Wissensfragen aus Bestand und geprüfter Erweiterung erzeugen |
| `npm run data:validate` | Validierung, Index, Suchindex, Attribution; bricht bei Fehlern ab |
| `npm test` | Engine-Tests |
| `npm run e2e` | Playwright-Smoke-Tests gegen den Build |
| `npm run build` | Validierung + Typecheck + Build |

Unter **Quiz → Sprachen & Schriften** stehen „Sprachen erkennen“ (21 Sprachen mit 63 Textproben), „Schriften erkennen“ und sieben Lesekurse bereit: Kyrillisch, Griechisch, Georgisch/Mchedruli, Arabisch, Devanagari/Hindi, Bengalisch und Tamil. Alle Kurse unterstützen Auswählen und Eintippen; „Schriftzeichen wiederfinden“ fragt die umgekehrte Richtung ab. Nach der Antwort erscheinen Übersetzung beziehungsweise Umschrift, Lerntipps und Quellen. Die Sprachproben stammen aus denselben drei Artikeln der UN-Menschenrechtserklärung, in einer festgehaltenen Revision von [UDHR in XML](https://github.com/eric-muller/udhr). Sprach- und Schriftquizze verraten vor der Antwort weder Sprache noch Schrift auf der Textkarte. Arabische Texte erhalten RTL-Ausrichtung; lokal bereitgestellte Noto-Fonts sorgen auch bei indischen Zeichen für lesbare Darstellung. Quelle und OFL-Lizenzen liegen unter `public/fonts/scripts/`. Der Sprachenmodus teilt die bestehenden Lernoptionen, Fehlerwiederholungen und gespeicherten Alle-Runden.

Der **Trivia-Modus** bietet 150 Wissensfragen: je 21 zu Europa, Asien, Afrika, Nordamerika, Südamerika und Ozeanien sowie 24 allgemeine Fragen über Erde, Wetter und Karten. Jede Frage besitzt vier Antwortmöglichkeiten, eine Erklärung und einen Primärquellenlink, etwa zu UNESCO, NASA, NOAA, USGS oder Parks Canada. Die 90 zusätzlichen Fragen wurden am 29. Oktober 2026 geprüft. `npm run data:trivia` verbindet die unveränderten 60 Ausgangsfragen aus `scripts/data/trivia-base.json` mit `scripts/content/trivia-expansion.mjs`; dieser Schritt ist auch in `data:all` enthalten. Die bisherigen IDs bleiben erhalten, damit Lernfortschritte und gespeicherte Runden weiterhin zugeordnet werden können.

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
- Ländereinwohnerzahlen: [UN World Population Prospects 2024](https://population.un.org/wpp/) (CC BY 3.0 IGO), mittlere Projektion zum 1. Juli 2026 einschließlich Togo-Korrektur vom 19. Januar 2026. Alle 197 souveränen Quizländer verwenden denselben Bezugszeitpunkt; Indien steht vor China. Der Rohimport wendet den versionierten Auszug ebenfalls an. Zum Aktualisieren: `python3 scripts/update-country-population.py --year 2026`, danach `npm run data:population` und `npm run data:validate`. Die Ausgangsdateien werden gecacht; für einen erneuten Download deren `WPP2024_*`-Dateien aus `scripts/.cache` löschen. Der Auszug dokumentiert Download-URLs und SHA-256-Prüfsummen. Kleinere abhängige Gebiete ohne eigenen UN-Datensatz können ältere, gesondert belegte Zahlen behalten.
- Großstädte über 300.000 Einwohner: [GeoNames](https://download.geonames.org/export/dump/) (CC BY 4.0); ohne Limit je Land, Einwohnerzahlen nach dortiger Gebietsabgrenzung und Datenstand
- Geometrien: [Natural Earth](https://www.naturalearthdata.com/) (Public Domain), [geoBoundaries](https://www.geoboundaries.org/) (CC BY 4.0)

Code: MIT (siehe `LICENSE`).

### Städte auf der Karte sammeln

Unter **Spielen → Städte → Städte auf der Karte sammeln** ein Land und eine beliebige ganze Einwohnergrenze ab 15.000 wählen (z. B. 50.000 oder 175.001). Es zählen erfasste Orte mit **mehr als** dieser Zahl. Passende Namen und Aliasse werden automatisch angenommen; nur gefundene Städte erscheinen als Punkte. Gleichnamige Orte werden gemeinsam markiert. Auflösen zeigt die fehlenden Städte und beendet die Eingabe. Die Runde wird mit Grenzwert, Treffern und Ortsdaten zum Fortsetzen gespeichert.

Die bearbeiteten [GeoNames-cities15000-Daten](https://download.geonames.org/export/dump/readme.txt) stehen unter [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Stadtteile, historische und aufgegebene Orte sind ausgeschlossen. Einwohnerzahlen folgen den unterschiedlichen Erhebungsständen und Ortsabgrenzungen der Quelle. `public/data/city-recall/index.json` enthält Quelle, Datenuntergrenze und Datum des heruntergeladenen Auszugs; die Länderdateien werden einzeln bei Spielstart geladen. Andere Quizze verwenden weiterhin den bisherigen Städtebestand. Der Datenvalidator prüft die Ortsdaten und bezieht sie in die Cache-Version ein.
