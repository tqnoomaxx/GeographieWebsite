# GeoQuiz – Spezifikation

Diese Dokumentation ist die strukturierte Fassung von `../TASK.md`. Der ursprüngliche Master-Prompt bleibt unverändert erhalten; jede Anforderung hier verweist mit `Quelle: TASK.md §n` auf ihren Ursprung, damit nichts verloren geht und Änderungen nachvollziehbar bleiben.

## Lesereihenfolge

| Nr. | Datei | Inhalt |
|---|---|---|
| 01 | [Vision](01-vision.md) | Produktziel, Grundprinzipien, Prioritäten, Nicht-Ziele |
| 02 | [Ausgangslage](02-ausgangslage.md) | Analyse der bestehenden Website `ugbzspiele`, was übernommen wird |
| 03 | [Inhalte & Kategorien](03-inhalte-kategorien.md) | Alle geografischen Inhaltskategorien und ihre Spielarten |
| 04 | [Datenmodell](04-datenmodell.md) | Entity/Relationship-Modell, Felder, Medien, Provenienz |
| 05 | [Datenpipeline](05-datenpipeline.md) | Quellen, Import, Normalisierung, Validierung |
| 06 | [Quiz-Engine](06-quiz-engine.md) | Fragen-Schema, Generatoren, Fragetypen, Session, Adaptivität |
| 07 | [Gamification](07-gamification.md) | XP, Level, Achievements, Quests, Streaks, Statistiken, Favoriten |
| 08 | [UX & Design](08-ux-design.md) | Designrichtung, Farbsystem, Responsive, Screens, States, Accessibility |
| 09 | [Seiten & Navigation](09-seiten-navigation.md) | Bereiche, Routen, Detailseiten, Suche, Lernmodus, rechtliche Seiten |
| 10 | [Architektur](10-architektur.md) | Stack, Ordnerstruktur, Service-Layer, Performance, i18n, Offline, Deployment |
| 11 | [Account & Backend](11-account-backend.md) | Phase 2: Supabase, Migration Gast → Account, Profil, DB-Schema, RLS |
| 12 | [Sicherheit & Datenschutz](12-sicherheit-datenschutz.md) | Zusammengeführte Sicherheits- und Datenschutzanforderungen, Formulare |
| 13 | [Admin](13-admin.md) | Admin-Bereich, Quiz-Vorschläge, Fehlerreports, Datenqualität |
| 14 | [Roadmap](14-roadmap.md) | Phasen A–F mit Definition of Done und Abhängigkeiten |
| 15 | [Vorschläge](15-vorschlaege.md) | Ergänzungen, die über TASK.md hinausgehen, und offene Entscheidungen |

## Konventionen

- **MUSS** – verbindliche Anforderung, ohne die das Produkt nicht abgenommen wird.
- **SOLL** – erwartete Anforderung, Abweichung nur mit Begründung.
- **KANN** – optionale Anforderung oder Idee für später.
- `Quelle: TASK.md §n` – Verweis auf den Abschnitt im ursprünglichen Prompt. Mehrere Abschnitte bedeuten, dass hier Dubletten zusammengeführt wurden.
- Beispiele aus TASK.md stehen unverändert in Codeblöcken.

## Glossar

| Begriff | Bedeutung |
|---|---|
| **Entity** | Ein geografisches Objekt mit stabiler ID: Land, Region, Stadt, Fluss, Berg, Sehenswürdigkeit, Kennzeichen … |
| **Relationship** | Gerichtete, typisierte Beziehung zwischen zwei Entities, z. B. `capital_of`, `located_in`, `flows_through`. |
| **Category** | Fachliche Inhaltsgruppe für die UI (Flaggen, Städte, Gewässer …). Eine Kategorie bündelt Entity-Typen und Generatoren. |
| **QuestionType** | Fragetechnik: Multiple Choice, Eintippen, Karte anklicken, Zuordnen, Reihenfolge, Wahr/Falsch, Bild erkennen, Flashcard. |
| **QuestionGenerator** | Erzeugt aus Entities und Relationships konkrete Fragen eines Typs (z. B. `flag_to_country`). |
| **QuizSession** | Eine gespielte Runde mit Fragen, Antworten, Score und XP. |
| **Progress** | Lernstand pro Entity (`new`, `learning`, `familiar`, `mastered`) plus Statistiken. |
| **Gast** | Nutzer ohne Account; Fortschritt liegt lokal im Browser. |
| **Tägliches Rätsel** | Wordle-artiger Modus (Flagle, Countryle …) mit einem festen Rätsel pro Tag, Seed aus dem Datum. |
| **Rundenlänge** | 10 / 20 / 50 / Alle; „Alle“ spielt jede Entity einer Kategorie einmal und ist fortsetzbar. |
| **Phase 1 / Phase 2** | Phase 1 = statische App auf GitHub Pages ohne Backend. Phase 2 = eigene Domain, Supabase-Backend, Accounts. |
