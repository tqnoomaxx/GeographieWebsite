# 05 – Datenpipeline

## Prinzip

Statische Geodaten liegen lokal im Projekt. Externe Quellen dienen nur Import und Aktualisierung. **Keine Quizfrage ruft live eine externe API auf.** Der Nutzer greift nie direkt auf Wikidata, GeoNames oder Commons zu.

```
Externe Quelle (Wikidata, GeoNames, Natural Earth, Wikimedia Commons, offizielle Quellen)
      ↓ Import
      ↓ Normalisierung
      ↓ Validierung
lokaler Datensatz (/data)
      ↓
Website
```

Quelle: TASK.md §30, §32, §90

## Quellen

| Quelle | Verwendung |
|---|---|
| Wikidata | Länder, Regionen, Städte, Gewässer, Berge, Sehenswürdigkeiten, Kennzeichen (P395), Bevölkerung, ISO-Codes |
| GeoNames | Städte mit Koordinaten und Einwohnern, administrative Hierarchie |
| Natural Earth | Ländergrenzen, Regionen, Flüsse, Seen als Geometrie (GeoJSON) |
| Wikimedia Commons | Flaggen-SVGs, Fotos mit Lizenzmetadaten |
| Offizielle Quellen | z. B. KBA-Liste der deutschen Unterscheidungszeichen, Statistikämter |
| `ugbzspiele` | Startbestand Flaggen, Länder, Bilder (siehe [02-ausgangslage.md](02-ausgangslage.md)) |

Quelle: TASK.md §30

## Skripte

```
/scripts
├── import-wikidata/
├── import-geonames/
├── import-natural-earth/
├── import-wikimedia/
├── import-license-plates/
├── import-legacy/          Konvertierung aus ugbzspiele
├── validate-data/
└── update-data/
```

Anforderungen:

- **MUSS Idempotenz:** Ein zweimal ausgeführter Import erzeugt keine Dubletten. Schlüssel ist die stabile Entity-ID (ISO-Code bzw. Wikidata-QID).
- **MUSS Provenienz:** Jeder importierte Datensatz erhält `source`, `source_id`, `last_updated`, `imported_at`.
- **MUSS Konflikte markieren:** Widersprüche zwischen Quellen werden in `provenance.conflicts` festgehalten und im Datenqualitäts-Dashboard sichtbar (siehe [13-admin.md](13-admin.md)).
- **MUSS Validierung:** Pflichtfelder, Koordinatenbereiche, ISO-Formate, Referenzintegrität (jede Relationship zeigt auf existierende Entities), Lizenzpflicht für Medien. Der Build bricht bei Fehlern ab.
- **SOLL Wiederholbarkeit:** Importe laufen als CLI (`npm run data:import -- --source wikidata --scope europe`) und in CI.
- **SOLL Diff-Ausgabe:** Jeder Lauf zeigt hinzugefügte, geänderte, entfernte Datensätze, damit Änderungen reviewbar sind.
- **KANN Caching** der Rohantworten externer APIs, um Rate Limits zu schonen.

Quelle: TASK.md §32, §90, §91

## Normalisierung

- Namen mehrsprachig (`names.de`, `names.en`), Aliasse für Eintipp-Toleranz.
- Einheiten festlegen: Einwohner als Integer, Fläche in km², Höhe in m, Länge in km.
- Koordinaten WGS84, Dezimalgrad.
- Geometrien vereinfachen (Natural Earth 1:10m / 1:50m je nach Zoomstufe) und als eigene lazy geladene GeoJSON-Dateien speichern.

## Datenqualität

Kennzahlen, die `validate-data` erzeugt und das Admin-Dashboard anzeigt: Vollständigkeit pro Feld, fehlende Bilder, fehlende Quellen, widersprüchliche Werte, ungültige Koordinaten.

Quelle: TASK.md §89
