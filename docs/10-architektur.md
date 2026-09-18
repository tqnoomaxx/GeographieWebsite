# 10 – Technische Architektur

## Stack (Phase 1)

```
React · TypeScript · Vite · Tailwind CSS
Hosting: GitHub Pages (statisch)
Daten: lokale, optimierte JSON-Dateien (lazy geladen)
Speicher: IndexedDB (Fortschritt), LocalStorage (Einstellungen)
```

Die erste Version läuft **ohne Backend vollständig**. Gastmodus und lokale Speicherung sind komplett; Account-Funktionen sind architektonisch vorbereitet und werden in Phase 2 mit Supabase verbunden. **Kein simuliertes Backend auf GitHub Pages.**

Quelle: TASK.md Einleitung, §34

## Ordnerstruktur

```
/
├── public/media/           Flaggen-SVGs, Bilder (optimiert)
├── data/                   siehe 04-datenmodell.md
├── scripts/                siehe 05-datenpipeline.md
├── locales/de/ en/         Übersetzungen
├── src/
│   ├── app/                Routing, Layout, Providers
│   ├── features/           play, learn, explore, progress, profile, search, admin
│   ├── engine/             Question, Generators, Registry, Difficulty, SpacedRepetition, Session
│   ├── domain/             Entity, Relationship, Category-Typen
│   ├── services/           auth, progress, quiz, profile, achievements, quests, favorites, data, sync
│   │   └── adapters/       local/ (IndexedDB), supabase/ (Phase 2)
│   ├── config/             xp.ts, levels.ts, achievements.ts, quests.ts, categories.ts, env.ts
│   ├── ui/                 Design-System-Komponenten, Tokens
│   └── i18n/
└── .github/workflows/      build, validate-data, deploy
```

Quelle: TASK.md §35, §79–§82

## Service-Layer und Datenzugriff

Die UI greift **nie direkt** auf LocalStorage, IndexedDB oder Supabase zu, sondern ausschließlich auf Services mit stabilen Interfaces. Pro Service existiert ein lokaler Adapter (Phase 1) und später ein Supabase-Adapter (Phase 2). Der Wechsel

```
LocalStorage/IndexedDB  →  Supabase
```

ist ein Konfigurationswechsel, kein Rewrite.

```ts
interface ProgressRepository {
  getEntityProgress(id: string): Promise<EntityProgress | undefined>;
  recordSession(session: QuizSession): Promise<void>;
  getStats(): Promise<Stats>;
  exportAll(): Promise<ProgressSnapshot>;      // für Datenexport und Gast → Account
  importAll(snapshot: ProgressSnapshot, strategy: "merge" | "replace"): Promise<void>;
}
```

Quelle: TASK.md §35, §54, §55

## Datenladen und Performance

MUSS:
- Lazy Loading und Code Splitting pro Feature und Kategorie. Das Flaggenquiz lädt keine Berge, Städte oder Sehenswürdigkeiten.
- `data/index.json` als kleiner Einstiegspunkt; Detaildaten per Kategorie/Region nachladen.
- Komprimierte Assets (Brotli/Gzip über Hosting), optimierte Bilder (WebP/AVIF, Größenvarianten), SVG-Flaggen minifiziert.
- Caching über Service Worker und HTTP-Header; Invalidierung über `data/version.json`.
- Virtualisierte Listen bei großen Datenmengen (Atlas, Suche).
- Keine unnötigen Re-Renders (Memoisierung, Selektoren).
- CDN für geeignete Assets, sobald eine eigene Domain existiert.

Quelle: TASK.md §46, §57

## Offline

Die App funktioniert so weit wie sinnvoll offline (PWA: Manifest + Service Worker):

```
Offline verfügbar: ✓ geladene Flaggen ✓ geladene Länder ✓ Quizfragen ✓ lokaler Fortschritt
Nicht verfügbar:   ✕ Account-Sync ✕ neue Daten ✕ E-Mail-Versand
```

Nach Wiederherstellung der Verbindung synchronisiert die App automatisch; Konflikte werden sicher behandelt (siehe [11-account-backend.md](11-account-backend.md)).

Quelle: TASK.md §56

## Internationalisierung

Startsprache Deutsch. Alle UI-Texte laufen über das Übersetzungssystem (`t("quiz.start")`), keine hart kodierten Strings. Entity-Namen sind mehrsprachig im Datenmodell. Vorbereitet: 🇬🇧 English, 🇫🇷 Français, 🇪🇸 Español.

```
/locales
├── de/
├── en/
└── …
```

Quelle: TASK.md §49, §62

## Konfiguration, Base URL, Domain

- Keine URLs hart codieren. `BASE_URL`, `SUPABASE_URL`, Auth-Redirects und Admin-Mail kommen aus Environment Variables (`import.meta.env`).
- Phase 1: `https://<user>.github.io/<repo>/` (Vite `base` entsprechend setzen). Phase 2: eigene Domain (z. B. `geoquiz.de`) über `CNAME`.
- Beim Domain-Wechsel ändern sich nur DNS, Hosting-Konfiguration, Environment Variables und Auth-Redirects.

Quelle: TASK.md §36, §38

## Deployment

```
git push → GitHub Actions → validate-data → build → deploy GitHub Pages
```

Build vollautomatisch, keine manuelle Dateikopiererei. Datenvalidierung bricht den Build bei Fehlern ab.

Quelle: TASK.md §37

## Entwicklungsregel

Bei jeder Implementierung prüfen: „Funktioniert das noch mit zehn weiteren Kategorien und hunderttausenden Datensätzen?“ Generische Bausteine statt Kategorie-Sonderfälle. Details in [01-vision.md](01-vision.md) und [06-quiz-engine.md](06-quiz-engine.md).

Quelle: TASK.md §101
