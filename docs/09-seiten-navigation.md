# 09 – Seiten und Navigation

## Die vier Bereiche

```
🎮 Spielen   📚 Lernen   🌍 Entdecken   🏆 Fortschritt        (+ Profil/Einstellungen)
```

„Tägliche Rätsel“ liegen unter Spielen und zusätzlich als Kachel auf der Startseite („🧩 Heute: Flagle · Countryle“), weil sie der wichtigste Grund für einen täglichen Besuch sind.

Mobile als Bottom Navigation, Desktop als Top-Navigation. Der Nutzer kann jederzeit zwischen den Bereichen wechseln.

Quelle: TASK.md §107, §39

## Routen (Phase 1, hash- oder history-basiert mit konfigurierbarer Base URL)

| Route | Seite |
|---|---|
| `/` | Startseite |
| `/play` | Quizstart (Kategorien, Gemischt, optionaler Bereichsfilter) |
| `/play/:category` | Quizrunde |
| `/daily` | Tägliche Rätsel (Übersicht, Streak) |
| `/daily/:puzzle` | Einzelnes Rätsel, z. B. `/daily/flagle` |
| `/learn` | Lernmodus |
| `/explore` | Entdecken (Kontinente, Listen) |
| `/country/:id` | Landseite |
| `/region/:id` | Regionseite |
| `/city/:id` | Stadtseite |
| `/landmark/:id` | Sehenswürdigkeitsseite |
| `/plate/:id` | Kennzeichenseite |
| `/water/:id`, `/nature/:id` | Gewässer-/Naturseiten (gleiches Muster) |
| `/progress` | Meine Welt, Statistiken, Achievements, Quests, Favoriten |
| `/profile`, `/settings` | Profil, Einstellungen (Theme, Sprache, Daten) |
| `/search` | Suche |
| `/suggest`, `/contact` | Quiz vorschlagen, Kontakt |
| `/impressum`, `/datenschutz`, `/nutzungsbedingungen` | Rechtliche Seiten |
| `/u/:username` | Öffentliches Profil (Phase 2) |
| `/admin/*` | Admin-Bereich (Phase 2/F) |

Keine URLs hart codieren; Base URL ist konfigurierbar (siehe [10-architektur.md](10-architektur.md)).

Quelle: TASK.md §36, §93

## Entdecken

Freies Stöbern ohne Quiz:

```
Entdecken
🌍 Europa  Deutschland · Frankreich · Italien · …
🌏 Asien   Japan · China · Indien · …
🌎 Amerika Kanada · USA · Brasilien · …

🏙️ Größte Städte · 🌊 Längste Flüsse · 🏔️ Höchste Berge
🏝️ Größte Inseln · 🏛️ Berühmte Sehenswürdigkeiten · 🚗 Deutsche Kennzeichen
```

Quelle: TASK.md §64

## Detailseiten (Steckbrief-Prinzip)

Alle Detailseiten folgen einem Muster: Kopf mit Name, Zugehörigkeit und Medium, Kennzahlen als Kacheln, danach anklickbare Abschnitte zu verbundenen Entities, am Ende ein Quiz-Einstieg. Quellen über ⓘ erreichbar.

**Landseite**

```
🇩🇪 Deutschland · Europa
[ Karte ]
84,7 Mio. Einwohner · 357.000 km² · Berlin (Hauptstadt) · Euro · Deutsch
Flagge · Hauptstadt · Bundesländer · Top-Städte · Flüsse · Seen · Gebirge
· Sehenswürdigkeiten · Typische Küche · Nationaltier · Kennzeichen
```

**Regionseite**

```
Bayern · 🇩🇪 Deutschland
13,4 Mio. Einwohner · München (Hauptstadt) · [ Karte ]
Flagge · Städte · Seen · Flüsse · Gebirge · Sehenswürdigkeiten · Kennzeichen
```

**Stadtseite**

```
🏙️ München · Bayern · Deutschland
[ Bild ] · 1,6 Mio. Einwohner
📍 Lage · 🗺️ Karte · 🏛️ Sehenswürdigkeiten · 🚗 Kennzeichen · 🌊 Gewässer · 🏔️ Umgebung
[ München spielen ]
```

**Sehenswürdigkeitsseite**

```
🏛️ Brandenburger Tor · Berlin · Deutschland
[ großes Bild ]  Beschreibung …
📍 Berlin · 🇩🇪 Deutschland
[ Auf Karte zeigen ]  [ Bildquiz starten ]
ⓘ Bildquelle und Lizenz
```

**Kennzeichenseite**

```
🚗 B · Berlin · Deutschland
[ Karte ]  Kennzeichen: B · Gebiet: Berlin
Quiz: [ B → Stadt ] [ Stadt → Kennzeichen ] [ Karte → Kennzeichen ]
```

Quelle: TASK.md §65, §66, §67, §68, §69

## Lernmodus

Sieht nicht wie ein Quiz aus. Steckbrief-Karte mit „Als gelernt markieren“ und „Weiter“, danach optional eine Frage zum Inhalt. Lernen und Spielen sind verbunden.

```
📚 Lernen
🇮🇹 ITALIEN
Hauptstadt Rom · Währung Euro · Amtssprache Italienisch · Einwohner … · Typische Küche … · Nationaltier …
[ Als gelernt markieren ]  [ Weiter ]
```

Quelle: TASK.md §18, §70

## Suche

Globale Suche über alle Entities, Ergebnisse mit Kategorie-Icon:

```
🔎 Berlin  →  🏙️ Berlin · 🇩🇪 Deutschland · 🏛️ Brandenburger Tor · 🚗 B
🔎 Rhein   →  🌊 Rhein · 🇩🇪 Deutschland · 🇫🇷 Frankreich · 🇨🇭 Schweiz
```

Phase 1: clientseitiger Index (z. B. vorgebauter Suchindex pro Sprache, lazy geladen).

Quelle: TASK.md §63

## Rechtliche Seiten und Kontakt

Struktur für `/impressum`, `/datenschutz`, `/nutzungsbedingungen`, `/kontakt` anlegen. **Keine erfundenen Rechtstexte als endgültige Rechtsberatung darstellen**; Inhalte werden anhand des realen Betreiber- und Hosting-Setups erstellt bzw. geprüft. Platzhalter sind als solche gekennzeichnet.

Kontaktformular (Name, E-Mail, Betreff, Nachricht) und „Quiz vorschlagen“ siehe [12-sicherheit-datenschutz.md](12-sicherheit-datenschutz.md).

Quelle: TASK.md §93, §94
