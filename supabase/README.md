# Supabase-Backend

Gehärtete Backend-Schicht für optionale Konten und geräteübergreifenden Fortschritt.

Quiz-Verbesserungen für freigeschaltete Entwickler: [Einrichtung und Rechte](DEVELOPER_SETUP.md).

- `migrations/0001_schema.sql` – Nutzertabellen, öffentliche Profil-View, Trigger
- `migrations/0002_rls.sql` – Row Level Security: Stats, Fortschritt, Achievements und Quests sind für den Client **nur lesbar**; geschrieben wird ausschließlich über Edge Functions
- `migrations/0003_security_hardening.sql` – öffentliche Schreibwege schließen und Profil-View absichern
- `migrations/20261029115335_isolate_public_profile_access.sql` – öffentliche Profile mit begrenzter Lese-Funktion und privaten RLS-Helfern
- `migrations/20261029120306_note_conflicts_return_http409.sql` – sofortige HTTP-409-Antwort bei konkurrierenden Notizänderungen
- `migrations/0005_quiz_notes.sql` – private, accountfreie Notizbücher mit zufälligem Link-Zugang und Versionsschutz
- `functions/quiz-notes` – geräteübergreifende Lernnotizen ohne Login, mit serverseitiger Ratenbegrenzung; [Einrichtung](NOTES_SETUP.md)
- `migrations/0004_account_security.sql` – MFA-erzwingende RLS-Regeln, minimale Privilegien, Eingabegrenzen und persistente Rate Limits
- `functions/submit-session` – Session einreichen, Plausibilität prüfen (Antwortzeiten, Duplikate), XP/SRS/Achievements serverseitig berechnen
- `functions/delete-account` – echte Account-Löschung inkl. Kaskade und Session-Invalidierung
- `functions/export-account` – vollständiger maschinenlesbarer Export aller Kontodaten
- `functions/feedback` – Vorschläge/Kontakt/Reports mit Validierung, Rate Limiting, Honeypot, Mailversand (Secrets nur serverseitig)

Katalogtabellen `achievements` und `quests` werden per `npm run supabase:seed` aus `src/config/*.ts` befüllt.

Frontend-Anbindung: `src/services/progress/supabaseRepository.ts` implementiert dasselbe `ProgressRepository`-Interface wie der lokale IndexedDB-Adapter; Auswahl über `VITE_SUPABASE_URL`.

Sitzungen werden zentral geprüft; Token-Erneuerungen und vorübergehende Auth-Ausfälle wechseln nicht zu Gastdaten. Konto-Caches verwenden getrennte IndexedDB-Datenbanken pro verifiziertem Nutzer. Der frühere gemeinsame Cache `geokompass-cache` bleibt unangetastet und wird mangels zuverlässiger Eigentümerkennung nicht automatisch übernommen. Online-Fortschritt bleibt auf dem Server erhalten.
