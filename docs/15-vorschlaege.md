# 15 – Weitere Vorschläge und offene Entscheidungen

Diese Punkte gehen über TASK.md hinaus oder konkretisieren dort nur angedeutete Anforderungen. Jeder Vorschlag hat eine Begründung und eine Empfehlung. Punkte, die bereits in die Dokumente 01–14 eingeflossen sind, sind markiert.

## Datenmodell und Engine

**1. Entity/Relationship-Modell konkret festschreiben** *(eingeflossen in 04)*
TASK.md §101 nennt die Bausteine, definiert sie aber nicht. Erst mit einem expliziten Graphenmodell wird „neue Kategorie ohne Umbau“ (§102) realistisch: QuestionGenerators arbeiten nur auf Relationship-Typen.

**2. Stabile IDs über Standards** *(eingeflossen in 04, 05)*
ISO 3166-1/-2 für Länder und Regionen, sonst Wikidata-QID. Löst Idempotenz beim Import (§90) und erlaubt spätere Verknüpfung mit jeder externen Quelle.

**3. Distraktor-Strategie pro Generator** *(eingeflossen in 06)*
Die Qualität eines Multiple-Choice-Quiz hängt fast nur von den falschen Antworten ab. Empfehlung: Strategien `neighbors`, `same_region`, `similar_flag`, `similar_population`, `similar_name`, gewichtet nach Schwierigkeit. Flaggenähnlichkeit vorab offline berechnen (Farbhistogramm + Layout-Klasse) und als Relationship `similar_to` speichern.

**4. Spaced-Repetition-Algorithmus festlegen** *(eingeflossen in 06)*
Empfehlung: vereinfachtes SM-2 (Intervall × Faktor bei richtig, Reset bei falsch) mit Zuordnung der vier Zustände über Intervall-Schwellen. Speicherung pro Entity-ID, damit dieselbe Entity in verschiedenen Fragetypen gemeinsam lernt. FSRS erst, wenn genug Daten vorliegen.

**5. Kartentechnik entscheiden** *(offen)*
„Karten“ ist Hauptkategorie, aber TASK.md definiert keine Technik. Empfehlung: **MapLibre GL JS** mit lokalen GeoJSON-/PMTiles-Daten aus Natural Earth (kein externer Tile-Server, kein Tracking, offline-fähig). Für Phase A genügt eine einfache SVG-Weltkarte für Locator-Anzeigen; die Locator-Karten aus `ugbzspiele` prüfen.

**6. Eintipp-Toleranz** *(eingeflossen in 04, 06)*
`aliases[]` pro Entity (USA / Vereinigte Staaten / United States), Normalisierung von Diakritika und Umlaut-Umschreibungen, optional Levenshtein-Distanz 1 bei langen Namen.

## Daten und Content

**7. Content-Roadmap getrennt von Feature-Roadmap** *(eingeflossen in 14)*
Der Legacy-Bestand (254 Länder, ~1.071 Flaggen) liefert Phase A sofort viel Inhalt. Wikidata-Importer danach, nicht vorher.

**8. Lizenz-Gate im Build** *(eingeflossen in 04, 14)*
`validate-data` bricht ab, wenn ein Medium ohne `license`/`attribution` existiert. Eine Attribution-Seite wird automatisch aus den Media-Metadaten generiert. Das macht §33 durchsetzbar statt nur gewünscht.

**9. Daten-Versionierung für Cache-Invalidierung** *(eingeflossen in 04, 10)*
`data/version.json` mit Schema- und Datenversion; Service Worker und IndexedDB-Cache invalidieren darauf. Ohne das bleiben Nutzer nach Datenupdates auf alten Fakten.

**10. Kennzeichen-Datenquelle** *(eingeflossen in 05)*
Wikidata-Property P395 (Kfz-Unterscheidungszeichen) plus offizielle KBA-Liste als Referenz. Für Kartenfragen Landkreis-Geometrien (z. B. aus offenen Verwaltungsgrenzen des BKG) an das Kennzeichen hängen.

## Architektur und Betrieb

**11. Neues Repository statt Weiterbau in `ugbzspiele`** *(eingeflossen in 02)*
Das alte Repo mischt Next.js, Partyspiele und Flaggenquiz. Ein eigenes Repo `geokompass` hält Deployment, Vite-`base` und spätere Domain sauber. Nicht-Geo-Spiele bleiben, wo sie sind.

**12. Repository-/Adapter-Pattern für Speicher** *(eingeflossen in 10, 11)*
Interfaces wie `ProgressRepository` mit `LocalRepository` (IndexedDB via `idb`) und später `SupabaseRepository`. Sync-Strategie (append-only Sessions, fortgeschrittener Zustand pro Entity, last-write-wins für Einstellungen) jetzt dokumentieren, nicht erst in Phase F.

**13. PWA von Anfang an** *(eingeflossen in 10)*
Manifest + Service Worker (z. B. `vite-plugin-pwa`) erfüllen §56 Offline fast nebenbei und machen die App auf dem Smartphone installierbar.

**14. Teststrategie** *(fehlt in TASK.md komplett)*
Vitest für Engine, Generatoren und Schwierigkeitsberechnung mit deterministischen Seeds; Playwright für die Kernflows (Runde spielen, Fortschritt bleibt, Dark Mode); Datenvalidierung als CI-Job. Empfehlung: Engine-Tests ab Phase A verpflichtend.

**15. Qualitätsregeln**
TypeScript `strict`, ESLint, Prettier, Conventional Commits, Preview-Build als GitHub-Actions-Artefakt pro Pull Request.

