# 12 – Sicherheit und Datenschutz

Hier sind die in TASK.md mehrfach genannten Anforderungen zusammengeführt. Sicherheit und Datenschutz haben die höchste Priorität bei Zielkonflikten (siehe [01-vision.md](01-vision.md)).

## Datensparsamkeit

MUSS:
- nur notwendige Daten speichern
- private und öffentliche Profildaten trennen
- keine unnötigen personenbezogenen Logs
- Gastmodus ohne jegliche personenbezogene Daten

Die konkrete rechtliche DSGVO-Prüfung und die endgültigen Rechtstexte müssen vor einem produktiven Launch anhand des tatsächlichen Hostings und der verwendeten Dienste geprüft werden.

Quelle: TASK.md §26, §93

## Cookies und Tracking

Grundsätzlich kein Tracking, das nicht für die Funktion erforderlich ist. Nicht einbauen: Analytics-Dienste, Werbetracker, Social-Media-Tracker, Fingerprinting, unnötige Drittanbieter-Skripte.

Phase 1 kommt ohne Consent-Banner aus, weil keine einwilligungspflichtigen Dienste laufen (nur technisch notwendiger lokaler Speicher). Falls später Analysefunktionen gewünscht sind, vorher prüfen: verarbeitete Daten, Dienst, Personenbezug, Rechtsgrundlage, Einwilligungspflicht, Widerruf.

Quelle: TASK.md §27, §51

## Sicherheitsanforderungen

MUSS (Phase 2, soweit Backend vorhanden; Phase 1 wo anwendbar):

| Bereich | Anforderung |
|---|---|
| Transport | HTTPS überall |
| Auth | sichere Authentifizierung, sichere Sessions, E-Mail-Verifizierung, sichere Passwort-Reset-Prozesse, Session-Invalidierung nach Account-Löschung, keine Passwörter im Klartext |
| Autorisierung | Row Level Security, serverseitige Autorisierung; ein Nutzer darf niemals durch manipulierte Requests auf Daten eines anderen zugreifen |
| Eingaben | Validierung serverseitig, XSS-Schutz (React-Escaping, keine `dangerouslySetInnerHTML` mit Fremddaten), SQL-Injection-Schutz (parametrisierte Queries), CSRF-Schutz sofern relevant |
| Missbrauch | Rate Limiting, Spam-Schutz für alle Formulare |
| Secrets | niemals im Frontend; nur in Edge Functions / Server-Umgebung |
| Logs | keine sensiblen Informationen |
| Spielintegrität | XP/Achievements/Quests serverseitig berechnen (siehe [11-account-backend.md](11-account-backend.md)) |

Quelle: TASK.md §26, §52, §85, §99

## Datenschutzfunktionen

Konzeptionell implementieren: Datenschutzerklärung, Impressum, Nutzungsbedingungen, Cookie-/Consent-Einstellungen falls erforderlich, sowie im Konto: Daten exportieren, Profil öffentlich/privat, Account löschen (echte Löschung).

Für Gäste: „Lokale Daten löschen“ in den Einstellungen.

Quelle: TASK.md §27

## Formulare

Drei Formulare mit identischen Schutzregeln: serverseitige Validierung, Spam-Schutz, Rate Limiting, sichere E-Mail-Weiterleitung an eine definierte Admin-Adresse, keine Secrets im Client.

**Quiz vorschlagen**

```
Titel · Kategorie · Beschreibung · Mögliche Fragen · E-Mail (optional)
[ Vorschlag senden ]  →  ✓ Danke! Dein Vorschlag wurde gesendet.
```

**Kontakt**

```
Name · E-Mail · Betreff · Nachricht
[ Nachricht senden ]
```

**Frage melden**

```
⚠ Frage melden – Warum?
○ Antwort scheint falsch ○ Bild falsch zugeordnet ○ Tippfehler ○ Karte falsch ○ Sonstiges
[ Senden ]
```

**Phase 1 (kein Backend):** Kein E-Mail-Versand mit API-Schlüsseln im Frontend. Der Versand ist als Service vorbereitet; der lokale Adapter speichert Eingaben zwischen oder öffnet einen vorausgefüllten GitHub-Issue-Link (siehe Vorschlag 16). Phase 2 schließt eine Edge Function an.

Quelle: TASK.md §29, §88, §94
