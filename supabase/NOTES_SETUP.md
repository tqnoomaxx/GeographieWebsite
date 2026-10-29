# Lernnotizen ohne Account einrichten

Die Oberfläche, Datenbank-Migration und Edge Function sind vorbereitet. Ohne die folgende Verbindung zeigt der Notizknopf einen Hinweis; es wird keine Online-Speicherung vorgetäuscht.

Die Notizen benötigen keine Registrierung, keine E-Mail und keine anonymen Supabase-Auth-Konten. Ein zufällig erzeugter persönlicher Link öffnet dasselbe Notizbuch auf mehreren Geräten. Die Datenbank speichert den Hash des Zugangsschlüssels. Notiztexte und die Quizbezeichnung liegen im Notizbuch; im Browser wird nur der persönliche Zugang gemerkt.

## 1. Projekt verbinden

Ein Supabase-Projekt anlegen und mit der Supabase-CLI verbinden. Die allgemeine Vorbereitung ist in [SETUP.md](SETUP.md) beschrieben. Danach im Projektverzeichnis:

```sh
supabase login
supabase link --project-ref DEINE_PROJEKT_ID
supabase db push
```

Alle Migrationen werden benötigt: `0004_account_security.sql` stellt die Ratenbegrenzung bereit, `0005_quiz_notes.sql` die privaten Notiztabellen und die nur serverseitig aufrufbare Datenbankfunktion. Die späteren Migrationen sichern die öffentliche Profilansicht ab und bilden Bearbeitungskonflikte als HTTP 409 ab. Das Projekt muss keine anonymen Auth-Anmeldungen aktivieren.

## 2. Notizserver aktivieren

Einen zufälligen Wert für `RATE_LIMIT_SALT` setzen und die erlaubten Website-Ursprünge angeben. Bei einer GitHub-Pages-Projektseite ist der Ursprung `https://DEINNAME.github.io`, ohne Repository-Pfad. Mehrere Ursprünge kommasepariert angeben. Für lokale Tests zusätzlich `http://127.0.0.1:5173` und `http://localhost:5173` aufnehmen. Vorhandene Werte für andere Edge Functions beibehalten beziehungsweise ergänzen.

```sh
supabase secrets set ALLOWED_ORIGINS=https://DEINNAME.github.io RATE_LIMIT_SALT=EIN_LANGER_ZUFAELLIGER_WERT
supabase functions deploy quiz-notes
```

Die Konfiguration `verify_jwt = false` steht bereits in `config.toml`, weil der persönliche Notizlink den Zugriff autorisiert. Die Function verwendet intern den automatisch von Supabase bereitgestellten Service-Key; dieser gehört niemals in die Website oder eine `VITE_`-Variable.

## 3. Website verbinden

Lokal `.env.local` mit den öffentlichen Client-Werten anlegen:

```dotenv
VITE_SUPABASE_URL=https://DEINE_PROJEKT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=DEIN_OEFFENTLICHER_ANON_ODER_PUBLISHABLE_KEY
```

Den Entwicklungsserver anschließend neu starten. Für die veröffentlichte Seite dieselben zwei Werte unter **GitHub → Repository → Settings → Secrets and variables → Actions → Variables** setzen. Der vorhandene Build-Workflow übernimmt sie. Projektregion und Anbieterangaben werden wie in [SETUP.md](SETUP.md) dokumentiert; der vorhandene Release-Check prüft diese Konfiguration.

## 4. Auf zwei Geräten ausprobieren

1. In einem Quiz auf **Notizen** klicken, einen Text eingeben und **Notiz speichern** wählen.
2. **Auf einem anderen Gerät öffnen** aufklappen und den persönlichen Link kopieren.
3. Den Link auf einem zweiten Gerät öffnen. Dort muss dieselbe Notiz erscheinen, ohne Login.
4. Eine Notiz ändern oder löschen. Das andere geöffnete Notizbuch aktualisiert sich beim Fokussieren, spätestens beim regelmäßigen Abgleich nach 15 Sekunden; **Notizen aktualisieren** gleicht sofort ab.

**Dieses Gerät trennen** entfernt nur den lokalen Zugang. **Notizbuch löschen** entfernt nach Bestätigung alle Notizen auf allen Geräten. Ohne persönlichen Link gibt es keine Wiederherstellung über E-Mail. Wer den Link besitzt, kann lesen, bearbeiten und löschen.

## Enthaltene Prüfungen

- `npm test` prüft Zugangsschlüssel, Link-Format, Projektpfade und Datenantworten.
- `supabase/tests/quiz_notes.sql` prüft echte SQL-Schreibvorgänge, Zugriffsgrenzen, Konflikte, Wiederholungen, Löschung und das Limit von 200 Notizen. In einer isolierten Testdatenbank mit den Rollen `anon`, `authenticated` und `service_role` nach allen Migrationen ausführen, beispielsweise mit `psql -v ON_ERROR_STOP=1 -f supabase/tests/quiz_notes.sql`.
- `npx deno check supabase/functions/quiz-notes/index.ts` prüft die Edge Function.
- `e2e/notes.spec.ts` prüft den Knopf in den Quiztypen, zwei getrennte Browser-Kontexte, Bearbeiten, Löschen, Netzwerkfehler und Konflikte. Die Cloud-Fälle verwenden simulierte Serverantworten und laufen in einem mit Supabase-Clientwerten gebauten Testfrontend; sie werden im rein statischen Build ausdrücklich übersprungen.

Aktuelle API-Grundlagen: [Supabase Edge Functions](https://supabase.com/docs/guides/functions), [Datenbankfunktionen und Berechtigungen](https://supabase.com/docs/guides/database/functions).
