Ja. Dann würde ich den gesamten Prompt **von Grund auf neu** formulieren und dabei berücksichtigen, dass die erste Version zunächst auf **GitHub Pages** laufen soll, aber technisch so gebaut wird, dass du später ohne kompletten Neubau auf eine echte Domain \+ Backend + Datenbank umsteigen kannst.

 Für dein Projekt würde ich aktuell ungefähr diese Architektur empfehlen:

 - **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Hosting am Anfang:** GitHub Pages
- **Statische Geodaten:** lokal im Projekt bzw. als optimierte JSON-Dateien
- **Späteres Backend:** Supabase
- **Spätere Datenbank:** PostgreSQL über Supabase
- **Authentifizierung:** Supabase Auth
- **Bilder:** zunächst lokale/geeignet lizenzierte Assets, später ggf. Storage/CDN
- **E-Mail-Formular:** später über einen serverseitigen/Edge-Function-basierten Maildienst
- **Domain:** später bei einem normalen Domain-Registrar; GitHub Pages kann zunächst über die GitHub-URL erreichbar sein

 Wichtig ist, dass der Agent **nicht versucht, auf GitHub Pages ein Backend zu simulieren**. Die erste Version kann Gastmodus und lokale Speicherung vollständig beherrschen. Account-Funktionen werden architektonisch vorbereitet und später mit Supabase verbunden.

 Hier ist der komplett neue Master-Prompt:

 # GEOQUIZ – vollständige Neuentwicklung

 ## 1\. Projektvision

 Entwickle eine moderne, umfangreiche und langfristig erweiterbare **Geografie-Spielplattform**.

 Das Projekt startet zunächst als statische Webanwendung auf **GitHub Pages**.

 Die erste Version muss deshalb ohne eigenes Backend vollständig lauffähig sein.

 Die Architektur muss aber von Anfang an so geplant werden, dass die Anwendung später ohne grundlegenden Neubau auf:

 - eigene Domain
- Backend
- PostgreSQL-Datenbank
- Benutzerkonten
- Cloud-Synchronisierung
- serverseitige Funktionen
- E-Mail-Versand
- größere Datenmengen

 umgestellt werden kann.

 Die Anwendung soll langfristig deutlich größer werden als ein normales Flaggenquiz.

 Das Produkt ist:

 > **Ein modernes interaktives Geografie-Spiel, mit dem man die Welt spielerisch entdecken, lernen und testen kann.**

---

 # 2\. Ausgangspunkt

 Es existiert bereits eine ältere Flaggen-Website unter:

 https://tqnoomaxx.github.io/ugbzspiele/flaggen

 Diese bestehende Website soll als inhaltliche Ausgangsbasis betrachtet werden.

 Vor der Entwicklung:

 1. Bestehendes Projekt analysieren.
2. Vorhandene Daten identifizieren.
3. Vorhandene Flaggen und Assets identifizieren.
4. Bestehende Quizlogik untersuchen.
5. Wiederverwendbare Daten übernehmen.
6. Nicht benötigte oder veraltete UI-Strukturen nicht einfach übernehmen.
7. Das neue Projekt konzeptionell und visuell vollständig neu aufbauen.

 Die alte Website soll **nicht einfach umgestylt** werden.

 Es soll sich wie eine neue Generation des Projekts anfühlen.

---

 # 3\. Hauptziel

 Der Nutzer soll die Website öffnen und sofort verstehen:

 > „Hier kann ich Geografie spielen.“

 Nicht:

 > „Hier muss ich zuerst ein kompliziertes Quiz konfigurieren.“

 Die Anwendung soll schnell, visuell und intuitiv funktionieren.

---

 # 4\. Grundprinzip der Benutzeroberfläche

 Keine komplizierten Konfigurationsseiten.

 Keine 20 Checkboxen vor jedem Quiz.

 Keine riesigen Einstellungsdialoge.

 Stattdessen:

```
Was möchtest du spielen?

🎯 Quiz

🏳️ Flaggen

🏙️ Städte

🗺️ Karten

📸 Bilder

📚 Lernen
```

 Innerhalb der Kategorien können weitere Inhalte angeboten werden.

 Die Komplexität soll möglichst im Hintergrund liegen.

---

 # 5\. Hauptkategorien

 Die Anwendung soll langfristig folgende große Bereiche besitzen.

 ## 🌍 Länder

 - Länder erkennen
- Länderwissen
- Flaggen
- Hauptstädte
- Einwohnerzahlen
- Fläche
- Währung
- Amtssprache
- Kontinent
- Region
- Nachbarländer
- Nationaltier
- typische Gerichte / typische Küche
- Internetdomain
- Telefonvorwahl
- ISO-Codes
- höchster Berg
- wichtige Flüsse
- wichtige Seen
- Inseln
- Nationalparks
- Sehenswürdigkeiten
- bekannte Städte

---

 ## 🏳️ Flaggen

 - Länderflaggen
- Bundesländer
- Kantone
- Provinzen
- Regionen
- Gebiete
- Städte
- historische Flaggen, sofern sinnvoll

 Spielarten:

 - Flagge → Land
- Land → Flagge
- Flagge → Region
- Flagge → Karte
- Eintippen
- Multiple Choice
- ähnliche Flaggen
- Flaggen vergleichen

---

 ## 🏛️ Hauptstädte

 - Land → Hauptstadt
- Hauptstadt → Land
- Hauptstadt auf Karte
- Hauptstadt anhand von Bild erkennen
- Hauptstadt anhand von Einwohnerzahl/Informationen erkennen

---

 ## 🏙️ Städte

 Für jedes Land sollen möglichst die wichtigsten Städte vorhanden sein.

 Als Basis können beispielsweise die 25 größten bzw. relevantesten Städte eines Landes verwendet werden.

 Daten:

 - Name
- Land
- Region
- Bundesland/Kanton/Provinz
- Einwohnerzahl
- Koordinaten
- Sehenswürdigkeiten
- Bilder
- gegebenenfalls Stadtflagge/Wappen
- weitere interessante Informationen

 Quizarten:

 - Stadt → Land
- Stadt → Region
- Stadt auf Karte
- Stadt anhand Bild
- Einwohnerzahl
- größte Städte
- Reihenfolgen
- Zuordnungen

---

 # 6\. Administrative Regionen

 Unterstütze unterschiedliche administrative Ebenen.

 Beispielsweise:

```
Deutschland
└── Bundesländer
    └── Landkreise / kreisfreie Städte

Schweiz
└── Kantone

Österreich
└── Bundesländer

USA
└── Bundesstaaten

Frankreich
└── Regionen / Départements
```

 Das Datenmodell darf nicht auf Deutschland beschränkt sein.

 Es muss international erweiterbar sein.

---

 # 7\. Gewässer

 Eigene Kategorie:

 🌊 Gewässer

 Enthalten können sein:

 - Flüsse
- Seen
- Meere
- Ozeane
- Buchten
- Kanäle
- Meerengen
- Wasserfälle

 Quizarten:

 - Gewässer erkennen
- Land zuordnen
- Karte
- Verlauf erkennen
- Bild erkennen
- mehrere Länder zuordnen

