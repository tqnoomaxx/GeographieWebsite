# 03 – Inhalte und Kategorien

Dieses Dokument definiert **alle Inhaltskategorien an einer Stelle**. Andere Dokumente referenzieren diese Liste und wiederholen sie nicht. Die Reihenfolge der Einführung steht in [14-roadmap.md](14-roadmap.md).

## Übersicht

| Icon | Kategorie | Entity-Typen | Phase |
|---|---|---|---|
| 🌍 | Länder | `country` | A |
| 🏳️ | Flaggen | `flag` (Medium an country/region/city) | A |
| 🏛️ | Hauptstädte | `city` mit `capital_of` | A |
| 🗺️ | Regionen | `region` (Bundesland, Kanton, Provinz, Département, Bundesstaat …) | C |
| 🏙️ | Städte | `city` | C |
| 🗺️ | Karten | Fragetyp über allen Entities mit Koordinaten/Geometrie | C |
| 🌊 | Gewässer | `river`, `lake`, `sea`, `ocean`, `bay`, `canal`, `strait`, `waterfall` | D |
| 🏔️ | Natur | `mountain`, `mountain_range`, `volcano`, `pass`, `valley`, `desert`, `island`, `peninsula`, `national_park` | D |
| 📸 | Sehenswürdigkeiten | `landmark` | D |
| 📸 | Bilderquiz | Fragetyp über allen Entities mit Bildern | D |
| 🚗 | Kennzeichen | `license_plate` | E |
| 🎲 | Gemischt | alle | A (wächst mit) |
| 🧩 | Tägliche Rätsel | Flagle, Countryle, Umrissle, Hauptstädtle, Bildle, Kennzeichle über bestehende Entities | A (wächst mit) |
| 📚 | Lernen | alle | A |

Quelle: TASK.md §4, §5, §16, §41

## 🌍 Länder

Jedes Land erhält einen strukturierten Steckbrief. Nicht jedes Land muss jedes Feld besitzen. Keine Daten erfinden.

Eigenschaften: Hauptstadt, Einwohner, Fläche, Währung, Amtssprache(n), Kontinent, Region, Nachbarländer, Nationaltier, typische Küche, Internetdomain, Telefonvorwahl, ISO-Codes (Alpha-2, Alpha-3), höchster Berg, wichtige Flüsse, wichtige Seen, Inseln, Nationalparks, Sehenswürdigkeiten, bekannte Städte.

```
Deutschland
Hauptstadt: Berlin      Währung: Euro        Amtssprache: Deutsch
Kontinent: Europa       Region: Mitteleuropa Internetdomain: .de
Telefonvorwahl: +49     ISO: DE / DEU        Nachbarländer: …
Höchster Berg: …        Wichtige Flüsse: …   Nationalparks: …
```

Spielarten: Länder erkennen, Länderwissen (Eigenschaft → Land, Land → Eigenschaft), Nachbarländer, Kontinent zuordnen.

Quelle: TASK.md §5, §11

### Typische Küche

Im Datenmodell `typical_foods` verwenden, nicht nur `national_food`, da nicht jedes Land ein offizielles Nationalgericht hat. Kulturell typische Gerichte werden als solche gekennzeichnet (`status: "cultural" | "official"`).

Quelle: TASK.md §12

## 🏳️ Flaggen

Umfang: Länderflaggen, Bundesländer, Kantone, Provinzen, Regionen, Gebiete, Städte, historische Flaggen (sofern sinnvoll).

Spielarten: Flagge → Land, Land → Flagge, Flagge → Region, Flagge → Karte, Eintippen, Multiple Choice, ähnliche Flaggen, Flaggen vergleichen.

Quelle: TASK.md §5

## 🏛️ Hauptstädte

Spielarten: Land → Hauptstadt, Hauptstadt → Land, Hauptstadt auf Karte, Hauptstadt anhand Bild, Hauptstadt anhand Einwohnerzahl/Informationen.

Quelle: TASK.md §5

## 🗺️ Administrative Regionen

Das Datenmodell unterstützt beliebig viele administrative Ebenen und ist nicht auf Deutschland beschränkt.

```
Deutschland  └── Bundesländer └── Landkreise / kreisfreie Städte
Schweiz      └── Kantone
Österreich   └── Bundesländer
USA          └── Bundesstaaten
Frankreich   └── Regionen / Départements
```

