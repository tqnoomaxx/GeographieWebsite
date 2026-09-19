# 16 – Spielregeln (verbindliches Schema)

Dieses Schema definiert exakt, wie jede Spielart funktioniert. Vorlage ist die Engine der Vorgängerversion (`ugbzspiele`, `gameEngine.js`) plus TASK.md §14–§17, §42–§44, §71–§73. Die Engine (`src/engine`) und die Rundenansicht müssen sich daran halten; `src/engine/engine.test.ts` prüft die markierten Regeln.

## Ein Quiz ist immer: Kategorie · Fragetyp · Bereich · Rundenlänge

```
Setup:  ① Bereich [+ Inhalt Länder/Regionen]  →  ② Fragetyp  →  ③ Rundenlänge (+ Schalter „Fehler wiederholen“)
  → Runde: [Frage → Antwort → Feedback] × n → Ergebnis
```

Diese vier Angaben (`RoundConfig` in `src/engine/round.ts`) sind die einzige Beschreibung einer Runde. Sie stehen identisch in der URL (`/play/flags/round?mode=flag_to_name&scope=europe&len=10&content=country`), in der gespeicherten Session (`setup`) und in der Anzeige. Setup, Runde, Ergebnis, offene Runden und Verlauf zeigen immer dieselbe Zeile, z. B. **„Flaggen · Flagge → Name“** mit „Europa · Länderflaggen · 10 Fragen“ (`RoundTitle` in `src/features/play/RoundLabel.tsx`).

### Konfiguration an einer Stelle

Alles Spielbare steht in **`src/config/quizzes.ts`**. Pro Kategorie (`QuizDef`):

| Feld | Bedeutung |
|---|---|
| `modes` | Fragetypen mit `form` (`choice` = Multiple Choice, `input` = Eintippen, `map` = Karte) und den Generatoren, die sie stellen |
| `needs` | nachzuladende Daten (`regions`, `plates`) |
| `perCountry` | ein einzelnes Land ist als Bereich wählbar |
| `content` | Inhaltsfilter Länder / Regionen anbieten (Flaggen, Karten) |
| `defaultScope` | Startbereich (z. B. Deutschland bei Regionen und Kennzeichen) |
| `primary`, `icon`, `countKey` | Darstellung auf Startseite und Hub |

Ein Fragetyp kann zusätzlich `length: 'all'` (immer komplett, Europa-Karte), `content` (erzwungener Inhalt) und `scopes` (nur in bestimmten Bereichen) setzen. „Automatisch“ mischt alle Fragetypen mit `form: 'choice'` (R10); hat eine Kategorie keine (Karten), alle. „Gemischt“ nimmt die Multiple-Choice-Fragetypen aller Kategorien (Ausnahmen in `MIXED_EXCLUDE`). Labels: `category.<id>`, `modes.<id>`, `modes_desc.<id>` in `locales/de/common.json`.

Neuer Fragetyp in drei Schritten: Generator in `src/engine/generators/` schreiben → in `src/engine/registry.ts` eintragen → in `quizzes.ts` einem Fragetyp zuordnen und Label ergänzen. Setup-Seite, Rundenanzeige, Pools und Tests folgen automatisch (`engine.test.ts` prüft, dass jeder eingetragene Generator existiert und zur Kategorie passt).

## Gemeinsamer Rundenablauf

| Regel | Definition |
|---|---|
| R1 Rundenlänge | 10, 20, 50 oder „Alle“ (jede Lernkarte der Sammlung genau einmal, Reihenfolge zufällig, schwache Karten bevorzugt vorn). Bei weniger Karten als gewählt wird gekappt. |
| R2 Antwortoptionen | Multiple Choice hat genau 4 Optionen, davon 1 richtig. Falsche Optionen stammen in dieser Reihenfolge aus: gleiche Sammlung/gleiches Land oder Nachbarland → gleicher Kontinent → Rest. Ausgeschlossen: gleicher Name, optisch identische Flagge (`visual_key`), abhängige Gebiete als Falschantwort neben souveränen Staaten. |
| R3 Eingabe | Groß/Klein, Diakritika, Umlaut-Umschreibung (ue/ü), Bindestrich und Satzzeichen sind egal. Akzeptiert werden deutscher Name, englischer Name, Aliasse und bei Ländern der ISO-Code. Tippfehler-Toleranz: 1 Zeichen ab 5, 2 Zeichen ab 9 Buchstaben. |
| R4 Feedback | Nach jeder Antwort erscheint sofort Feedback: „Richtig!“ oder „Nicht ganz“ mit der richtigen Lösung und einem Lernsatz. Weiter per Button, Enter oder Leertaste. Optionen sind per Taste 1–4 wählbar. |
| R5 Fehler wiederholen | Standard an. Eine falsch beantwortete Aufgabe wird einmal vier Positionen später erneut gestellt (Optionen neu gemischt, Kennzeichnung „Wiederholung“). Wiederholungen zählen nicht als Erstversuch und geben nur den Trostpreis-XP. Bei Kartenfragen gibt es keine Wiederholung (siehe R7). |
| R6 Punkte und Serie | Richtige Erstantwort: 100 Punkte + Serienbonus min(Serie, 10) × 15. Falsche Antwort setzt die Serie auf 0. Beste Serie wird gespeichert. |
| R7 Kartenfrage | Ziel auf der Karte antippen. Falsche Klicks zählen als Versuch (Serie auf 0), das falsche Gebiet wird rot markiert, die Aufgabe bleibt offen, bis das Ziel gefunden ist. „Richtig“ (Erstversuch) nur ohne Fehlklick. Auf der Europa-Karte kann eine Aufgabe übersprungen werden (zählt als Fehler). |
| R8 Ergebnis | Zeigt: richtig / gestellt, Prozent, Punkte, beste Serie, Erstversuche / Grundaufgaben, Liste der Fehler-Lernkarten. Buttons: Noch einmal (gleiche Einstellungen), Fehler wiederholen (nur die Fehler, klassisch), Weiter. |
| R9 Lernstand | Jede Antwort aktualisiert den Lernstand der Lernkarte (new → learning → familiar → mastered) per vereinfachtem SM-2; Wiederholungen zählen mit. Anzeige „x von y gemeistert“ zählt familiar + mastered. |
| R10 Automatisch | „Automatisch“ mischt nur Multiple-Choice-Varianten der Kategorie. Eintippen und Karte werden immer ausdrücklich gewählt. |
| R12 Bereich | Für jede Kategorie gilt derselbe Bereichsfilter: Welt, Kontinente und (wo sinnvoll) ein einzelnes Land. Angeboten werden nur Bereiche und Fragetypen mit mindestens vier spielbaren Lernkarten; reicht der Bereich nicht für vier Antwortoptionen, werden Falschantworten aus dem Gesamtbestand ergänzt. |
| R11 Unterbrechen | „Alle“-Runden werden gespeichert und sind fortsetzbar. Kurze Runden werden beim Beenden gewertet, wenn mindestens eine Antwort vorliegt. |

