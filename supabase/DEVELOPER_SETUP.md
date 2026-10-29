# Quiz-Verbesserungen

Die Lernnotizen bleiben unverändert. Das neue Panel unter `/developer` ist eine gemeinsame, private Aufgabenliste für Entwickler. In jedem Quiz, Daily und Story-Fall erscheint bei berechtigten Konten **Verbessern**. Im Melden-Dialog gibt es zusätzlich **Verbesserungsvorschlag · Entwickler**. Besucher und normale Konten erhalten diese Werkzeuge nicht.

## Einrichtung

`20261029211700_quiz_improvements.sql` legt die geschützte Verbesserungsliste an und wird wie die übrigen Migrationen in der gewünschten Supabase-Umgebung angewendet. Die bestehenden öffentlichen Frontend-Variablen genügen. Es gibt keine neuen Schlüssel oder Secrets. Rollenfreigaben erfolgen direkt in der Datenbank; echte Nutzerkennungen und Konto-E-Mails gehören weder in Migrationen noch ins Repository.

Entwicklerrechte entsprechen der bereits bestehenden, ausschließlich serverseitig gepflegten Tabelle `public.admin_users`. Es gibt keine Selbstfreischaltung und keine E-Mail- oder LocalStorage-Ausnahme. Ein privilegierter Betreiber kann eine zuvor geprüfte Auth-Nutzer-ID im SQL-Editor eintragen:

```sql
insert into public.admin_users (user_id)
values ('<geprüfte Auth-Nutzer-UUID>')
on conflict do nothing;
```

Entziehen:

```sql
delete from public.admin_users where user_id = '<geprüfte Auth-Nutzer-UUID>';
```

Danach die Seite neu laden. Datenbankzugriffe prüfen die aktuelle Rolle bei jeder Operation; ein noch sichtbarer Button verleiht keine Rechte. Aktivierte Zwei-Faktor-Anmeldung muss abgeschlossen sein. Änderungen und Löschungen verwenden `updated_at`, um zwischenzeitliche Änderungen anderer Entwickler nicht zu überschreiben.

Die private Tabelle speichert Titel, Beschreibung, Priorität, Bearbeitungsstatus und den Quizbezug (Route, erlaubte Konfigurationsparameter, Frage-ID, Generator, Bereich und Objekt-IDs). Zugangstoken, Notizbuchlinks und Antworten werden nicht angehängt. Alle berechtigten Entwickler können Einträge bearbeiten und löschen. Gelöschte Einträge sind endgültig entfernt; bei einer Kontolöschung bleibt die gemeinsame Aufgabe mit leerem Autor erhalten.

## Prüfen

`supabase/tests/quiz_improvements.sql` in einer lokalen Testdatenbank nach den Migrationen ausführen. Die Transaktion rollt alle Testdaten zurück. Sie prüft anonyme Besucher, normale Konten, Entwickler, MFA, Rechteentzug und Schreibgrenzen. Die Browser-Tests verwenden ausschließlich simulierte Supabase-Antworten und verändern keine Online-Daten.
