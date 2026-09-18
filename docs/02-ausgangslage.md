# 02 – Ausgangslage: die bestehende Website

## Bestand

Die bestehende Website läuft unter https://tqnoomaxx.github.io/ugbzspiele/flaggen und ist Teil des Repositories https://github.com/tqnoomaxx/ugbzspiele. Sie ist die **inhaltliche Ausgangsbasis**, nicht die technische.

Quelle: TASK.md §2, §106

## Analyse (Stand 18.09.2026)

Erkenntnisse aus Website und Repository, die vor der Entwicklung verifiziert werden müssen (Repository klonen, Ordner prüfen):

**Technik**
- Next.js-Projekt (`next.config.mjs`), JavaScript/TypeScript
- Ordner: `.github/workflows`, `app`, `design`, `docs`, `e2e`, `public`, `scripts`, `src`, `supabase/migrations`
- Tests: Vitest (`vitest.config.js`), Playwright (`playwright.config.js`)
- Bereits vorhandene Dokumentation zu Architektur, Sicherheit, Deployment, Benutzer- und Adminhandbuch
- Es gibt bereits Supabase-Migrationen, d. h. Vorarbeit zu einem Datenbankschema existiert

**Daten und Assets**
- 254 Länder und Gebiete
- ca. 1.071 Flaggen als SVG (davon ca. 743 regionale Flaggen), Pfad `public/assets/flags/countries/<ISO>.svg` bzw. `/ugbzspiele/assets/flags/`
- 16 europäische Länder mit regionalen Untergliederungen (z. B. 16 deutsche Bundesländer, 47 japanische Präfekturen)
- 38 lokale Stadtbilder, 34 Sehenswürdigkeiten/UNESCO-Welterbestätten unter `/ugbzspiele/assets/geography/`
- `ATTRIBUTION.md` mit Quellennachweisen

**Quizlogik**
- Modi: Flaggen, Hauptstädte/Städte, regionale Hauptstädte, Sehenswürdigkeiten/UNESCO, „Hypermodus“ (Mix)
- Fragetypen: Flagge → Name (Multiple Choice), Flagge → Eingabe, Name → Flagge, Flagge → Karte (Locator-Karten)
- Adaptives Fehlertraining, Rundenlängen 10/20/50, Tastatursteuerung, lokaler Lernfortschritt, durchsuchbarer Flaggenatlas
- Navigation: Sammlung → Fragetyp → Lernmodus → Rundenlänge → Start (genau die Konfigurationstiefe, die das neue Produkt vermeiden soll)

**Nicht-Geo-Inhalte**
- Weitere Spiele im selben Repo: Imposter, Kniffel, Schiffe versenken, Werwolf, Memory. Diese gehören nicht zu GeoQuiz.

## Vorgehen vor der Entwicklung

MUSS, in dieser Reihenfolge:

1. Repository klonen und Bestand feststellen: Was existiert? Was funktioniert? Welche Daten, Assets, Quizlogik?
2. Datenformate der Länder-/Flaggen-/Regionsdaten dokumentieren (Felder, IDs, Sprache).
3. `ATTRIBUTION.md` und Lizenzen der Assets prüfen; nur klar lizenzierte Assets übernehmen.
4. Entscheiden, welche Teile übernommen und welche ersetzt werden (Tabelle unten pflegen).
5. Erst danach die neue Architektur darauf aufbauen.

Quelle: TASK.md §2, §106

## Übernehmen vs. ersetzen

| Bestandteil | Entscheidung | Begründung |
|---|---|---|
| Länder- und Gebietsdaten (254) | **übernehmen**, in neues Datenmodell konvertieren | Grundlage für Phase A |
| Flaggen-SVGs (ca. 1.071) inkl. Regionen | **übernehmen** mit Attribution | Größter Content-Block, sofort nutzbar |
| Stadtbilder, Sehenswürdigkeiten (38 + 34) | **übernehmen**, Lizenz prüfen | Startbestand für Bilderquiz |
| `ATTRIBUTION.md` | **übernehmen**, in Media-Metadaten überführen | Lizenzpflicht |
| Locator-Karten | **prüfen** | Ggf. als Basis für Kartenfragen in Phase C |
| Adaptives Fehlertraining (Logik) | **konzeptionell übernehmen**, Code neu | Passt zu Spaced Repetition |
| Next.js-Code, UI, Navigationstiefe | **ersetzen** | Neuer Stack (Vite), neues Design |
| Supabase-Migrationen | **als Referenz lesen**, neu entwerfen | Schema wird für Entity-Modell neu gebaut |
| Nicht-Geo-Spiele | **nicht übernehmen** | Bleiben im alten Repo |

## Empfehlung Repository

Neues, eigenes Repository für GeoQuiz anlegen (siehe [15-vorschlaege.md](15-vorschlaege.md), Vorschlag 11). Die alte Website bleibt erreichbar, bis die neue Version die Inhalte vollständig abdeckt.