---

 # 8\. Berge und Natur

 🏔️ Natur

 Kategorien:

 - Berge
- Gebirge
- Vulkane
- Pässe
- Täler
- Wüsten
- Inseln
- Halbinseln
- Nationalparks

 Beispielsweise:

 > „In welchem Land liegt dieser Berg?“

 > „Zu welchem Gebirge gehört er?“

 > „Welcher Berg ist auf dem Bild zu sehen?“

---

 # 9\. Sehenswürdigkeiten

 Eine besonders wichtige Kategorie.

 🏛️ Sehenswürdigkeiten

 Beispiele:

 - bekannte Gebäude
- Denkmäler
- Türme
- Burgen
- Schlösser
- Brücken
- religiöse Bauwerke
- historische Orte
- Natursehenswürdigkeiten
- Wahrzeichen

 Jede Sehenswürdigkeit soll möglichst mit folgenden Informationen gespeichert werden:

```
Name
Land
Stadt
Region
Typ
Beschreibung
Koordinaten
Bilder
Quellen
Lizenzinformationen
```

---

 # 10\. Bilderquiz

 Ein zentraler Spielmodus:

 📸 „Was siehst du?“

 Das Bild kann beispielsweise zeigen:

 - Sehenswürdigkeit
- Stadt
- Landschaft
- Berg
- Fluss
- See
- Gebäude
- Wahrzeichen
- Flagge

 Der Nutzer kann anschließend gefragt werden:

 ### Was ist es?

```
Bild
↓
Sehenswürdigkeit erraten
```

 ### Wo ist es?

```
Bild
↓
Stadt erraten
```

 ### In welchem Land?

```
Bild
↓
Land erraten
```

 ### Auf welchem Kontinent?

```
Bild
↓
Kontinent erraten
```

 Dasselbe Objekt soll dadurch für verschiedene Fragetypen verwendbar sein.

---

 # 11\. Allgemeines Länderwissen

 Jedes Land bekommt einen strukturierten Datensatz.

 Beispiel:

```
Deutschland

Hauptstadt:
Berlin

Einwohner:
...

Fläche:
...

Währung:
Euro

Amtssprache:
Deutsch

Kontinent:
Europa

Region:
Mitteleuropa

Nationaltier:
...

Typische Küche:
...

Internetdomain:
.de

Telefonvorwahl:
+49

ISO:
DE / DEU

Nachbarländer:
...

Höchster Berg:
...

Wichtige Flüsse:
...

Wichtige Seen:
...

Nationalparks:
...

Sehenswürdigkeiten:
...
```

 Nicht jedes Land muss für jede Eigenschaft zwingend einen Wert besitzen.

 Keine Daten erfinden.

---

 # 12\. Nationalessen / typische Küche

 Verwende im Datenmodell vorzugsweise:

```
typical_foods
```

 statt ausschließlich:

```
national_food
```

 weil nicht jedes Land ein offiziell festgelegtes Nationalgericht besitzt.

 Wenn etwas lediglich kulturell als typisch gilt, soll es entsprechend gekennzeichnet werden.

---

 # 13\. Kfz-Kennzeichen

 Neue große Kategorie:

 🚗 Kennzeichen

 Zunächst besonders umfangreich:

 🇩🇪 Deutschland

 Danach international erweiterbar.

 Deutschland:

 - Kennzeichen
- zugehörige Stadt
- Landkreis
- kreisfreie Stadt
- Bundesland
- gegebenenfalls historische Kennzeichen

 Beispiele:

```
B → Berlin
M → München
K → Köln
HH → Hamburg
D → Düsseldorf
```

 Quizarten:

 ### Kennzeichen → Ort

```
B

Woher kommt dieses Kennzeichen?
```

 ### Ort → Kennzeichen

```
München

Welches Kennzeichen gehört dazu?
```

 ### Eintippen

```
M

Welcher Ort?
```

 ### Karte

```
Zeige das Gebiet des Kennzeichens auf der Karte.
```

 Das Datenmodell muss internationale Erweiterungen ermöglichen:

```
Deutschland
Österreich
Schweiz
Frankreich
Italien
Spanien
USA
Kanada
...
```

 Deutschland darf technisch keine Sonderbehandlung benötigen.

---

 # 14\. Quizsystem

 Das Quizsystem muss universell sein.

 Nicht für jede Kategorie ein komplett eigenes Quizsystem programmieren.

 Grundstruktur:

```
Question
├── category
├── type
├── question
├── answer
├── options
├── media
├── location
├── difficulty
└── metadata
```

 Beispielsweise:

```
category: landmarks
type: image_to_city
```

 oder:

```
category: flags
type: flag_to_country
```

 oder:

```
category: license_plates
type: code_to_city
```

 Dadurch können neue Kategorien einfach ergänzt werden.

---

 # 15\. Quizarten

 Mindestens:

 - Multiple Choice
- Eintippen
- Karte anklicken
- Zuordnen
- Bild erkennen
- Reihenfolge
- Wahr/Falsch
- Lernen/Flashcard

 Nicht jede Kategorie muss jeden Fragetyp unterstützen.

 Die App soll automatisch passende Fragetypen auswählen.

---

 # 16\. Einfacher Quizstart

 Beispiel:

```
🎯 Quiz

Was möchtest du spielen?

[ Länder ]

[ Flaggen ]

[ Städte ]

[ Hauptstädte ]

[ Gewässer ]

[ Berge ]

[ Sehenswürdigkeiten ]

[ Kennzeichen ]

[ Gemischt ]
```

 Danach möglichst direkt ins Spiel.

 Optional kann ein kleiner Filter vorhanden sein:

```
🌍 Welt
🇪🇺 Europa
🇩🇪 Deutschland
```

 Keine komplizierte Quiz-Konfiguration.

---

 # 17\. Gemischter Modus

 Ein „Gemischt“-Modus soll Fragen aus mehreren Kategorien kombinieren.

 Beispiel:

```
1. 🇯🇵 Welche Flagge ist das?

2. 🏛 Was ist die Hauptstadt von Kanada?

3. 📸 Welche Sehenswürdigkeit ist das?

4. 🚗 Welcher Ort gehört zum Kennzeichen B?

5. 🌊 Welcher Fluss ist hier markiert?
```

 Das soll das eigentliche „Geografie-Spiel“-Gefühl erzeugen.

---

 # 18\. Lernmodus

 📚 Lernen

 Der Nutzer kann Daten entspannt entdecken.

 Beispiel:

```
🇮🇹 Italien

Hauptstadt
Rom

Währung
Euro

Amtssprache
Italienisch

Einwohner
...

Typische Küche
...

Sehenswürdigkeiten
...
```

 Danach kann direkt eine Frage zu diesem Inhalt gestellt werden.

 Lernen und Spielen sollen miteinander verbunden sein.

---

 # 19\. Spaced Repetition

 Das System soll automatisch erkennen, welche Inhalte der Nutzer gut oder schlecht kennt.

 Status beispielsweise:

```
new
learning
familiar
mastered
```

 Falsch beantwortete Fragen sollen später häufiger erscheinen.

 Richtig beantwortete Fragen können seltener erscheinen.

 Der Nutzer muss den Algorithmus nicht konfigurieren.