Jede Region: Name, Land, Ebene (`admin_level`), übergeordnete Region, Hauptstadt, Einwohner, Fläche, Flagge/Wappen, Geometrie.

Quelle: TASK.md §6

## 🏙️ Städte

Pro Land möglichst die wichtigsten Städte, als Basis etwa die 25 größten bzw. relevantesten.

Daten: Name, Land, Region, Bundesland/Kanton/Provinz, Einwohnerzahl, Koordinaten, Sehenswürdigkeiten, Bilder, ggf. Stadtflagge/Wappen, weitere Informationen.

Spielarten: Stadt → Land, Stadt → Region, Stadt auf Karte, Stadt anhand Bild, Einwohnerzahl, größte Städte, Reihenfolgen, Zuordnungen.

Quelle: TASK.md §5

## 🌊 Gewässer

Typen: Flüsse, Seen, Meere, Ozeane, Buchten, Kanäle, Meerengen, Wasserfälle.

Spielarten: Gewässer erkennen, Land zuordnen, Karte, Verlauf erkennen, Bild erkennen, mehrere Länder zuordnen (Flüsse durchqueren oft mehrere Länder → Mehrfachantwort).

Quelle: TASK.md §7

## 🏔️ Natur

Typen: Berge, Gebirge, Vulkane, Pässe, Täler, Wüsten, Inseln, Halbinseln, Nationalparks.

Beispielfragen: „In welchem Land liegt dieser Berg?“, „Zu welchem Gebirge gehört er?“, „Welcher Berg ist auf dem Bild zu sehen?“

Quelle: TASK.md §8

## 📸 Sehenswürdigkeiten

Besonders wichtige Kategorie. Typen: bekannte Gebäude, Denkmäler, Türme, Burgen, Schlösser, Brücken, religiöse Bauwerke, historische Orte, Natursehenswürdigkeiten, Wahrzeichen.

Pflichtfelder soweit verfügbar: Name, Land, Stadt, Region, Typ, Beschreibung, Koordinaten, Bilder, Quellen, Lizenzinformationen.

Quelle: TASK.md §9

## 📸 Bilderquiz „Was siehst du?“

Zentraler Spielmodus über alle Entities mit Bildern (Sehenswürdigkeit, Stadt, Landschaft, Berg, Fluss, See, Gebäude, Wahrzeichen, Flagge). Dasselbe Bild ist für mehrere Fragetypen verwendbar:

```
Bild → Sehenswürdigkeit erraten   (Was ist es?)
Bild → Stadt erraten              (Wo ist es?)
Bild → Land erraten               (In welchem Land?)
Bild → Kontinent erraten          (Auf welchem Kontinent?)
```

Quelle: TASK.md §10

## 🚗 Kfz-Kennzeichen

Zunächst Deutschland besonders umfangreich, danach international (Österreich, Schweiz, Frankreich, Italien, Spanien, USA, Kanada …). **Deutschland darf technisch keine Sonderbehandlung benötigen.**

Daten (Deutschland): Kennzeichen, zugehörige Stadt, Landkreis, kreisfreie Stadt, Bundesland, ggf. historische Kennzeichen.

```
B → Berlin   M → München   K → Köln   HH → Hamburg   D → Düsseldorf
```

Spielarten: Kennzeichen → Ort, Ort → Kennzeichen, Eintippen, Karte (Gebiet des Kennzeichens zeigen).

Quelle: TASK.md §13

## 🧩 Tägliche Rätsel

Wordle-artige Geografie-Rätsel, ein Rätsel pro Tag und Variante, danach beliebig viele Übungsrätsel. Keine eigene Datenbasis: Jede Variante arbeitet auf vorhandenen Entities. Regeln und Varianten in [06-quiz-engine.md](06-quiz-engine.md).

Quelle: Nutzerentscheidung

## Spätere Kategorien

Die Engine soll diese ohne Umbau aufnehmen können: Flughäfen, Inseln, Nationalparks, Burgen, Schlösser, UNESCO-Welterbestätten, Währungen, Sprachen, typische Gerichte, Tiere, historische Gebiete, Strände.

Ablauf für eine neue Kategorie (z. B. 🏖️ Strände):

```
Beach Entity hinzufügen → Daten importieren → Beziehungen definieren
→ Question Generator hinzufügen → Kategorie in UI registrieren
```

Nicht: gesamte Anwendung umbauen.

Quelle: TASK.md §50, §102
