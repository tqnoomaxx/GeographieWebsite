# 14 – Roadmap

Die erste produktive Version enthält nicht jede Kategorie. Feature-Phasen (A–F) sind von der Content-Erweiterung getrennt zu denken: Daten können jederzeit dazukommen, sobald die Engine die Kategorie unterstützt.

Quelle: TASK.md §105

## Phase 0 – Vorbereitung

| Schritt | Definition of Done |
|---|---|
| Altseite analysieren | Tabelle „Übernehmen vs. ersetzen“ in [02-ausgangslage.md](02-ausgangslage.md) verifiziert |
| Repo, CI, Deployment | `git push` deployt eine leere App auf GitHub Pages |
| Datenmodell-Kern | `Entity`, `Relationship`, `Provenance`, `Media` als Typen + JSON-Schema + Validator |
| Legacy-Import | 254 Länder + Flaggen aus `ugbzspiele` als `/data` mit Attribution |

## Phase A – MVP (statisch, Gast)

Neues Design, Startseite, Navigation, Flaggen, Länder, Hauptstädte, Quiz-Engine (MC, Eintippen, Flashcard), Rundenlänge 10/20/50/Alle mit Fortsetzen, Gemischt (aus vorhandenen Kategorien), Tägliche Rätsel Flagle + Countryle, Lernen, XP, Level, lokaler Fortschritt, Dark Mode, i18n-Grundgerüst (de).

**DoD:** Ein Gast spielt auf dem Smartphone innerhalb von zwei Taps eine Flaggenrunde, sieht XP/Level, Fortschritt überlebt einen Reload.

## Phase B – Progression

Profil (lokal), Fortschritt „Meine Welt“, Achievements, Quests, Favoriten, Statistiken, Fehlerwiederholung, Spaced Repetition, Streaks, Hauptstädtle.

Account-Anbindung (Supabase, Migration Gast → Account) startet hier als Vorbereitung, geht aber erst mit eigener Domain produktiv.

**DoD:** Achievements und Quests werden aus Konfigurationsdateien geladen; Datenexport funktioniert.

## Phase C – Regionen und Karten

Regionen (Bundesländer, Kantone, Provinzen …), Städte, Kartenfragen (Karte anklicken), Umrissle, Regions- und Stadtseiten, Suche.

**DoD:** Kartenfrage funktioniert auf Touch und mit Tastatur; Regionsdaten für mindestens DE, AT, CH.

## Phase D – Natur und Bilder

Gewässer, Berge/Natur, Sehenswürdigkeiten, Bilderquiz, Bildle, Mehrfachantworten (Fluss → Länder), Lizenz-Gate im Build.

**DoD:** Jedes Bild hat Lizenz und Attribution; Attribution-Seite wird generiert.

## Phase E – Kennzeichen und Datenimport

Deutsche Kennzeichen (vollständig), Kennzeichle, internationale Kennzeichen, komplexere Beziehungen, Wikidata-/GeoNames-/Natural-Earth-Importer wiederholbar in CI.

**DoD:** Import zweimal ausführen erzeugt keinen Diff.

## Phase F – Betrieb

Eigene Domain, Supabase produktiv, Accounts, öffentliche Profile, Admin-Bereich, Datenqualitäts-Dashboard, Quizvorschläge, Kontakt, Fehlerreports (Edge Functions), Datenschutzfunktionen, Performance-Audit, Accessibility-Audit, weitere Sprachen.

**DoD:** Rechtstexte geprüft, RLS-Tests grün, Lighthouse ≥ 90 in allen Kategorien.

## Umsetzungsstand (18.09.2026)

| Phase | Stand | Hinweise |
|---|---|---|
| 0 | ✅ | Repo, Vite/React/Tailwind, Datenmodell, Validator mit Lizenz-Gate, Legacy-Import (254 Länder, 1.071 Flaggen, 78 Sehenswürdigkeiten), Natural Earth, mledoze, Wikidata |
| A | ✅ | Flaggen, Länder, Hauptstädte, Gemischt, Rundenlänge 10/20/50/Alle mit Fortsetzen, Lernen, XP/Level, Dark Mode, PWA, i18n (de), Flagle + Countryle |
| B | ✅ (lokal) | Profil, Meine Welt, Achievements, Quests, Favoriten, Statistiken, Fehlerwiederholung, SRS, Streaks, Hauptstädtle, Datenexport/-import. Account-Anbindung vorbereitet (`supabase/`, `SupabaseRepository`), nicht produktiv |
| C | ✅ | Regionen (817 in 50 Ländern), Städte (458), Kartenfragen (Welt via d3-geo, Regionen via Legacy-Geometrien), Umrissle, Regions-/Stadtseiten, Suche |
| D | ✅ | Sehenswürdigkeiten (78) und Bilderquiz aus dem Altbestand, Lizenz-Gate im Build, generierte Quellen-Seite. Gewässer: 220 Flüsse, 113 Seen; Natur: 201 Berge/Vulkane aus Wikidata (Auswahl nach Bekanntheit), Mehrländer-Zuordnung, Vergleichs- und Kartenfragen, Listen und Detailseiten. Bildle als Tagesrätsel |
| E | ✅ | 588 deutsche, 97 österreichische, 26 Schweizer Kennzeichen aus Wikidata (P395), drei Fragetypen, Bereichsfilter pro Land, Kennzeichle als Tagesrätsel |
| F | 🟡 vorbereitet | Supabase-Schema + RLS + Edge Functions (submit-session, delete-account, feedback) im Repo; Datenqualitäts-Dashboard unter `/admin` (lokal); GitHub-Pages-Deploy und monatliches Daten-Update als Actions. Offen: Domain, Supabase-Projekt anlegen, Auth-UI, Rechtstexte final |

## Abhängigkeiten

```
Phase 0 → A → B → C → D → E → F
                 ↘ Supabase-Vorbereitung (B) ────────────→ produktiv (F)
```

Content-Erweiterungen (neue Länderdaten, Bilder) laufen parallel ab Phase A.