---

 # 20\. XP und Level

 XP und Level sind Bestandteil des Spiels.

 XP gibt es beispielsweise für:

 - richtige Antworten
- schwierige Fragen
- Quizrunden
- neue Inhalte
- Lernfortschritt
- Quests
- Achievements

 Beispiel:

```
LEVEL 18

3.420 / 4.000 XP
██████████████░░░
```

 Keine käuflichen XP.

 Keine Energie.

 Keine Herzen.

 Keine Pay-to-win-Mechanik.

---

 # 21\. Achievements

 Beispiele:

```
🏆 Flaggenmeister
Erkenne 500 Flaggen.

🌍 Weltreisender
Spiele Fragen aus allen Kontinenten.

🏙 Großstadtkenner
Erkenne 25 Großstädte.

📸 Bilderprofi
Erkenne 100 Sehenswürdigkeiten.

🚗 Kennzeichenexperte
Erkenne 100 deutsche Kennzeichen.

🗺 Kartograph
Schließe 50 Kartenfragen ab.
```

 Achievements sollen automatisch vergeben werden.

---

 # 22\. Quest-System

 Quests sollen eine zusätzliche Motivation darstellen.

 Beispiele:

```
📜 QUESTS

□ 10 Flaggen richtig erkennen
□ 5 Hauptstädte erkennen
□ 3 Städte auf der Karte finden
□ 5 Sehenswürdigkeiten erkennen
□ 10 deutsche Kennzeichen erkennen
```

 Langzeitquests:

```
🌍 EUROPA-EXPEDITION

42 / 50 Länder
████████████████░░

🇩🇪 DEUTSCHLAND-KENNER

✓ 16 Bundesländer
✓ Landesflaggen
✓ Landeshauptstädte
□ Top-25-Städte
□ Flüsse
□ Seen
□ Sehenswürdigkeiten
```

 Quests dürfen nicht zwingend täglich erfüllt werden müssen.

 Sie sollen zusätzliche Ziele anbieten.

---

 # 23\. Sammlung / Fortschritt

 Der Nutzer soll seine Entdeckung sehen können.

 Beispiel:

```
Meine Welt

🌍 Länder
██████████░░ 72 %

🏳️ Flaggen
███████████░ 81 %

🏙️ Städte
██████░░░░░ 44 %

🌊 Gewässer
████░░░░░░░ 31 %

🏔️ Natur
███░░░░░░░░ 25 %

📸 Sehenswürdigkeiten
██████░░░░░ 48 %

🚗 Kennzeichen
████░░░░░░░ 27 %
```

---

 # 24\. Profil

 Profile sollen individuell gestaltbar sein.

 Möglichkeiten:

 - Benutzername
- Avatar
- Profilfarbe
- Hintergrund
- Rahmen
- Titel
- ausgewählte Achievements
- Lieblingskategorie
- Banner

 Beispiel:

```
┌────────────────────────────────┐
│                                │
│             AVATAR             │
│                                │
│             GeoMax             │
│             Level 24           │
│                                │
│       🌍 Europa-Experte        │
│                                │
│     🏆 🏆 🏆 🏆 🏆            │
│                                │
└────────────────────────────────┘
```

---

 # 25\. Gastmodus

 Die Website muss ohne Account vollständig nutzbar sein.

 Gast kann:

 - Quiz spielen
- lernen
- Karten nutzen
- Bilderquiz spielen
- Kennzeichen spielen
- lokale Einstellungen verwenden

 Account bietet zusätzlich:

 - Cloud-Synchronisierung
- Fortschritt
- Achievements
- Quests
- Profil
- Statistiken
- geräteübergreifende Speicherung

 Der Nutzer darf nicht gezwungen werden, sich vor dem ersten Spiel zu registrieren.

---

 # 26\. Datenschutz

 Die Anwendung muss technisch datensparsam aufgebaut werden.

 Insbesondere bei personenbezogenen Daten:

 - nur notwendige Daten speichern
- private und öffentliche Profildaten trennen
- Zugriff serverseitig kontrollieren
- keine unnötigen Trackingdienste
- keine unnötigen personenbezogenen Logs
- sichere Authentifizierung
- sichere Sessions
- HTTPS
- Datenbankzugriff absichern
- Eingaben validieren
- Rate Limiting
- Schutz vor XSS
- Schutz vor Injection
- Secrets niemals im Frontend

 Die konkrete rechtliche DSGVO-Prüfung und die endgültigen Rechtstexte müssen vor einem produktiven Launch anhand des tatsächlichen Hostings und der verwendeten Dienste geprüft werden.

---

 # 27\. Datenschutzfunktionen

 Implementiere konzeptionell:

```
Datenschutzerklärung
Impressum
Nutzungsbedingungen
Cookie-/Consent-Einstellungen, falls erforderlich
```

 Zusätzlich:

```
Mein Konto

[ Meine Daten exportieren ]
[ Profil öffentlich/privat ]
[ Account löschen ]
```

 Account-Löschung muss echte Löschung bzw. die gesetzlich erforderliche Behandlung der Daten auslösen.

---

 # 28\. Öffentliche Profile

 Optional:

```
geoquiz.example/u/GeoMax
```

 Öffentlich können angezeigt werden:

 - Benutzername
- Avatar
- Level
- XP, sofern gewünscht
- ausgewählte Achievements
- ausgewählte Statistiken

 Nie öffentlich:

 - E-Mail-Adresse
- Passwort
- interne Auth-Daten
- private Daten

 Der Nutzer entscheidet selbst, ob sein Profil öffentlich ist.

---

 # 29\. Quiz-Vorschläge

 Die Website braucht ein Formular:

 💡 „Quiz vorschlagen“

 Beispiel:

```
Quiz vorschlagen

Titel
[________________]

Kategorie
[________________]

Beschreibung
[________________]

Welche Fragen könnte das Quiz enthalten?

[________________]
[________________]

E-Mail (optional)
[________________]

[ Vorschlag senden ]
```

 Nach Absenden:

```
✓ Danke!

Dein Vorschlag wurde gesendet.
```

 Der Vorschlag wird serverseitig validiert und an eine definierte Administrations-E-Mail weitergeleitet.

 Keinen E-Mail-Versand mit geheimen API-Schlüsseln im Frontend implementieren.

 Für die GitHub-Pages-Version darf der Mailversand zunächst als vorbereitete Funktion bzw. über einen später anzuschließenden Backend-Endpunkt vorgesehen werden.

---

 # 30\. Datenarchitektur

 Statische Geografie-Daten sollen möglichst lokal verfügbar sein.

 Externe Datenquellen werden hauptsächlich für Import und Aktualisierung verwendet.

 Empfohlene Quellen:

 - Wikidata
- GeoNames
- Natural Earth
- Wikimedia Commons
- weitere seriöse bzw. offizielle Quellen für spezielle Daten

 Nicht jede Quizfrage soll live eine externe API aufrufen.

---

 # 31\. Lokale Daten

 Beispielsweise:

```
/data
├── countries
├── flags
├── regions
├── cities
├── capitals
├── rivers
├── lakes
├── mountains
├── landmarks
├── national-parks
├── license-plates
└── media
```

 Die Daten sollen versionierbar sein.

 Keine riesigen unstrukturierten JSON-Dateien erzeugen.

 Bei Bedarf Daten nach Kategorien oder Regionen aufteilen und lazy laden.

