# 06 – Quiz-Engine

## Universelles Fragen-Schema

Ein Quizsystem für alle Kategorien. Nicht für jede Kategorie ein eigenes System.

```
Question
├── id
├── category        z. B. flags | landmarks | license_plates
├── type            z. B. flag_to_country | image_to_city | code_to_city
├── question_type   multiple_choice | text_input | map_click | matching | image | ordering | true_false | flashcard
├── prompt          Fragetext (i18n-Key + Parameter)
├── answer          korrekte Antwort (Entity-ID oder Wert)
├── options[]       Antwortmöglichkeiten (Distraktoren) bei MC/Matching
├── media           Bild/Flagge/Karte
├── location        Koordinaten/Geometrie für Kartenfragen
├── difficulty      intern berechnet
├── entities[]      beteiligte Entity-IDs (für Progress und Fehlerwiederholung)
└── metadata        Generator, Seed, Relationship
```

Quelle: TASK.md §14

## QuestionGenerator

Jeder Generator ist an einen Relationship- oder Attribut-Typ gebunden und liefert Fragen eines `type`. Beispiele:

| Generator | Relationship / Attribut | Fragetypen |
|---|---|---|
| `flag_to_country` | `flag` (Medium) → `country` | MC, Eintippen |
| `country_to_flag` | umgekehrt | MC (Bilder) |
| `country_to_capital` | `capital_of` | MC, Eintippen |
| `capital_to_country` | `capital_of` | MC |
| `city_to_country` | `located_in` | MC, Eintippen |
| `city_to_region` | `located_in` (admin) | MC |
| `entity_on_map` | `location`/`geometry` | Karte anklicken |
| `image_to_entity` | `media.photo` | Bild → Sehenswürdigkeit/Stadt/Land/Kontinent |
| `river_to_countries` | `flows_through` | Mehrfachauswahl |
| `mountain_to_country` | `located_in` | MC |
| `plate_code_to_city` | `plate_code_of` | MC, Eintippen, Karte |
| `city_to_plate_code` | umgekehrt | MC, Eintippen |
| `population_ordering` | `population` | Reihenfolge |
| `attribute_true_false` | beliebiges Attribut | Wahr/Falsch |
| `flashcard` | beliebige Entity | Lernen |

Die Registry der Generatoren ist datengetrieben. Eine neue Kategorie registriert Generatoren, ohne bestehenden Code zu ändern.

Quelle: TASK.md §14, §100, §101, §102

## Fragetypen

Mindestens: Multiple Choice, Eintippen, Karte anklicken, Zuordnen, Bild erkennen, Reihenfolge, Wahr/Falsch, Lernen/Flashcard.

- Nicht jede Kategorie muss jeden Fragetyp unterstützen.
- **MUSS:** Die App wählt automatisch passende Fragetypen; der Nutzer konfiguriert nichts.
- **MUSS:** Jeder Fragetyp ist ohne Maus beantwortbar, soweit der Typ das zulässt (Tastatur 1–4 für MC, Enter für Eingabe).
- **SOLL:** Eintipp-Fragen tolerieren Groß-/Kleinschreibung, Diakritika, Umlaut-Umschreibungen (ue → ü) und `aliases`.

Quelle: TASK.md §15, §60

## Quizstart und Filter

```
🎯 Quiz – Was möchtest du spielen?
[ Länder ] [ Flaggen ] [ Städte ] [ Hauptstädte ] [ Gewässer ]
[ Berge ] [ Sehenswürdigkeiten ] [ Kennzeichen ] [ Gemischt ]
```

Danach direkt ins Spiel. Optional ein kleiner Bereichsfilter (`🌍 Welt · 🇪🇺 Europa · 🇩🇪 Deutschland`). Keine weitere Konfiguration.

Quelle: TASK.md §16

## Rundenlänge

Die Rundenlänge ist die einzige Wahl neben Kategorie und Bereich. Sie wird als eine Zeile aus Chips gezeigt, nicht als Dialog:

```
Rundenlänge:   [ 10 ]  [ 20 ]  [ 50 ]  [ Alle 254 ]
```

MUSS:
- **„Alle“** spielt jede Entity der gewählten Kategorie und des Bereichs genau einmal durch (z. B. alle 254 Länderflaggen, alle 16 Bundesländer, alle ca. 400 deutschen Kennzeichen). Die Zahl wird aus den Daten berechnet.
- Feste Längen 10 / 20 / 50. Bei weniger Entities als gewählt wird die Länge automatisch gekappt und der Chip ausgeblendet.
- „Alle“-Runden sind **unterbrechbar und fortsetzbar**: Die Session speichert Position und offene Entities lokal; die Startseite bietet „Weiterspielen: Flaggen Europa 83 / 254“.
- „Alle“-Runden zeigen am Ende eine vollständige Fehlerliste und den Button „Fehler wiederholen“; erst ein fehlerfreier Durchlauf zählt für Achievements wie „Flaggenmeister“.
- Die letzte gewählte Länge wird pro Kategorie gemerkt.

SOLL: Adaptive Reihenfolge auch im „Alle“-Modus (schwache Entities früher, Ähnliches nicht direkt hintereinander), aber jede Entity genau einmal.

Quelle: Nutzerentscheidung (Ergänzung zu TASK.md §16, §44, §73)

## Gemischter Modus

Kombiniert Fragen aus mehreren Kategorien und erzeugt das eigentliche „Geografie-Spiel“-Gefühl:

```
1. 🇯🇵 Welche Flagge ist das?
2. 🏛 Was ist die Hauptstadt von Kanada?
3. 📸 Welche Sehenswürdigkeit ist das?
4. 🚗 Welcher Ort gehört zum Kennzeichen B?
5. 🌊 Welcher Fluss ist hier markiert?
```

