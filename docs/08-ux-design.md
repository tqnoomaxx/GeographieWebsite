# 08 – UX und Design

## Designrichtung

Komplett neues Design: modern, hochwertig, minimalistisch, geografisch, spielerisch. **Nicht** kindisch, **nicht** wie ein Schulportal, **nicht** wie ein SaaS-Dashboard. Welt und Karten spielen visuell eine große Rolle.

Farbwelt: Off-White, dunkles Blau/Indigo, dezentes Grün, warmes Gelb, Rot für Fehler. Keine übermäßigen Farbverläufe, keine unnötigen Glaseffekte.

Quelle: TASK.md §40

## Farbsystem und Dark Mode

Drei Modi: ☀ Hell · 🌙 Dunkel · ⚙ System. Auswahl wird lokal gespeichert, später optional mit dem Account synchronisiert.

Dark Mode ist nicht „Schwarz statt Weiß“, sondern ein eigenes Token-Set:

```
--bg, --bg-card, --text, --text-secondary, --border,
--accent, --accent-secondary, --success (richtig), --error (falsch), --warning
```

Quelle: TASK.md §48, §61

## Responsive: Mobile First

Die mobile Version ist kein Zusatz. Quizfragen sind mit einer Hand bedienbar.

Mobile: große Flaggen, große Antwortbuttons, Touch-freundlich, einfache Navigation, Bottom Navigation.

```
┌─────────────────────────┐
│ ← Flaggen       4 / 10  │
│          🇫🇷             │
│     Welche Flagge?      │
│ ┌─────────────────────┐ │
│ │ A) Frankreich       │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ B) Italien          │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ C) Belgien          │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

Desktop ist keine vergrößerte Mobile-Version: größere Quizkarten, mehr Platz für Karten und Bilder, sinnvolle Mehrspaltenlayouts, Top-Navigation.

```
┌──────────────────────────────────────────────┐
│ 🌍 GEOQUIZ     Spielen Entdecken Lernen Profil│
├──────────────────────────────────────────────┤
│                🇯🇵                            │
│          Welche Flagge ist das?              │
│       ┌────────┐       ┌────────┐            │
│       │ Japan  │       │ China  │            │
│       └────────┘       └────────┘            │
│       ┌────────┐       ┌────────┐            │
│       │ Korea  │       │ Laos   │            │
│       └────────┘       └────────┘            │
└──────────────────────────────────────────────┘
```

Quelle: TASK.md §39, §58, §59

## Startseite

Wiederkehrender Nutzer:

```
🌍 GEOQUIZ
Entdecke die Welt. Teste dein Wissen.
──────────────────────────────
🎯 Quiz  🏳️ Flaggen  🏙️ Städte  🗺️ Karten  📸 Bilder  📚 Lernen  🚗 Kennzeichen
──────────────────────────────
🧩 Heute: Flagle ✓ · Countryle · Hauptstädtle
🔥 Deine Serie   ⭐ Level 18   🏆 34 Achievements
[ Weiterspielen: Flaggen Europa 83 / 254 ]
```

Neuer Gast:

```
🌍 GEOQUIZ
Wie gut kennst du die Welt?
[ Jetzt spielen ]
```

Welche Kategorien direkt sichtbar sind und welche unter „Mehr“ liegen, regelt Progressive Disclosure (siehe [01-vision.md](01-vision.md)); die Kategorieliste selbst steht in [03-inhalte-kategorien.md](03-inhalte-kategorien.md).

Quelle: TASK.md §4, §41, §104

## Quiz-Screen

Während einer Frage nur das Wesentliche: Zurück/Beenden, Fortschrittszähler, Medium, Frage, Antworten. Keine überfüllte Oberfläche.

```
← Beenden                7
        🇩🇪
Welche Flagge ist das?
[ Deutschland ] [ Belgien ] [ Österreich ] [ Ungarn ]
```

Quelle: TASK.md §42

## Feedback

Sofort sichtbar, kurz, keine beschämende Sprache. Optional ein Lernsatz.

```
✓ Richtig!                      ✕ Nicht ganz
Deutschland                     Richtig wäre: Deutschland
+10 XP                          +2 XP für den Versuch
Berlin ist die Hauptstadt Deutschlands.
```

Quelle: TASK.md §43, §78

## Rundenende

```
Runde beendet 🎉
8 / 10 richtig · 80 % · +92 XP
────────────────
🏆 Neues Achievement „Europa-Kenner“
────────────────
[ Noch einmal ]  [ Fehler wiederholen ]  [ Weiter ]
```

Für Gäste danach dezent (nicht modal, nicht blockierend):

```
Dein Ergebnis wurde lokal gespeichert.
Mit einem kostenlosen Account kannst du deinen Fortschritt
auf mehreren Geräten synchronisieren.
[ Account erstellen ]  [ Später ]
```

Quelle: TASK.md §44, §53

## Zustände

- **Fehler:** Nie technische Meldungen zeigen. Statt `TypeError: …` → „Etwas ist schiefgelaufen. Bitte versuche es erneut. [ Erneut versuchen ]“. Details nur in Logs.
- **Leer:** Jede Seite hat einen sinnvollen Empty State mit Handlungsaufforderung („Noch keine Favoriten. Entdecke ein Land … [ Entdecken ]“).
- **Laden:** Skeletons, dezente Spinner, Platzhalter mit fester Größe. Keine springenden Layouts.

Quelle: TASK.md §95, §96, §97

## Accessibility

MUSS:
- ausreichende Kontraste (WCAG AA), sichtbare Fokuszustände, vollständige Tastaturbedienung
- sinnvolle HTML-Semantik, ARIA nur wo nötig, verständliche Labels, Screenreader-Unterstützung
- Touch-Ziele mindestens 44 × 44 px
- `prefers-reduced-motion` respektieren
- Informationen niemals ausschließlich durch Farbe vermitteln (richtig/falsch zusätzlich mit ✓/✕ und Text)
- Quizfragen ohne Maus beantwortbar, soweit der Fragentyp es erlaubt

Quelle: TASK.md §47, §60