---

 # 32\. Datenimport

 Erstelle Import-Scripts:

```
/scripts
├── import-wikidata
├── import-geonames
├── import-natural-earth
├── import-wikimedia
├── import-license-plates
├── validate-data
└── update-data
```

 Datenpipeline:

```
Externe Quelle
      ↓
Import
      ↓
Normalisierung
      ↓
Validierung
      ↓
lokaler Datensatz
      ↓
Website
```

 Jeder Datensatz soll nach Möglichkeit seine Quelle und Aktualisierungszeit speichern.

 Keine Fakten erfinden.

 Bei widersprüchlichen Quellen sollen Konflikte markiert werden.

---

 # 33\. Bilder

 Für Bilder müssen Nutzungsrechte berücksichtigt werden.

 Keine Bilder einfach von Google Images herunterladen.

 Speichere:

```
image
├── URL
├── source
├── author
├── license
├── attribution
└── object_id
```

 Wikimedia Commons kann für viele Inhalte als Quelle dienen.

 Bilder sollen möglichst optimiert und performant geladen werden.

---

 # 34\. Technische Architektur – Phase 1

 Die erste Version läuft auf GitHub Pages.

 Empfohlener Stack:

```
React
TypeScript
Vite
Tailwind CSS
```

 Die erste Version muss als statische Anwendung gebaut werden.

 Keine zwingende Backend-Abhängigkeit.

 Gastmodus funktioniert vollständig lokal.

 Lokaler Fortschritt kann zunächst beispielsweise über LocalStorage/IndexedDB gespeichert werden.

---

 # 35\. Technische Architektur – Phase 2

 Später soll die Anwendung auf eine echte Domain umziehen.

 Backend:

```
Supabase
```

 Verwendung:

 - PostgreSQL
- Authentication
- Row Level Security
- Benutzerprofile
- Fortschritt
- Achievements
- Quests
- Statistiken
- Favoriten
- Cloud-Synchronisierung
- gegebenenfalls Storage
- Edge Functions

 Die Anwendung muss so strukturiert sein, dass der Wechsel:

```
LocalStorage
      ↓
Supabase
```

 ohne kompletten Rewrite möglich ist.

 Dafür eine eigene Datenzugriffsschicht verwenden.

 Beispielsweise:

```
services/
├── auth
├── progress
├── quiz
├── profile
├── achievements
└── data
```

 Die UI darf nicht direkt überall auf LocalStorage oder Supabase zugreifen.

---

 # 36\. Domain

 In Phase 1:

```
username.github.io/...
```

 bzw. die von GitHub Pages bereitgestellte URL.

 Später:

```
geoquiz.de
```

 oder eine andere eigene Domain.

 Die Anwendung darf keine URLs hart codieren.

 Verwende eine konfigurierbare Base URL.

---

 # 37\. Deployment

 Das Projekt soll einen einfachen Deployment-Prozess besitzen.

 Beispielsweise:

```
Git push
   ↓
GitHub Actions
   ↓
Build
   ↓
Deploy GitHub Pages
```

 Der Build muss automatisch funktionieren.

 Keine manuelle Dateikopiererei.

---

 # 38\. Späterer Domain-Wechsel

 Beim Umzug auf die eigene Domain müssen möglichst nur:

 - DNS
- Hosting-Konfiguration
- Environment Variables
- Auth-Redirects

 angepasst werden.

 Die Anwendung selbst soll nicht auf die GitHub-Pages-URL angewiesen sein.

---

 # 39. Responsive Design

 Mobile First.

 Die Anwendung muss auf:

 - Smartphone
- Tablet
- Laptop
- Desktop

 funktionieren.

 Mobile:

 - große Flaggen
- große Antwortbuttons
- Touch-freundlich
- einfache Navigation
- Bottom Navigation

 Desktop:

 - größere Quizkarten
- mehr Platz für Karten und Bilder
- sinnvolle Mehrspaltenlayouts

---

 # 40\. Design

 Das Design soll komplett neu sein.

 Richtung:

 - modern
- hochwertig
- minimalistisch
- geografisch
- spielerisch
- nicht kindisch
- nicht wie ein Schulportal
- nicht wie ein SaaS-Dashboard

 Die Welt und die Karten sollen visuell eine große Rolle spielen.

 Farbwelt beispielsweise:

 - Off-White
- dunkles Blau/Indigo
- dezentes Grün
- warmes Gelb
- Rot für Fehler

 Keine übermäßigen Farbverläufe.

 Keine unnötigen Glaseffekte.

---

 # 41\. Startseite

 Beispiel:

```
🌍 GEOQUIZ

Entdecke die Welt.
Teste dein Wissen.

──────────────────────────────

🎯 Quiz

🏳️ Flaggen

🏙️ Städte

🗺️ Karten

📸 Bilder

📚 Lernen

🚗 Kennzeichen

──────────────────────────────

🔥 Deine Serie
⭐ Level 18
🏆 34 Achievements

[ Weiterspielen ]
```

 Bei einem neuen Gast:

```
🌍 GEOQUIZ

Wie gut kennst du die Welt?

[ Jetzt spielen ]
```

---

 # 42\. Quizoberfläche

 Während einer Frage nur das Wesentliche:

```
← Beenden

          7

        🇩🇪

Welche Flagge ist das?

┌──────────────┐
│ Deutschland  │
└──────────────┘

┌──────────────┐
│ Belgien      │
└──────────────┘

┌──────────────┐
│ Österreich   │
└──────────────┘

┌──────────────┐
│ Ungarn       │
└──────────────┘
```

 Keine überfüllte Benutzeroberfläche.

---

 # 43\. Quizfeedback

 Richtig:

```
✓ Richtig!

Deutschland

+10 XP
```

 Falsch:

```
✕ Nicht ganz

Deutschland wäre richtig gewesen.

+2 XP
```

 Feedback kurz halten.

---

 # 44\. Rundenende

```
Runde beendet 🎉

8 / 10 richtig

80 %

+92 XP

────────────────

🏆 Neues Achievement
„Europa-Kenner“

────────────────

[ Noch einmal ]

[ Fehler wiederholen ]

[ Weiter ]
```

---

 # 45\. Fortschritt

```
Mein Fortschritt

🌍 Länder
683 / 195

🏳️ Flaggen
683 / 1071

🏙️ Städte
342

🌊 Gewässer
128

🏔️ Berge
97

📸 Sehenswürdigkeiten
214

🚗 Kennzeichen
87
```

 Die Zahlen müssen aus den tatsächlichen Daten stammen.

---

 # 46\. Performance

 Die Anwendung soll auch bei großen Datenmengen schnell bleiben.

 Beachte:

 - Lazy Loading
- Code Splitting
- komprimierte Assets
- optimierte Bilder
- effiziente JSON-Strukturen
- Caching
- Virtualisierung bei langen Listen
- keine unnötigen Re-Renders

 Große Datenbestände nicht beim initialen Laden komplett in den Browser laden, wenn dies nicht erforderlich ist.

