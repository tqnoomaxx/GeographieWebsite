# Supabase (Phase 2)

Vorbereitete Backend-Schicht. Wird erst mit eigener Domain produktiv (Roadmap Phase F).

- `migrations/0001_schema.sql` – Nutzertabellen, öffentliche Profil-View, Trigger
- `migrations/0002_rls.sql` – Row Level Security: Stats, Fortschritt, Achievements und Quests sind für den Client **nur lesbar**; geschrieben wird ausschließlich über Edge Functions
- `functions/submit-session` – Session einreichen, Plausibilität prüfen (Antwortzeiten, Duplikate), XP/SRS/Achievements serverseitig berechnen
- `functions/delete-account` – echte Account-Löschung inkl. Kaskade und Session-Invalidierung
- `functions/feedback` – Vorschläge/Kontakt/Reports mit Validierung, Rate Limiting, Honeypot, Mailversand (Secrets nur serverseitig)

Katalogtabellen `achievements` und `quests` werden per `npm run supabase:seed` aus `src/config/*.ts` befüllt (Skript folgt mit Phase F).

Frontend-Anbindung: `src/services/progress/supabaseRepository.ts` implementiert dasselbe `ProgressRepository`-Interface wie der lokale IndexedDB-Adapter; Auswahl über `VITE_SUPABASE_URL`.
