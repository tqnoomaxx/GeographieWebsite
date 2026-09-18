# 04 – Datenmodell

## Leitidee: Entities und Relationships

Alle Inhalte sind **Entities** mit stabiler ID, verbunden über typisierte **Relationships**. Die Quiz-Engine arbeitet ausschließlich auf diesem Graphen; sie kennt keine Kategorie-Sonderfälle. Neue Kategorien bedeuten neue Entity-Typen und Relationship-Typen, keinen Engine-Umbau.

```ts
interface Entity {
  id: string;                 // stabil, z. B. "country:DE", "city:Q64", "plate:DE-B"
  type: EntityType;           // country | region | city | river | lake | mountain | landmark | license_plate | …
  names: { de: string; en?: string; [lang: string]: string | undefined };
  aliases?: string[];         // alternative Schreibweisen für Eintipp-Fragen
  location?: { lat: number; lon: number };
  geometry?: string;          // Referenz auf GeoJSON-Datei (lazy)
  media?: MediaRef[];
  attributes: Record<string, AttributeValue>;   // typspezifische Felder, siehe unten
  provenance: Provenance;
}

interface Relationship {
  from: string;               // Entity-ID
  to: string;                 // Entity-ID
  type: RelationshipType;     // capital_of | located_in | neighbor_of | flows_through | part_of | plate_code_of | …
  provenance?: Provenance;
}
```

Quelle: TASK.md §100, §101, §102 (und Vorschlag 1 in [15-vorschlaege.md](15-vorschlaege.md))

## Provenienz

Jeder Datensatz speichert nach Möglichkeit Quelle und Aktualisierungszeit. Bei widersprüchlichen Quellen wird der Konflikt markiert, nicht stillschweigend aufgelöst.

```ts
interface Provenance {
  source: string;        // "wikidata" | "geonames" | "natural-earth" | "wikimedia" | "kba" | "ugbzspiele" | …
  source_id?: string;    // z. B. Wikidata-QID
  last_updated?: string; // Stand laut Quelle (ISO 8601)
  imported_at: string;   // Zeitpunkt des Imports (ISO 8601)
  conflicts?: Array<{ field: string; values: Array<{ source: string; value: unknown }> }>;
}
```

MUSS: Keine Fakten erfinden. Fehlende Werte bleiben `undefined`, nicht `0` oder `""`.

Quelle: TASK.md §11, §32, §91

## Quellenangaben in der UI

Relevante Werte (z. B. Einwohnerzahl) sind mit Quelle und Stand einsehbar, ohne die Oberfläche zu überladen, z. B. über ein ⓘ-Symbol:

```
Einwohner: 84,7 Mio.
ⓘ Quelle: Wikidata · Stand: 2026
```

Quelle: TASK.md §92

## Attribute pro Entity-Typ

| Typ | Attribute (Auswahl) |
|---|---|
| `country` | iso2, iso3, continent, region, population, area_km2, currencies[], languages[], tld, calling_code, national_animal, typical_foods[], highest_point → mountain |
| `region` | country, admin_level, parent_region, capital → city, population, area_km2 |
| `city` | country, region, population, is_capital_of[] |
| `river` | length_km, countries[], mouth, source |
| `lake` | area_km2, countries[], max_depth_m |
| `mountain` | elevation_m, range → mountain_range, countries[] |
| `landmark` | landmark_type, city, country, description, year_built |
| `license_plate` | code, country, region, district (Landkreis/kreisfreie Stadt), city, historical: boolean |

`typical_foods` als Liste von `{ name, status: "official" | "cultural", source }`.

Quelle: TASK.md §5–§9, §11, §12, §13

## Medien

Bilder dürfen nicht einfach aus Google Images stammen. Nutzungsrechte sind Pflicht; Wikimedia Commons ist die bevorzugte Quelle.

```ts
interface Media {
  id: string;
  object_id: string;      // Entity-ID
  kind: "flag" | "photo" | "coat_of_arms" | "map" | "icon";
  url: string;            // lokaler Pfad oder CDN
  source: string;         // z. B. "wikimedia-commons"
  source_url?: string;
  author?: string;
  license: string;        // SPDX-ähnlich, z. B. "CC-BY-SA-4.0", "public-domain"
  attribution: string;    // fertiger Attributionstext
  width?: number; height?: number;
}
```

MUSS: Kein Medium ohne `license` und `attribution` im Build (siehe Vorschlag 8). Bilder werden optimiert (WebP/AVIF, Größenvarianten) und lazy geladen. Bildquelle und Lizenz sind auf jeder Detailseite erreichbar.

Quelle: TASK.md §33, §68

## Lokale Datenablage

```
/data
├── countries/            eine Datei pro Kontinent oder Region
├── flags/                Metadaten; SVGs unter /public/media/flags
├── regions/<country>/    pro Land
├── cities/<country>/
├── capitals/
├── rivers/  lakes/  mountains/  landmarks/  national-parks/
├── license-plates/<country>/
├── relationships/        pro Relationship-Typ oder pro Land
├── media/                Media-Metadaten
├── index.json            Kategorien, Zähler, Dateiliste für Lazy Loading
└── version.json          Schema- und Datenversion
```

MUSS:
- Daten sind versionierbar (Git) und nach Kategorie bzw. Region aufgeteilt.
- Keine riesigen unstrukturierten JSON-Dateien; Aufteilung so, dass eine Quizrunde nur die benötigten Dateien lädt.
- Zähler für die Fortschrittsanzeige („683 / 1071 Flaggen“) werden aus den tatsächlichen Daten berechnet, nie hart kodiert.

Quelle: TASK.md §31, §45, §46

## Datenbanktabellen (Phase 2)

Die geografischen Daten bleiben getrennt von Nutzerdaten. Tabellen siehe [11-account-backend.md](11-account-backend.md).

Quelle: TASK.md §83
