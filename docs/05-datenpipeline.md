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

### Hauptstädte und Nationalsymbole

`npm run data:capitals` wendet `scripts/data/country-capitals.json` auf Länder, Städte und Beziehungen an. Der Katalog wurde am 13.10.2026 mit aktuellen Wikidata-Hauptstadtangaben abgeglichen; Sonderfälle sind mit Regierungs-, Parlaments- oder anderen amtlichen Quellen belegt. `data:all` führt diese Korrektur nach den Rohimporten aus, damit Legacy-Hauptstädte die geprüften Angaben nicht überschreiben.

`capital` bleibt die primäre Referenz. `capitals[]` enthält alle aktuellen Quizantworten; `capital_details[]` unterscheidet ihre Funktionen sowie Regierungssitze, beanspruchte und frühere Hauptstädte. Sri Lanka und Äquatorialguinea verwenden Kotte beziehungsweise Ciudad de la Paz. Südafrika akzeptiert Pretoria, Kapstadt/Cape Town und Bloemfontein. Regierungssitze wie Den Haag und La Paz werden nicht als verfassungsmäßige Hauptstadt ausgegeben. Nauru hat keine offizielle Hauptstadt; Bern wird als Bundesstadt bezeichnet.

`npm run data:symbols` ergänzt den kuratierten Bestand aus `scripts/data/country-symbols-extra.json`, aktuelle Hymnentitel aus `country-anthems.json` (Wikidata P85, CC0; historische und zukünftige Aussagen ausgeschlossen) und amtliche Landesnamen aus `country-official-names.json` (mledoze/countries, ODbL). Symbolquellen und Prüfdatum stehen im Katalog. Regierungs- und Gesetzesquellen können den Status `official` belegen; kulturelle und heraldische Symbole tragen `established`. Ein Wikidata-Link allein gilt nicht als Nachweis einer amtlichen Festlegung.

Ergänzende Blumen stammen aus dem botanischen Verzeichnis der Australian National Botanic Gardens und der National University of Singapore (Stand 2013). Der Quellentitel zeigt diesen Stand; ohne einen zusätzlichen aktuellen amtlichen Beleg tragen diese Einträge konservativ `established`. Naturzeichen, die Fachverbände oder öffentliche Abstimmungen bestimmt haben (z. B. Finnland und Estland), werden ebenfalls so eingeordnet.

Alle 254 Länder-/Gebietsprofile besitzen Symbolkollektionen für Tiere, Vögel, Blumen, Bäume und Fische. Eine leere Kollektion bedeutet **fehlender belegter Eintrag**, nicht „das Land hat kein Nationalsymbol“. Die Detailansicht zeigt diesen Unterschied. Die Qualitätsdatei berichtet die Abdeckung je Symbolart und die noch unbelegten Profile. Es werden keine Nationaltiere erfunden, um jedes Feld zu füllen.

Bei Änderungen den Katalog mit Quelle und Prüfdatum aktualisieren, beide Anreicherungen und anschließend `npm run data:validate` ausführen. Die Hauptstadtkorrektur behält bestehende Stadt-IDs; neue Hauptstädte erhalten stabile IDs. Fortgesetzte Runden aktualisieren unbeantwortete Hauptstadt- und Symbolfragen, behalten aber bereits beantwortete Fragen und Punkte.

Kennzahlen, die `validate-data` erzeugt und das Admin-Dashboard anzeigt: Vollständigkeit pro Feld, fehlende Bilder, fehlende Quellen, widersprüchliche Werte, ungültige Koordinaten.

### Sehenswürdigkeiten und Fotos

`npm run data:landmarks` erweitert den Altbestand mit `scripts/content/landmark-expansion.json`. Der Katalog ergänzt 95 Orte, insgesamt 255 Sehenswürdigkeiten in 146 Ländern (Stand 13.10.2026). Namen, Orte und Länder sind kuratiert; weitere Beschreibungen und Fotos kommen aus Wikidata und den MediaWiki-APIs. `npm run data:landmark-facts` erzeugt die Kurzfakten aus diesen Angaben.

`landmark-photo-overrides.json` fixiert geprüfte Fotomotive. Der Import bevorzugt Wikidata-Fotos und verwirft Logos, Karten, Diagramme und Banknoten. Commons-Dateien sowie frei lizenzierte Fotos aus dem lokalen Dateibestand der englischen Wikipedia werden mit Autor, Quellseite und Lizenz gespeichert. Hinweise der Quelle zum Rechte-Status des abgebildeten Werkes bleiben in `usage_note` und der Attribution erhalten; eine Fotolizenz wird damit nicht als pauschale Rechtefreigabe des Motivs ausgegeben.

Neue und korrigierte Bilder werden als WebP unter versionierten Dateinamen gespeichert, damit der Offline-Bildcache eine Korrektur erhält. `--offline` verwendet die gespeicherten Metadaten und vorhandenen Bilddateien. Die Validierung verlangt für jede Sehenswürdigkeit ein Foto, Bildnachweise und eine gültige WebP-Datei. Online werden Geodaten frisch abgefragt, offline bleibt der vorhandene Datenbestand verfügbar.

Neue Foto-Einträge haben ein festes `daily_available_from`; sie kommen am Folgetag in Bildle und sind sofort im Übungs- und Quizmodus verfügbar. Dadurch verändert die Erweiterung das laufende Tagesrätsel nicht. Unbeantwortete Bildfragen in gespeicherten Runden erhalten die aktualisierten Fotos; bereits gespielte Antworten und Punkte bleiben erhalten.

Quelle: TASK.md §89

### Trivia-Fragen

`public/data/entities/trivia.json` enthält die redaktionellen Wissensfragen mit stabiler Karten-ID, vier Antwort-IDs und Beschriftungen, Lösung, Erklärung, Schwierigkeit und optionalem Kontinent. Die Provenienz enthält die Fachquelle, ihren Link und das Prüfdatum. Quellen sind unter anderem UNESCO, NOAA, National Park Service und staatliche Einrichtungen. Die deutschen Fragen und Erklärungen sind eigenständig formuliert. `data:validate` prüft eindeutige Antwort-IDs und Beschriftungen, genau vier Optionen, eine vorhandene Lösung und eine datierte Quelle; der Daten-Hash erfasst Änderungen am Katalog. Trivia-Karten werden als Lernfortschritt gespeichert und sind gezielt erneut spielbar. Die Ortsuche enthält weiterhin geografische Orte. Neue Fragen benötigen keinen Generator: Katalog erweitern und validieren.