---

 # 47\. Accessibility

 Beachte:

 - ausreichende Kontraste
- Tastaturbedienung
- Fokuszustände
- Screenreader
- sinnvolle ARIA Labels
- Touch-Ziele
- `prefers-reduced-motion`

 Informationen niemals ausschließlich durch Farbe vermitteln.

---

 # 48\. Dark Mode

 Unterstütze:

```
Hell
Dunkel
System
```

 Die Einstellung wird lokal gespeichert und später optional mit dem Account synchronisiert.

---

 # 49\. Internationalisierung

 Die erste Sprache:

 Deutsch.

 Architektur für spätere Sprachen vorbereiten.

 Beispielsweise:

```
/locales
├── de
├── en
└── ...
```

 Keine Benutzeroberflächentexte unnötig hart im Code verteilen.

---

 # 50\. Erweiterbarkeit

 Das wichtigste technische Prinzip:

 Neue Datenkategorien müssen ohne kompletten Umbau hinzugefügt werden können.

 Beispiel:

 Heute:

```
Flaggen
Länder
Städte
Gewässer
Berge
Sehenswürdigkeiten
Kennzeichen
```

 Später:

```
Flughäfen
Inseln
Nationalparks
Burgen
Schlösser
UNESCO-Welterbestätten
Währungen
Sprachen
typische Gerichte
Tiere
historische Gebiete
```

 Die Quiz-Engine soll diese Kategorien möglichst automatisch unterstützen.

---

 
51. COOKIES UND TRACKING

Tracking soll grundsätzlich vermieden werden, wenn es für die Funktion der Anwendung nicht erforderlich ist.

Keine unnötigen:

    Analytics-Dienste

    Werbetracker

    Social-Media-Tracker

    Fingerprinting-Technologien

    Drittanbieter-Skripte

einbauen.

Wenn später Analysefunktionen benötigt werden, muss vorher geprüft werden:

    welche Daten verarbeitet werden

    welcher Dienst eingesetzt wird

    ob personenbezogene Daten übertragen werden

    welche Rechtsgrundlage besteht

    ob eine Einwilligung erforderlich ist

    wie ein Widerruf umgesetzt wird

Die Anwendung soll möglichst viele Funktionen ohne Tracking anbieten.
52. SICHERHEIT

Personenbezogene Daten müssen besonders geschützt werden.

Mindestens berücksichtigen:

    HTTPS

    sichere Authentifizierung

    sichere Sessions

    Row Level Security

    serverseitige Autorisierung

    Eingabevalidierung

    XSS-Schutz

    SQL-Injection-Schutz

    CSRF-Schutz, sofern relevant

    Rate Limiting

    Spam-Schutz

    sichere API-Endpunkte

    keine Secrets im Frontend

    keine Passwörter im Klartext

    keine sensiblen Informationen in Logs

    sichere Passwort-Reset-Prozesse

    E-Mail-Verifizierung, sofern verwendet

    Session-Invalidierung nach Account-Löschung

Besonders wichtig:

Ein Nutzer darf niemals durch manipulierte Requests auf die Daten eines anderen Nutzers zugreifen können.
53. GASTMODUS

Die komplette Kernanwendung soll ohne Account funktionieren.

Ein Gast kann:

    Quiz spielen

    Flaggen lernen

    Länder erkunden

    Karten verwenden

    Städte entdecken

    Sehenswürdigkeiten ansehen

    Kennzeichen lernen

    Bilderquiz spielen

Ein Account ist optional.

Nach einer Runde kann beispielsweise dezent darauf hingewiesen werden:

────────────────────────────

Dein Ergebnis wurde lokal gespeichert.

Mit einem kostenlosen Account kannst du
deinen Fortschritt auf mehreren Geräten
synchronisieren.

[ Account erstellen ]

[ Später ]

Der Nutzer darf nicht gezwungen werden, sich zu registrieren.
54. LOKALER FORTSCHRITT OHNE ACCOUNT

Auch Gastnutzer sollen Fortschritt erhalten können.

Verwende dafür beispielsweise:

    LocalStorage

    IndexedDB

Je nach Datenmenge.

Gespeichert werden können:

    lokale XP

    lokale Quizstatistiken

    zuletzt gespielte Kategorien

    Lernfortschritt

    Favoriten

    schwierige Fragen

Keine unnötigen personenbezogenen Daten.

Wenn der Nutzer später einen Account erstellt, kann der lokale Fortschritt optional mit dem Account zusammengeführt werden.
55. DATENMIGRATION BEIM REGISTRIEREN

Wenn ein Gast einen Account erstellt:

Gast
 ↓
lokaler Fortschritt
 ↓
Account erstellen
 ↓
Daten übernehmen
 ↓
mit Server synchronisieren

Vorhandener Fortschritt darf dabei nicht einfach verschwinden.

Der Nutzer soll erkennen können:

Dein bisheriger Fortschritt wurde übernommen.
+ 2.430 XP
+ 14 Achievements
+ 8 Lernfortschritte

56. OFFLINE-FÄHIGKEIT

Die Anwendung soll so weit wie sinnvoll offline funktionieren.

Bereits geladene Inhalte können verfügbar bleiben.

Beispielsweise:

Offline:

✓ bereits geladene Flaggen
✓ bereits geladene Länder
✓ Quizfragen
✓ lokaler Fortschritt

Nicht verfügbar:

✕ Account-Synchronisierung
✕ neue Daten
✕ E-Mail-Versand

Nach Wiederherstellung der Verbindung soll die Synchronisierung automatisch erfolgen.

Konflikte sollen sicher behandelt werden.
57. PERFORMANCE

Die Website muss auch bei einer großen Datenmenge schnell bleiben.

Nicht alle Daten und Bilder beim ersten Laden herunterladen.

Verwende:

    Lazy Loading

    Code Splitting

    Caching

    komprimierte Daten

    optimierte Bilder

    WebP/AVIF, sofern sinnvoll

    virtuelle Listen bei großen Datenmengen

    dynamisches Nachladen

    CDN für geeignete Assets

Beispielsweise soll beim Öffnen des Flaggenquiz nicht die komplette Datenbank mit allen Bergen, Städten und Sehenswürdigkeiten geladen werden.
58. MOBILE FIRST

Die mobile Version ist kein nachträglicher Zusatz.

Das Design muss von Anfang an auf Smartphones funktionieren.

Quizfragen sollen mit einer Hand bedienbar sein.

Beispiel:

┌─────────────────────────┐
│ ← Flaggen       4 / 10  │
│                         │
│                         │
│          🇫🇷             │
│                         │
│     Welche Flagge?      │
│                         │
│ ┌─────────────────────┐ │
│ │ A) Frankreich       │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ B) Italien          │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ C) Belgien          │ │
│ └─────────────────────┘ │
│                         │
└─────────────────────────┘

59. DESKTOP

Desktop soll nicht einfach eine vergrößerte Mobile-Version sein.

Nutze den größeren Platz sinnvoll.

Beispielsweise:

