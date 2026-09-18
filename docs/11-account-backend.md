# 11 – Account und Backend (Phase 2)

## Gastmodus ist der Standard

Die komplette Kernanwendung funktioniert ohne Account. Ein Gast kann: Quiz spielen, Flaggen lernen, Länder erkunden, Karten verwenden, Städte entdecken, Sehenswürdigkeiten ansehen, Kennzeichen lernen, Bilderquiz spielen, Favoriten und Einstellungen lokal speichern.

Ein Account bietet zusätzlich: Cloud-Synchronisierung, geräteübergreifenden Fortschritt, Achievements, Quests, Profil, Statistiken.

**Der Nutzer wird nie gezwungen, sich vor dem ersten Spiel zu registrieren.** Der Hinweis auf den Account erscheint dezent nach einer Runde (siehe [08-ux-design.md](08-ux-design.md)).

Quelle: TASK.md §25, §53

## Lokaler Fortschritt ohne Account

Gespeichert werden lokal (IndexedDB bei größerer Datenmenge, LocalStorage für kleine Einstellungen): XP, Quizstatistiken, zuletzt gespielte Kategorien, Lernfortschritt pro Entity, Favoriten, schwierige Fragen, Theme, Sprache. Keine unnötigen personenbezogenen Daten.

Quelle: TASK.md §54

## Migration Gast → Account

```
Gast → lokaler Fortschritt → Account erstellen → Daten übernehmen → mit Server synchronisieren
```

MUSS: Vorhandener Fortschritt verschwindet nicht. Der Nutzer sieht das Ergebnis:

```
Dein bisheriger Fortschritt wurde übernommen.
+ 2.430 XP · + 14 Achievements · + 8 Lernfortschritte
```

Die Übernahme läuft über `ProgressRepository.exportAll()` → Server-Endpunkt, der den Snapshot validiert (siehe Integrität) und einspielt.

Quelle: TASK.md §55

## Backend: Supabase

Verwendung: PostgreSQL, Authentication, Row Level Security, Benutzerprofile, Fortschritt, Achievements, Quests, Statistiken, Favoriten, Cloud-Sync, ggf. Storage, Edge Functions (E-Mail, Account-Löschung, Validierung).

Quelle: TASK.md §35

## Datenbankschema

Nutzerdaten:

```
users (Supabase Auth)   profiles   user_settings   user_progress   quiz_sessions
quiz_attempts   achievements   user_achievements   quests   user_quests
favorites   learning_items   suggestions   reports
```

Geografische Daten getrennt (Import aus `/data`, identische IDs):

```
countries  regions  cities  flags  rivers  lakes  mountains  landmarks  license_plates  media  relationships
```

Beziehungen über IDs. Nutzerdaten referenzieren Entities über `entity_id` (Text), damit der Client ohne Join arbeiten kann.

Quelle: TASK.md §83

## Row Level Security

RLS konsequent auf allen Nutzertabellen:

```
user_progress
User A → darf eigene Daten lesen und schreiben
User B → darf eigene Daten lesen und schreiben
User A → darf NICHT Daten von User B lesen oder verändern
```

Öffentliche Profildaten werden über kontrollierte Policies bzw. eine View mit ausschließlich öffentlichen Spalten zugänglich gemacht.

Quelle: TASK.md §84

## Profil

Individuell gestaltbar: Benutzername, Avatar, Profilfarbe, Hintergrund, Rahmen, Titel, ausgewählte Achievements, Lieblingskategorie, Banner.

```
┌────────────────────────┐
│         AVATAR         │
│         GeoMax         │
│        Level 24        │
│    🌍 Europa-Experte   │
│    🏆 🏆 🏆 🏆 🏆      │
└────────────────────────┘
```

Quelle: TASK.md §24

## Öffentliche Profile (optional, opt-in)

`geoquiz.example/u/GeoMax` zeigt: Benutzername, Avatar, Level, XP (falls gewünscht), ausgewählte Achievements, ausgewählte Statistiken.

Nie öffentlich: E-Mail, Passwort, Auth-Daten, private Daten. Der Nutzer entscheidet selbst (Standard: privat).

Quelle: TASK.md §28

## Kontofunktionen

```
Mein Konto
[ Meine Daten exportieren ]   [ Profil öffentlich/privat ]   [ Account löschen ]
```

Account-Löschung löst echte Löschung bzw. die gesetzlich erforderliche Behandlung aus und invalidiert alle Sessions. Läuft serverseitig (Edge Function).

Quelle: TASK.md §27, §52

## Serverseitige Logik

Nicht ausschließlich im Browser: E-Mail-Versand, Account-Löschung, privilegierte Datenoperationen, Admin-Funktionen, Datenimporte, geheime API-Schlüssel.

Quelle: TASK.md §85

## Integrität (Anti-Cheat)

Der Client darf nicht `giveMe100000XP()` senden. Sobald Fortschritt serverseitig gespeichert wird:

- Der Client sendet die **Quiz-Session** (Fragen, Antworten, Zeiten).
- Der Server prüft Plausibilität (Fragen existieren, Antwortzeiten realistisch, Session nicht doppelt) und berechnet XP, Achievements, Quest-Fortschritt und Statistiken selbst.
- Gast-Snapshots bei der Migration werden gegen Obergrenzen geprüft (z. B. XP pro gespielter Session).

Quelle: TASK.md §99

## Synchronisierung und Konflikte

- Sync läuft automatisch bei Verbindung; Offline-Sessions werden gepuffert.
- Konfliktstrategie pro Datentyp: Sessions sind append-only (kein Konflikt); Entity-Progress nimmt den fortgeschritteneren Zustand; Einstellungen last-write-wins mit Zeitstempel.

Quelle: TASK.md §56