Quelle: TASK.md §17

## Distraktoren und Schwierigkeit

Kein sichtbarer Schwierigkeitsregler. Schwierigkeit wird intern bestimmt (Einsteiger → Fortgeschritten → Experte) aus: Bekanntheit des Objekts (z. B. Einwohnerzahl, Wikidata-Sitelinks), bisherigen Antworten, Ähnlichkeit der Antwortoptionen, geografischer Bedeutung, Lernfortschritt.

Distraktor-Strategien (je Generator konfigurierbar): Nachbarländer, gleiche Region/Kontinent, ähnliche Flaggen (Farbpalette/Layout), ähnliche Einwohnerzahl, ähnlicher Name. Höhere Schwierigkeit = ähnlichere Distraktoren.

Quelle: TASK.md §71 (Distraktor-Details: Vorschlag 3)

## Adaptivität und Spaced Repetition

Das System lernt den Nutzer im Hintergrund kennen. Fortschritt wird **pro Entity** gespeichert, nicht pro Frage:

```
new → learning → familiar → mastered
```

- Falsch beantwortete Inhalte erscheinen häufiger, richtig beantwortete seltener.
- Schwache Inhalte (z. B. Moldau 18 %) tauchen bevorzugt auf, starke (Deutschland 95 %) seltener.
- Der Nutzer konfiguriert den Algorithmus nicht. Er sieht nur: „Das System passt die Fragen automatisch an.“
- Algorithmus: einfache SM-2/FSRS-artige Variante mit Intervall pro Entity (siehe Vorschlag 4).

Quelle: TASK.md §19, §72

## Fehlerwiederholung

Nach einer Runde werden die falsch beantworteten Entities angezeigt und können gezielt erneut abgefragt werden:

```
2 Fehler
🇸🇰 Slowakei   🇸🇮 Slowenien
[ Fehler wiederholen ]
```

Quelle: TASK.md §73

## Quiz-Session

Jede Runde ist eine Session. Sie ist die Grundlage für Statistiken, Wiederholung und spätere Server-Validierung.

```
quiz_session
├── id
├── user_id           (lokal: Geräte-ID)
├── category
├── mode              standard | mixed | repeat_errors | learn | daily
├── started_at
├── completed_at
├── questions[]       inkl. gegebener Antwort, Korrektheit, Antwortzeit
├── score
└── xp_earned
```

Quelle: TASK.md §98

## Tägliche Rätsel (Wordle-Familie, nur Geografie)

Eigener Modus `daily_puzzle`: ein Rätsel pro Tag und Variante, für alle Nutzer identisch (Seed = Datum + Variante), unbegrenzt viele Übungsrätsel danach. Die Rätsel laufen über dieselben Entities und Relationships wie das Quiz; es gibt keine eigene Datenbasis.

| Variante | Prinzip | Hinweise pro Versuch | Entities | Phase |
|---|---|---|---|---|
| 🏳️ **Flagle** | Flagge ist in 6 Kacheln verdeckt, jeder Fehlversuch deckt eine Kachel auf | aufgedeckte Kachel; bei Fehlversuch Kontinent des geratenen Landes farblich (richtig/falsch) | Länder, später Regionen | A |
| 🌍 **Countryle** | Land erraten, 6 Versuche | Kontinent ✓/✕, Hemisphäre N/S, Entfernung in km, Richtungspfeil zum Ziel, Einwohner ▲/▼, Fläche ▲/▼ | Länder | A |
| 🗺️ **Umrissle** | Landesumriss (Silhouette) erraten, 6 Versuche | wie Countryle, ohne Kontinent-Hinweis | Länder, Regionen mit Geometrie | C |
| 🏛️ **Hauptstädtle** | Hauptstadt erraten aus Land, Hinweise werden nach jedem Versuch freigeschaltet | Anfangsbuchstabe, Einwohner, Koordinatenbereich, Bild | Hauptstädte | B |
| 📸 **Bildle** | Sehenswürdigkeitsbild wird stufenweise entzerrt/vergrößert | Land, Stadt, Typ | Sehenswürdigkeiten | D |
| 🚗 **Kennzeichle** | Kennzeichencode erraten anhand Karte des Gebiets, Zoom wird pro Versuch weiter | Bundesland, Einwohner, Anfangsbuchstabe | Kennzeichen | E |

Gemeinsame Regeln:

- Eingabe als Autocomplete über `names` und `aliases`; nur gültige Entities können geraten werden.
- Jede Variante ist ein `PuzzleGenerator` in der Registry, analog zu `QuestionGenerator`; Hinweistypen (`distance`, `direction`, `continent_match`, `numeric_compare`, `reveal_tile`) sind wiederverwendbare Bausteine.
- Ergebnis als kopierbares Emoji-Raster ohne Auflösung (Share-Text, siehe Vorschlag 18), keine Social-Widgets.
- Tagesrätsel zählen für Streak, XP und eigene Achievements („30 Flagles gelöst“); lokal gespeichert, mit Account synchronisiert.
- Schwierigkeitskurve über die Woche: Wochentag steuert die Bekanntheitsklasse der Entity (Mo leicht … So schwer).
- Serverlos: Der Seed ist deterministisch aus dem Datum, daher funktioniert der Modus in Phase 1 ohne Backend und offline.

Quelle: Nutzerentscheidung (Ergänzung; verbindet TASK.md §17, §76, §77)

## Lernmodus als Teil der Engine

Der Fragetyp `flashcard` zeigt einen Steckbrief statt einer Frage und bietet „Als gelernt markieren“ / „Weiter“. Danach kann optional eine echte Frage zum selben Inhalt folgen. UI-Details in [09-seiten-navigation.md](09-seiten-navigation.md).

Quelle: TASK.md §18, §70