┌──────────────────────────────────────────────┐
│ 🌍 GEOQUIZ     Spielen Entdecken Lernen Profil│
├──────────────────────────────────────────────┤
│                                              │
│                🇯🇵                            │
│                                              │
│          Welche Flagge ist das?              │
│                                              │
│       ┌────────┐       ┌────────┐            │
│       │ Japan  │       │ China  │            │
│       └────────┘       └────────┘            │
│                                              │
│       ┌────────┐       ┌────────┐            │
│       │ Korea  │       │ Laos   │            │
│       └────────┘       └────────┘            │
│                                              │
└──────────────────────────────────────────────┘

60. ACCESSIBILITY

Die Anwendung soll möglichst barrierearm sein.

Beachten:

    ausreichende Farbkontraste

    Tastaturnavigation

    sichtbare Fokuszustände

    sinnvolle HTML-Semantik

    ARIA nur dort, wo notwendig

    verständliche Labels

    Screenreader-Unterstützung

    Touchflächen mit ausreichender Größe

    keine Informationen ausschließlich über Farben

    reduzierte Animationen bei prefers-reduced-motion

Auch Quizfragen müssen ohne Maus beantwortbar sein, soweit der Fragentyp dies ermöglicht.
61. DARK MODE

Unterstütze:

☀ Hell
🌙 Dunkel
⚙ System

Die Auswahl soll gespeichert werden.

Dark Mode darf nicht einfach nur Schwarz statt Weiß verwenden.

Nutze ein eigenes Farbsystem für:

    Hintergrund

    Karten

    Text

    sekundären Text

    Borders

    Akzentfarben

    richtige Antworten

    falsche Antworten

62. SPRACHEN

Startsprache:

Deutsch.

Die Architektur soll von Anfang an Internationalisierung unterstützen.

Später:

🇩🇪 Deutsch
🇬🇧 English
🇫🇷 Français
🇪🇸 Español
...

Alle UI-Texte sollen über ein Übersetzungssystem laufen.

Nicht:

<button>Quiz starten</button>

an hunderten Stellen.

Sondern beispielsweise:

t("quiz.start")

Dadurch kann später problemlos eine weitere Sprache ergänzt werden.
63. SUCHFUNKTION

Bei der Größe der Plattform ist eine globale Suche sinnvoll.

Beispiel:

🔎 Suche

Berlin

Ergebnisse:

🏙️ Berlin
🇩🇪 Deutschland
🏛️ Brandenburger Tor
🚗 B

Oder:

🔎 Suche

Rhein

Ergebnisse:

🌊 Rhein
🇩🇪 Deutschland
🇫🇷 Frankreich
🇨🇭 Schweiz

Die Suche soll Kategorien anzeigen.
64. ENTDECKEN-BEREICH

Neben „Spielen“ soll es einen Bereich Entdecken geben.

Hier kann der Nutzer einfach durch die Welt stöbern.

Beispielsweise:

Entdecken

🌍 Europa
  Deutschland
  Frankreich
  Italien
  ...

🌏 Asien
  Japan
  China
  Indien
  ...

🌎 Amerika
  Kanada
  USA
  Brasilien

Oder:

Entdecken

🏙️ Größte Städte
🌊 Längste Flüsse
🏔️ Höchste Berge
🏝️ Größte Inseln
🏛️ Berühmte Sehenswürdigkeiten
🚗 Deutsche Kennzeichen

Dieser Bereich ist nicht zwingend ein Quiz.

Er dient zum freien Erkunden.
65. LANDSEITE

Die Seite eines Landes soll wie ein kleiner interaktiver Steckbrief aufgebaut sein.

Beispiel:

🇩🇪 Deutschland

Europa

[ Karte ]

84,7 Mio.
Einwohner

357.000 km²
Fläche

Berlin
Hauptstadt

Euro
Währung

Deutsch
Amtssprache

Danach:

Flagge

Hauptstadt

Bundesländer

Top-Städte

Flüsse

Seen

Gebirge

Sehenswürdigkeiten

Typische Küche

Nationaltier

Kennzeichen

Jeder Bereich kann angeklickt werden.
66. REGIONSEITE

Das gleiche Prinzip soll für Regionen funktionieren.

Beispiel:

Bayern

🇩🇪 Deutschland

13,4 Mio. Einwohner

München
Hauptstadt

[ Karte ]

Flagge

Städte

Seen

Flüsse

Gebirge

Sehenswürdigkeiten

Kennzeichen

67. STADTSEITE

Beispiel:

🏙️ München

Bayern
Deutschland

[ Bild ]

1,6 Mio. Einwohner

────────────────

📍 Lage

🗺️ Karte

🏛️ Sehenswürdigkeiten

🚗 Kennzeichen

🌊 Gewässer

🏔️ Umgebung

────────────────

[ München spielen ]

68. SEHENSWÜRDIGKEITSSEITE

Beispiel:

🏛️ Brandenburger Tor

Berlin
Deutschland

[ großes Bild ]

Das Brandenburger Tor ...

────────────────

📍 Berlin
🇩🇪 Deutschland

[ Auf Karte zeigen ]

[ Bildquiz starten ]

Bildquelle und Lizenzinformationen sollen zugänglich sein.
69. KENNZEICHENSEITE

Beispiel:

🚗 B

Berlin

Deutschland

[ Karte ]

Kennzeichen:
B

Gebiet:
Berlin

────────────────

Quiz:

[ B → Stadt ]

[ Stadt → Kennzeichen ]

[ Karte → Kennzeichen ]

70. QUIZMODUS „LERNEN“

Der Lernmodus darf nicht wie ein normales Quiz aussehen.

Beispiel:

📚 Lernen

🇮🇹

ITALIEN

Hauptstadt
Rom

Währung
Euro

Amtssprache
Italienisch

Einwohner
...

Typische Küche
...

Nationaltier
...

────────────────

[ Als gelernt markieren ]

[ Weiter ]

Danach kann optional eine Frage erscheinen.
71. SCHWIERIGKEIT

Die Plattform soll nicht zwingend einen großen Schwierigkeitsregler anzeigen.

Die Schwierigkeit kann intern bestimmt werden.

Beispielsweise:

Einsteiger
↓
Fortgeschritten
↓
Experte

Sie ergibt sich aus:

    Bekanntheit des Objekts

    bisherigen Antworten

    Ähnlichkeit der Antwortmöglichkeiten

    geografischer Bedeutung

    Lernfortschritt

So bleibt die Benutzeroberfläche einfach.
72. ADAPTIVES QUIZ

Das System kann den Nutzer im Hintergrund besser kennenlernen.

Wenn jemand:

Deutschland → 95 %
Frankreich → 90 %
Slowakei → 42 %
Moldau → 18 %

kennt, können schwierige Inhalte häufiger auftauchen.

Nicht als komplizierte Einstellung.

Einfach:

Das System passt die Fragen automatisch an.

73. FEHLERWIEDERHOLUNG

Nach einem Quiz:

2 Fehler

🇸🇰 Slowakei
🇸🇮 Slowenien

Button:

[ Fehler wiederholen ]

Dabei werden genau diese Inhalte erneut abgefragt.
74. FAVORITEN

Nutzer können Inhalte speichern.

Beispielsweise:

♡ Brandenburger Tor
♡ Japan
♡ Alpen
♡ Donau

Im Account:

Meine Favoriten

Gastnutzer können Favoriten lokal speichern.
75. STATISTIKEN

