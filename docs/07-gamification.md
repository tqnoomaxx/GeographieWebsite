# 07 – Gamification und Fortschritt

## Grundsätze

- XP und Level sind Bestandteil des Spiels, nicht des Geschäftsmodells: **keine käuflichen XP, keine Energie, keine Herzen, keine Pay-to-win-Mechanik**.
- Motivation, keine Manipulation: Streaks bestrafen nicht, Quests sind Angebote.
- Fokus auf persönlichem Fortschritt; keine globale Rangliste als Pflicht.
- Alle Gamification-Regeln sind **datengetrieben und zentral konfiguriert**, nicht im Code verteilt.

Quelle: TASK.md §20, §75, §76, §79, §81, §82

## XP

XP gibt es für richtige Antworten, schwierige Fragen, abgeschlossene Runden, neue Inhalte, Lernfortschritt, Quests und Achievements. Auch falsche Antworten geben einen kleinen Betrag „für den Versuch“.

Zentrale Konfiguration (Beispielwerte, später anpassbar):

```yaml
xp:
  correct_answer: 10
  wrong_answer: 2
  difficult_answer: 20
  quiz_completed: 25
  new_entity_seen: 5
  quest_completed: 50
  achievement: 100
```

Quelle: TASK.md §20, §43, §78, §79

## Level

Klare Progression mit zentral definierter Formel (z. B. quadratisch wachsend):

```
Level 1 →   0 XP
Level 2 → 100 XP
Level 3 → 250 XP
Level 4 → 450 XP
```

Anzeige im Profil:

```
LEVEL 18
3.420 / 4.000 XP
██████████████░░
```

Quelle: TASK.md §20, §80

## Achievements

Automatisch vergeben, datengetrieben definiert:

```yaml
achievement:
  id: flag_master_500
  type: correct_answers      # correct_answers | entities_mastered | categories_played | map_questions | continents_covered …
  category: flags
  threshold: 500
  title_key: achievements.flag_master_500.title
  icon: 🏆
```

Beispiele:

```
🏆 Flaggenmeister       Erkenne 500 Flaggen.
🌍 Weltreisender        Spiele Fragen aus allen Kontinenten.
🏙 Großstadtkenner      Erkenne 25 Großstädte.
📸 Bilderprofi          Erkenne 100 Sehenswürdigkeiten.
🚗 Kennzeichenexperte   Erkenne 100 deutsche Kennzeichen.
🗺 Kartograph           Schließe 50 Kartenfragen ab.
```

Neue Achievements werden durch neue Einträge ergänzt, nicht durch neue Logik.

Quelle: TASK.md §21, §81

## Quests

Zusätzliche Ziele, nicht täglich verpflichtend. Kurz- und Langzeitquests:

```yaml
quest:
  id: flags_daily
  type: answer_questions     # answer_questions | play_category | learn_entities | explore_region | reach_achievement | reach_accuracy
  category: flags
  target: 10
  reward_xp: 50
```

```
📜 QUESTS
□ 10 Flaggen richtig erkennen
□ 5 Hauptstädte erkennen
□ 3 Städte auf der Karte finden

🌍 EUROPA-EXPEDITION      42 / 50 Länder   ████████████████░░
🇩🇪 DEUTSCHLAND-KENNER    ✓ 16 Bundesländer ✓ Landesflaggen ✓ Landeshauptstädte
                          □ Top-25-Städte □ Flüsse □ Seen □ Sehenswürdigkeiten
```

Quelle: TASK.md §22, §82

## Sammlung „Meine Welt“

Der Nutzer sieht seine Entdeckung pro Kategorie. **Alle Zahlen stammen aus den tatsächlichen Daten** (Anzahl bekannter Entities / Anzahl vorhandener Entities).

```
Meine Welt
🌍 Länder             ██████████░░  72 %   (140 / 195)
🏳️ Flaggen            ███████████░  81 %   (868 / 1071)
🏙️ Städte             ██████░░░░░   44 %
🌊 Gewässer           ████░░░░░░░   31 %
🏔️ Natur              ███░░░░░░░░   25 %
📸 Sehenswürdigkeiten ██████░░░░░   48 %
🚗 Kennzeichen        ████░░░░░░░   27 %
```

Hinweis: Das Beispiel „Länder 683 / 195“ in TASK.md §45 ist ein Tippfehler; der Zähler darf nie größer als der Nenner sein.

Quelle: TASK.md §23, §45

## Statistiken

```
Deine Statistik
1.842 Fragen beantwortet · 1.506 richtig · 82 %
Flaggen 91 % · Länder 86 % · Städte 73 % · Karten 64 % · Bilder 71 % · Kennzeichen 58 %
```

Quelle: TASK.md §75

## Streaks

Optionale tägliche Lernserie („🔥 7 Tage“). **Kein Bestrafen** beim Auslassen eines Tages, keine aggressiven Erinnerungen.

Quelle: TASK.md §76

## Tägliche Rätsel und Streak

Ein gelöstes Tagesrätsel zählt als Aktivität für die Streak. XP pro Rätsel abhängig von der Anzahl benötigter Versuche (`xp.puzzle_solved_by_attempt: [60, 50, 40, 30, 20, 10]`). Eigene Achievements („🧩 Rätselfuchs: 30 Tagesrätsel gelöst“). Verpasste Tage können nicht nachgeholt werden, werden aber auch nicht bestraft.

Quelle: Nutzerentscheidung (Ergänzung zu TASK.md §76)

## Tagesstart-Empfehlung

Für wiederkehrende Nutzer KANN die Startseite eine Empfehlung anzeigen („Du hast gestern viele europäische Flaggen gelernt. Heute: 🏙️ Europäische Hauptstädte“). Empfehlung, kein Zwang.

Quelle: TASK.md §77

## Favoriten

Inhalte lassen sich mit ♡ speichern (Brandenburger Tor, Japan, Alpen, Donau …). Gäste speichern lokal, Accounts synchronisieren.

Quelle: TASK.md §74

## Integrität

Sobald Fortschritt serverseitig gespeichert wird, dürfen XP, Achievements, Quest-Abschlüsse und Statistiken nicht vom Client gesetzt werden. Der Client sendet die Session, der Server berechnet. Details in [11-account-backend.md](11-account-backend.md).

Quelle: TASK.md §99