## Spielarten je Kategorie

Notation: **Gegeben → Gesucht** · Antwortform · Pool.

### Flaggen
| Spielart | Gegeben → Gesucht | Form | Pool |
|---|---|---|---|
| Flagge → Name | Flaggenbild → Name des Landes bzw. der Region | MC 4 | Sammlung (Länder und/oder Regionen). Regionen-Distraktoren nur aus demselben Land. |
| Name → Flagge | Name → richtiges Flaggenbild aus 4 | MC 4 Bilder | wie oben |
| Eintippen | Flaggenbild → Name | Text (R3) | Länder |
| Flagge → Karte | Flaggenbild → Land auf der Weltkarte bzw. Region auf der Landeskarte | Karte (R7) | nur Ziele, die auf der jeweiligen Karte existieren |
| Europa-Karte | Flaggenbild → Region auf der Europakarte | Karte (R7), Überspringen erlaubt, Rundenlänge immer „Alle“ | Regionen mit Flagge auf der Europakarte |
| Inhalt: Länderflaggen / Regionalflaggen / Alles | Filter auf die obigen; bei einem einzelnen Land als Bereich immer dessen Regionen | | |

### Hauptstädte
| Spielart | Gegeben → Gesucht | Form |
|---|---|---|
| Land → Hauptstadt | Landname → Hauptstadt | MC 4 aus Hauptstädten souveräner Staaten |
| Hauptstadt → Land | Hauptstadtname → Land | MC 4 |
| Eintippen | Landname → Hauptstadt | Text |

### Länder (Länderwissen)
| Spielart | Gegeben → Gesucht | Form |
|---|---|---|
| Länderwissen | Land → Währung / Amtssprache / Kontinent (deutsche Bezeichnungen) | MC 4 |
| Nachbarländer | Land → ein Nachbarland | MC 4, Falschantworten sind keine Nachbarn |
| Wahr / Falsch | „A hat mehr Einwohner als B“ | 2 Optionen, Lernsatz mit beiden Zahlen |

### Regionen
Flagge → Name (Distraktoren aus demselben Land) · Region → Land · Region → Hauptstadt (Distraktoren: Hauptstädte anderer Regionen desselben Landes).

### Städte
Stadt → Land · Stadt → Region · Hauptstadt eintippen. Pool: 15 größte Städte je Land plus Hauptstädte.

### Karten
Land auf Weltkarte · Region auf Landeskarte (R7).

### Bilder und Sehenswürdigkeiten
Bild → Sehenswürdigkeit · Bild → Stadt (nur Städte mit Foto) · Bild → Land · Sehenswürdigkeit → Land · Sehenswürdigkeit → Stadt (Distraktoren: Städte desselben Landes). Nach der Antwort werden Bildquelle und Lizenz eingeblendet.

### Gewässer und Natur
Fluss/See/Berg → Land (bei mehreren Ländern zählt jedes davon als richtig, es wird eines abgefragt, der Lernsatz nennt alle) · Vergleich (länger/größer/höher, 2 Optionen, Lernsatz mit Werten) · Auf der Karte (Land des Objekts, nur eindeutige Objekte).

### Kennzeichen
Kennzeichen → Ort · Ort → Kennzeichen (Distraktoren bevorzugt aus demselben Bundesland) · Eintippen (Ort oder Landkreis).

### Gemischt
Pro Lernkarte wird zufällig eine passende MC-Spielart der beteiligten Kategorien gewählt (R10). Bereich wählbar.

### Tägliche Rätsel
Ein Rätsel pro Tag und Variante, für alle gleich (Seed = Datum), maximal 6 Versuche, Hinweise pro Versuch, danach Übungsrätsel. Zählt für Streak und XP; keine Wiederholung, keine Punkte-Serie.