Der Nutzer kann seine eigenen Statistiken sehen.

Beispielsweise:

Deine Statistik

1.842 Fragen beantwortet

1.506 richtig

82 %

────────────────

Flaggen
91 %

Länder
86 %

Städte
73 %

Karten
64 %

Bilder
71 %

Kennzeichen
58 %

Keine globale Rangliste zwingend einbauen.

Der Fokus liegt auf persönlichem Fortschritt.
76. STREAKS

Eine optionale tägliche Lernserie kann existieren.

Beispiel:

🔥 7 Tage

Du hast an 7 Tagen hintereinander
Geografie gelernt.

Die Funktion darf nicht aggressiv oder manipulierend eingesetzt werden.

Kein Bestrafen des Nutzers für das Auslassen eines Tages.
77. TAGESSTART

Optional kann die Startseite für eingeloggte Nutzer eine kleine Empfehlung anzeigen:

🌍 Heute

Du hast gestern viele europäische Flaggen
gelernt.

Heute könnte dich interessieren:

🏙️ Europäische Hauptstädte

[ Starten ]

Das ist eine Empfehlung, kein Zwang.
78. FEEDBACK

Nach Fragen soll Feedback sofort sichtbar sein.

Richtig:

✓ Richtig!

+10 XP

Berlin ist die Hauptstadt Deutschlands.

Falsch:

✕ Nicht ganz.

Richtig wäre:
Berlin

+3 XP für den Versuch

Keine beschämende Sprache.
79. XP-BALANCING

XP-Werte zentral konfigurieren.

Nicht überall harte Zahlen im Code verteilen.

Beispielsweise:

correct_answer = 10 XP
difficult_answer = 20 XP
quiz_completed = 25 XP
quest_completed = 50 XP
achievement = 100 XP

Diese Werte müssen später einfach geändert werden können.
80. LEVELSYSTEM

Das Levelsystem soll eine klare Progression besitzen.

Beispielsweise:

Level 1
0 XP

Level 2
100 XP

Level 3
250 XP

Level 4
450 XP

Die genaue Formel soll zentral definiert sein.

Im Profil:

Level 18

3.420 / 4.000 XP

██████████████░░

81. ACHIEVEMENT-ARCHITEKTUR

Achievements sollen datengetrieben sein.

Beispielsweise:

achievement:
  id: flag_master_500
  type: correct_answers
  category: flags
  threshold: 500

Dadurch können später neue Achievements hinzugefügt werden, ohne die komplette Logik neu zu schreiben.
82. QUEST-ARCHITEKTUR

Das gleiche für Quests.

Beispiel:

quest:
  id: flags_daily
  type: answer_questions
  category: flags
  target: 10
  reward_xp: 50

Unterstütze später:

    Fragen beantworten

    Kategorien spielen

    bestimmte Länder lernen

    bestimmte Regionen entdecken

    bestimmte Achievements erreichen

    bestimmte Genauigkeit erreichen

83. DATENBANKSCHEMA

Beispielsweise:

users
profiles
user_settings
user_progress
quiz_attempts
achievements
user_achievements
quests
user_quests
favorites
learning_items
quiz_sessions

Geografische Daten getrennt:

countries
regions
cities
flags
rivers
lakes
mountains
landmarks
license_plates
media

Beziehungen über IDs.
84. ROW LEVEL SECURITY

Bei einer Datenbank wie Supabase muss RLS konsequent eingesetzt werden.

Beispiel:

user_progress

User A
→ darf eigene Daten lesen
→ darf eigene Daten schreiben

User B
→ darf eigene Daten lesen
→ darf eigene Daten schreiben

User A
→ darf NICHT Daten von User B lesen
→ darf NICHT Daten von User B verändern

Öffentliche Profildaten können über kontrollierte Policies zugänglich gemacht werden.
85. SERVERSEITIGE LOGIK

Sensible Operationen dürfen nicht ausschließlich im Browser stattfinden.

Insbesondere:

    E-Mail-Versand

    Account-Löschung

    privilegierte Datenoperationen

    Admin-Funktionen

    Datenimporte

    geheime API-Schlüssel

müssen serverseitig geschützt werden.
86. ADMIN-BEREICH

Erstelle einen vollständig getrennten Admin-Bereich.

Beispielsweise:

/admin

Nur für autorisierte Administratoren.

Bereiche:

Dashboard
Daten
Quizfragen
Bilder
Quiz-Vorschläge
Benutzer
Reports
System

87. QUIZ-VORSCHLÄGE IM ADMIN-BEREICH

Administratoren sollen Vorschläge sehen:

Quiz-Vorschläge

────────────────────────

„Europäische Flaggen nach Farben“

von User123

Status:
Neu

[ Öffnen ]

────────────────────────

„Deutsche Seen“

von GeoMax

Status:
In Prüfung

Status:

Neu
In Prüfung
Angenommen
Abgelehnt
Umgesetzt

88. FEHLERREPORTS

Nutzer sollen eine Frage melden können.

Beispiel:

⚠ Frage melden

Warum?

○ Antwort scheint falsch
○ Bild falsch zugeordnet
○ Tippfehler
○ Karte falsch
○ Sonstiges

[ Senden ]

Auch dieser Prozess muss serverseitig validiert und gegen Spam geschützt werden.
89. DATENQUALITÄTS-DASHBOARD

Administratoren sollen erkennen können:

Datenqualität

✓ 98,7 % vollständig

⚠ 32 fehlende Bilder
⚠ 18 fehlende Quellen
⚠ 7 widersprüchliche Einwohnerzahlen
⚠ 4 ungültige Koordinaten

Damit kann die Datenbank langfristig gepflegt werden.
90. API-IMPORT

Die externen Quellen werden nicht direkt vom Nutzer verwendet.

Beispiel:

Wikidata
GeoNames
Wikimedia
Natural Earth
      ↓
Import
      ↓
Normalize
      ↓
Validate
      ↓
Own Dataset
      ↓
Application

Importe müssen wiederholbar sein.

Wenn ein Import zweimal ausgeführt wird, dürfen nicht automatisch doppelte Datensätze entstehen.
91. VERSIONIERUNG DER DATEN

Speichere nach Möglichkeit:

source
source_id
last_updated
imported_at

So lässt sich später nachvollziehen, woher ein Datensatz stammt.
92. QUELLENANGABEN

Bei relevanten Informationen soll der Nutzer bei Bedarf die Quelle sehen können.

Beispielsweise:

Einwohner:
84,7 Mio.

Quelle:
Wikidata
Stand: 2026

Nicht jede kleine Information muss die Oberfläche überladen.

Details können über:

ⓘ Quelle

angezeigt werden.
93. RECHTLICHE DATEN

Für rechtliche Seiten keine erfundenen Texte als endgültige Rechtsberatung darstellen.

Struktur vorbereiten für:

/impressum
/datenschutz
/nutzungsbedingungen
/kontakt

Die tatsächlichen Texte müssen anhand des realen Unternehmens-/Betreiber- und Hosting-Setups erstellt bzw. geprüft werden.
94. KONTAKT

Eine Kontaktseite:

Kontakt

Name
[________]

E-Mail
[________]