**16. Formulare ohne Backend in Phase 1** *(eingeflossen in 12)*
Vorschläge und Reports als vorausgefüllter GitHub-Issue-Link (kein Secret nötig, öffentlich nachvollziehbar) oder lokal zwischenspeichern und in Phase 2 senden. Kein Formspree-artiger Dienst mit Client-Key.

## Produkt und UX

**17. Tägliche Runde**
10 gemischte Fragen mit tagesabhängigem Seed, für alle Nutzer identisch. Bindungsfeature ohne Rangliste, ohne Bestrafung, passt zu §76/§77.

**18. Teilbare Ergebniskarte**
Nach Rundenende ein Text-/Bild-Snippet („8/10 Flaggen Europas 🇪🇺“) zum Kopieren oder Teilen über die Web Share API. Kein Tracking, keine Social-Widgets.

**19. Onboarding-Frage statt Konfiguration**
Beim ersten Start eine einzige Frage („Wie gut kennst du dich aus? Einsteiger / Fortgeschritten / Experte“) als Startwert für die adaptive Schwierigkeit. Erfüllt §3 („sofort spielen“) und §71 zugleich.

**20. Lokale Mehrbenutzer-Profile für Gäste** *(prüfen)*
Familie oder Klasse an einem Gerät: mehrere lokale Profile ohne Account. Das alte Repo hat Partyspiele, die Zielgruppe scheint gemeinsames Spielen zu kennen.

## Korrekturen an TASK.md

- §45 „Länder 683 / 195“ ist ein Zahlenfehler; Zähler werden aus den Daten berechnet (siehe 07).
- Kategorielisten in §4, §16, §41 weichen voneinander ab (Kennzeichen fehlt teils). Die verbindliche Liste steht jetzt nur in 03.
- Abschnitte 51–107 waren unformatiert; sie sind nun in die thematischen Dokumente eingearbeitet.
- Doppelte Abschnitte (Performance 46/57, Accessibility 47/60, Dark Mode 48/61, i18n 49/62, Gastmodus 25/53, Sicherheit 26/52, Analyse 2/106, Feedback 43/78, Fortschritt 23/45, Achievements 21/81, Quests 22/82) wurden je zu einer Anforderung zusammengeführt.

## Getroffene Entscheidungen

Der User hat Rundenlänge, Wordle-Modi und Namensfindung vorgegeben und die übrigen Punkte zur Entscheidung freigegeben. Stand 18.09.2026:

| Frage | Entscheidung | Begründung |
|---|---|---|
| Rundenlänge | Chips **10 / 20 / 50 / Alle** pro Kategorie und Bereich; „Alle“ fortsetzbar | Nutzerwunsch; Details in [06-quiz-engine.md](06-quiz-engine.md) |
| Wordle-artige Modi | Eigener Modus „Tägliche Rätsel“ mit Flagle, Countryle, Umrissle, Hauptstädtle, Bildle, Kennzeichle | Nutzerwunsch; nur Geografie-Varianten, gleiche Datenbasis |
| Produktname | **Arbeitstitel „GeoKompass“**, Alternativen siehe unten | siehe Namensfindung |
| Repository-Name | `geokompass` | folgt dem Produktnamen |
| Sprache der Codebasis | Englisch im Code, Deutsch in UI-Texten und Docs | Standard für Open Source und Bibliotheken |
| Kartenbibliothek | MapLibre GL JS mit lokalen GeoJSON/PMTiles aus Natural Earth; Phase A nur SVG-Weltkarte | kein externer Tile-Server, offline, kein Tracking |
| Speicher Phase 1 | IndexedDB (`idb`) für Fortschritt und Sessions, LocalStorage für Einstellungen | „Alle“-Runden und Sessions werden zu groß für LocalStorage |
| Analytics | keine | Datenschutz-Priorität, kein Consent-Banner nötig |
| Historische Flaggen und Kennzeichen | nicht in Phase 1; Feld `historical: boolean` vorbereitet | Kernbestand zuerst |
| Routing | History-Routing mit 404-Fallback auf GitHub Pages (`404.html` → `index.html`) | saubere URLs, keine `#`-Links |
| PWA | ab Phase A | Offline und tägliche Rätsel funktionieren serverlos |
| Rechtstexte | Platzhalterseiten mit sichtbarem Hinweis „Entwurf“, bis reales Hosting steht | TASK.md §93 |

## Namensfindung

Anforderungen an den Namen: geografisch, spielerisch, nicht kindisch, passend zu „Atlas + Lernplattform + Quiz + Sammelbuch“, auf Deutsch aussprechbar, international lesbar, Domain realistisch.

DNS-Schnellcheck vom 18.09.2026 (kein DNS-Eintrag heißt „wahrscheinlich frei“, endgültig nur beim Registrar prüfbar):

| Kandidat | Idee | Domain-Lage |
|---|---|---|
| **GeoKompass** (Empfehlung) | Orientierung, Entdecken, ernsthaft aber spielerisch; „Kompass“ passt zu Countryle-Richtungspfeilen | `geokompass.de` belegt, `geokompass.app` frei |
| Weltatlas | klar, deutsch, beschreibt das Produkt | `weltatlas.app` frei, `.de` belegt, sehr generisch |
| Atlasly | international, modern | `atlasly.de` frei, `.com`/`.app` belegt |
| Geodex | Sammelbuch-Anklang (wie Pokédex), sehr passend zur „Meine Welt“-Idee | `.de`, `.app`, `.io` belegt |
| Terrano, Globino, Kartenkopf, Erdkunde, Mappedia, TerraQuiz, GeoPass | geprüft | alle belegt |

Empfehlung: **GeoKompass** als Arbeitstitel, `geokompass.app` sichern, den Namen „GeoQuiz“ aus TASK.md nur noch als Beschreibung verwenden. Falls Geodex gewünscht ist, wäre eine Variante wie `geodex.world` zu prüfen.
