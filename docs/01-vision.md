# 01 – Vision und Grundprinzipien

## Produktvision

> **Ein modernes interaktives Geografie-Spiel, mit dem man die Welt spielerisch entdecken, lernen und testen kann.**

Das Endprodukt soll sich anfühlen wie eine Mischung aus **interaktivem Atlas + Lernplattform + Quizspiel + persönlichem Geografie-Sammelbuch**. Es ist deutlich größer gedacht als ein Flaggenquiz und muss langfristig erweiterbar bleiben.

Der Nutzer wechselt jederzeit zwischen vier Aktivitäten, die alle auf derselben Datenbasis aufbauen:

```
🎮 SPIELEN    📚 LERNEN    🌍 ENTDECKEN    🏆 FORTSCHRITT
```

Quelle: TASK.md §1, §100, §107

## Hauptziel

Der Nutzer öffnet die Website und versteht sofort: „Hier kann ich Geografie spielen.“ Nicht: „Hier muss ich zuerst ein kompliziertes Quiz konfigurieren.“ Die Anwendung ist schnell, visuell und intuitiv.

Quelle: TASK.md §3

## Grundprinzipien

1. **Einfachheit vorne, Komplexität hinten.** Keine Konfigurationsseiten, keine 20 Checkboxen, keine großen Einstellungsdialoge. Der Nutzer sieht Einfachheit, das System dahinter ist komplex. (§4, §107)
2. **Progressive Disclosure.** Nicht alle Funktionen gleichzeitig zeigen. Hauptkategorien direkt, weitere unter „Mehr“. (§104)
3. **Verbundene Inhalte.** Alle Objekte hängen über Beziehungen zusammen; aus diesen Beziehungen generiert die Engine automatisch die Spiele. (§100)
4. **Kein Pay-to-win, keine Manipulation.** Keine käuflichen XP, keine Energie, keine Herzen, keine Bestrafung für ausgelassene Tage. (§20, §76)
5. **Keine erfundenen Daten.** Jeder Datensatz hat eine Quelle; Lücken bleiben Lücken. (§11, §32)
6. **Zukunftssicher bauen.** Bei jeder Funktion fragen: „Funktioniert das noch mit zehn weiteren Kategorien und hunderttausenden Datensätzen?“ Keine `if category === "flags"`-Sonderfälle, sondern generische Bausteine: `Category`, `QuestionGenerator`, `QuestionType`, `Entity`, `Relationship`, `QuizSession`, `Progress`. (§101)

## Der Kernkreislauf

```
spielen → lernen → entdecken → Fortschritt sammeln → Level aufsteigen
→ Achievements freischalten → Quests erledigen → Profil gestalten
→ neue Inhalte entdecken → wieder spielen
```

Beispiel für die Verknüpfung der Inhalte:

```
🇩🇪 Deutschland
      ├── 🏳️ Flagge
      ├── 🏛️ Berlin
      │      └── 🏛️ Brandenburger Tor
      ├── 🗺️ 16 Bundesländer
      │      └── 🇧🇾 Bayern
      │             └── 🏙️ München
      │                    └── 🚗 M
      ├── 🌊 Rhein
      ├── 🏔️ Alpen
      └── 📸 Sehenswürdigkeiten
```

Quelle: TASK.md §100

## Prioritäten bei Zielkonflikten

Wenn Anforderungen kollidieren, gilt diese Reihenfolge:

1. Sicherheit
2. Datenschutz
3. korrekte Daten
4. gute UX
5. Performance
6. Erweiterbarkeit
7. visuelle Extras

Keine optische Funktion darf Sicherheit oder Datenintegrität verschlechtern.

Quelle: TASK.md §103

## Nicht-Ziele

- Kein Umstylen der alten Website; es entsteht eine neue Generation des Projekts. (§2)
- Kein simuliertes Backend auf GitHub Pages. Phase 1 ist bewusst rein statisch. (Einleitung TASK.md)
- Keine globale Rangliste als Pflichtfeature; Fokus auf persönlichem Fortschritt. (§75)
- Kein Tracking, keine Werbetracker, keine Drittanbieter-Skripte ohne Prüfung. (§51)
- Kein eigenes Quizsystem pro Kategorie. (§14)