Betreff
[________]

Nachricht
[________________]

[ Nachricht senden ]

Auch hier:

    serverseitige Verarbeitung

    Spam-Schutz

    Rate Limiting

    sichere E-Mail-Weiterleitung

    keine Secrets im Client

95. FEHLERBEHANDLUNG

Keine technischen Fehler für Nutzer anzeigen.

Nicht:

TypeError: Cannot read properties of undefined

Sondern:

Etwas ist schiefgelaufen.

Bitte versuche es erneut.

[ Erneut versuchen ]

Technische Details nur in geeigneten Logs.
96. LEERZUSTÄNDE

Jede Seite braucht einen sinnvollen Empty State.

Beispiel:

Noch keine Favoriten.

Entdecke ein Land oder eine Sehenswürdigkeit
und speichere sie hier.

[ Entdecken ]

97. LOADING STATES

Während Daten geladen werden:

    Skeletons

    dezente Spinner

    Platzhalter

Keine plötzlich springenden Layouts.
98. QUIZ-SESSION

Eine Quizrunde soll intern als Session behandelt werden.

Beispielsweise:

quiz_session
├── id
├── user_id
├── category
├── mode
├── started_at
├── completed_at
├── questions
├── score
└── xp_earned

Dadurch können Statistiken und Wiederholungen zuverlässig gespeichert werden.
99. ANTI-CHEAT / SPIELINTEGRITÄT

Bei wichtigen XP-/Achievement-Aktionen darf der Client nicht einfach sagen:

giveMe100000XP()

Serverseitige Validierung verwenden, sofern Account-Fortschritt serverseitig gespeichert wird.

Insbesondere:

    XP

    Achievements

    Quest-Abschlüsse

    Statistiken

dürfen nicht ausschließlich vom Client vertrauensvoll gesetzt werden.
100. ABSCHLUSS – PRODUKTZIEL

Die fertige Anwendung soll kein simples Quiz mit vielen Kategorien sein.

Sie soll eine zusammenhängende interaktive Geografieplattform sein.

Der Nutzer kann:

spielen
   ↓
lernen
   ↓
entdecken
   ↓
Fortschritt sammeln
   ↓
Level aufsteigen
   ↓
Achievements freischalten
   ↓
Quests erledigen
   ↓
sein Profil gestalten
   ↓
neue Inhalte entdecken
   ↓
wieder spielen

Die Inhalte sind miteinander verbunden:

🇩🇪 Deutschland
      │
      ├── 🏳️ Flagge
      │
      ├── 🏛️ Berlin
      │      └── 🏛️ Brandenburger Tor
      │
      ├── 🗺️ 16 Bundesländer
      │      └── 🇧🇾 Bayern
      │             └── 🏙️ München
      │                    └── 🚗 M
      │
      ├── 🌊 Rhein
      │
      ├── 🏔️ Alpen
      │
      └── 📸 Sehenswürdigkeiten

Aus diesen Beziehungen generiert die Quizengine automatisch unterschiedliche Spiele:

Flagge → Land
Land → Hauptstadt
Stadt → Land
Stadt → Region
Kennzeichen → Stadt
Bild → Sehenswürdigkeit
Sehenswürdigkeit → Stadt
Fluss → Länder
Berg → Land
Karte → Region
Region → Flagge
Einwohnerzahl → Stadt

Damit wird aus einem einzelnen Flaggenquiz eine Plattform, die theoretisch kontinuierlich um neue geografische Inhalte erweitert werden kann.
101. ENTWICKLUNGSREGEL

Bei jeder Implementierung gilt:

Nicht nur die aktuelle Funktion bauen.

Immer prüfen:

    „Wie kann diese Funktion so gebaut werden, dass später zehn weitere Kategorien und hunderttausende Datensätze damit funktionieren?“

Beispielsweise nicht:

if category === "flags"

an hunderten Stellen.

Sondern eine generische Architektur:

Category
QuestionGenerator
QuestionType
Entity
Relationship
QuizSession
Progress

102. ERWEITERBARKEIT

Neue Kategorie:

🏖️ Strände

soll idealerweise bedeuten:

Beach Entity hinzufügen
↓
Daten importieren
↓
Beziehungen definieren
↓
Question Generator hinzufügen
↓
Kategorie in UI registrieren

und nicht:

gesamte Anwendung umbauen

103. PRIORITÄTEN

Bei Konflikten zwischen Anforderungen gilt:

    Sicherheit

    Datenschutz

    korrekte Daten

    gute UX

    Performance

    Erweiterbarkeit

    visuelle Extras

Keine optische Funktion darf Sicherheit oder Datenintegrität verschlechtern.
104. NICHT ÜBERBAUEN

Trotz des großen Funktionsumfangs muss die Oberfläche einfach bleiben.

Der Nutzer soll nicht alle Funktionen gleichzeitig sehen.

Progressive Disclosure verwenden.

Beispiel:

Spielen
│
├── Flaggen
├── Länder
├── Städte
├── Karten
├── Bilder
└── Mehr

Unter „Mehr“ können weitere Kategorien liegen.
105. ERSTE VERSION

Die erste produktive Version muss nicht bereits jede denkbare Kategorie enthalten.

Priorität:
Phase A

    neues Design

    Startseite

    Navigation

    Flaggen

    Länder

    Hauptstädte

    Quizengine

    Lernen

    XP

    Level

Phase B

    Account

    Profil

    Fortschritt

    Achievements

    Quests

    Favoriten

Phase C

    Regionen

    Bundesländer

    Kantone

    Städte

    Karten

Phase D

    Gewässer

    Berge

    Sehenswürdigkeiten

    Bilderquiz

Phase E

    Kennzeichen

    internationale Kennzeichen

    komplexere Beziehungen

    umfangreicher Datenimport

Phase F

    Admin

    Datenqualität

    Quizvorschläge

    Kontakt

    Datenschutzfunktionen

    Performance

    Accessibility

    Internationalisierung

106. WICHTIG

Die bestehende Website unter

https://tqnoomaxx.github.io/ugbzspiele/flaggen

soll vor der eigentlichen Entwicklung analysiert werden.

Übernehme sinnvolle bestehende Inhalte und Daten.

Entferne aber nicht blind bestehende Funktionen.

Zuerst feststellen:

    Was existiert?

    Was funktioniert?

    Welche Daten existieren?

    Welche Assets existieren?

    Welche Quizlogik existiert?

    Welche Teile können übernommen werden?

    Welche Teile sollten ersetzt werden?

Danach die neue Architektur darauf aufbauen.
107. FINALES ZIEL

Das Endprodukt soll sich anfühlen wie eine Mischung aus:

interaktivem Atlas + Lernplattform + Quizspiel + persönlichem Geografie-Sammelbuch.

Der Nutzer soll jederzeit zwischen diesen vier Aktivitäten wechseln können:

🎮 SPIELEN

📚 LERNEN

🌍 ENTDECKEN

🏆 FORTSCHRITT

Dabei soll das gesamte System auf einer gemeinsamen Datenbasis aufbauen.

Die Anwendung soll nicht künstlich kompliziert sein.

Der Nutzer sieht Einfachheit.
Das System dahinter ist komplex.