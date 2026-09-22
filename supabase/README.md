# Supabase-Backend

Gehärtete Backend-Schicht für optionale Konten und geräteübergreifenden Fortschritt.

- `migrations/0001_schema.sql` – Nutzertabellen, öffentliche Profil-View, Trigger
- `migrations/0002_rls.sql` – Row Level Security: Stats, Fortschritt, Achievements und Quests sind für den Client **nur lesbar**; geschrieben wird ausschließlich über Edge Functions
- `migrations/0003_security_hardening.sql` – öffentliche Schreibwege schließen und Profil-View absichern
- `migrations/0004_account_security.sql` – MFA-erzwingende RLS-Regeln, minimale Privilegien, Eingabegrenzen und persistente Rate Limits
- `functions/submit-session` – Session einreichen, Plausibilität prüfen (Antwortzeiten, Duplikate), XP/SRS/Achievements serverseitig berechnen
- `functions/delete-account` – echte Account-Löschung inkl. Kaskade und Session-Invalidierung
- `functions/export-account` – vollständiger maschinenlesbarer Export aller Kontodaten
- `functions/feedback` – Vorschläge/Kontakt/Reports mit Validierung, Rate Limiting, Honeypot, Mailversand (Secrets nur serverseitig)

Katalogtabellen `achievements` und `quests` werden per `npm run supabase:seed` aus `src/config/*.ts` befüllt.

Frontend-Anbindung: `src/services/progress/supabaseRepository.ts` implementiert dasselbe `ProgressRepository`-Interface wie der lokale IndexedDB-Adapter; Auswahl über `VITE_SUPABASE_URL`.
