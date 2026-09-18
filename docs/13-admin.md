# 13 – Admin-Bereich (Phase F)

## Grundsatz

Vollständig getrennter Bereich unter `/admin`, nur für autorisierte Administratoren (Rolle in `profiles`, serverseitig geprüft, RLS). Kein Admin-Code im öffentlichen Bundle, das ohne Autorisierung funktioniert.

Bereiche: Dashboard, Daten, Quizfragen, Bilder, Quiz-Vorschläge, Benutzer, Reports, System.

Quelle: TASK.md §86

## Quiz-Vorschläge

Eingegangene Vorschläge mit Status-Workflow:

```
Neu → In Prüfung → Angenommen | Abgelehnt → Umgesetzt
```

```
„Europäische Flaggen nach Farben“   von User123   Status: Neu          [ Öffnen ]
„Deutsche Seen“                     von GeoMax    Status: In Prüfung   [ Öffnen ]
```

Quelle: TASK.md §87

## Fehlerreports

Gemeldete Fragen (Antwort falsch, Bild falsch zugeordnet, Tippfehler, Karte falsch, Sonstiges) mit Verweis auf Frage, Entity und Generator, damit der Fehler in den Daten korrigiert werden kann. Reports werden serverseitig validiert und gegen Spam geschützt.

Quelle: TASK.md §88

## Datenqualitäts-Dashboard

Kennzahlen aus `validate-data` (siehe [05-datenpipeline.md](05-datenpipeline.md)):

```
Datenqualität
✓ 98,7 % vollständig
⚠ 32 fehlende Bilder
⚠ 18 fehlende Quellen
⚠ 7 widersprüchliche Einwohnerzahlen
⚠ 4 ungültige Koordinaten
```

Jede Warnung verlinkt auf die betroffenen Entities.

Quelle: TASK.md §89

## Phase-1-Ersatz

Vor dem Backend erfüllt ein CLI-Report (`npm run data:validate -- --report`) plus GitHub Issues dieselbe Funktion. Der Admin-Bereich in der UI kommt erst mit Supabase.
