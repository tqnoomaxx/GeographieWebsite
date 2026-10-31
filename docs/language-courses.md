# Sprachen lernen

Unter `/play/languages` gibt es für alle 21 Sprachen des Sprachkatalogs einen Kurs (`learn-<Sprachcode>`). Jeder Kurs hat einen Schriftmodus (`collection=alphabet`) und einen Wortschatzmodus (`collection=words`). Die Karten lassen sich vor einer Quizrunde aufdecken, durchsuchen und nach Themen filtern. Der Quizmodus übernimmt die Auswahl, die Eingabeart und die vorhandenen Wiederholungseinstellungen.

Der Wortschatz enthält pro Sprache 205 Wörter und Begriffe aus fünf Themenbereichen. Die Übersetzungen sind die lokalisierten Unicode-CLDR-Bezeichnungen der ausgewählten Symbole, einschließlich zusammengesetzter Begriffe wie „roter Apfel“. Symbole erscheinen auf Lernkarten erst nach dem Aufdecken. Quizfragen zeigen den Originalbegriff und fragen die deutsche Bedeutung ab. Zeichenkarten fragen den Namen oder die Lernumschrift ab.

Japanisch bietet 46 Hiragana und 46 Katakana, Koreanisch die 24 Hangul-Grundbuchstaben und Chinesisch 30 Grundzeichen mit Pinyin. Die Lesehilfen sind keine IPA-Lautschrift. Die übrigen Kurse verwenden die jeweiligen Alphabet- und Schriftgrundlagen; bestehende Lesekurse bleiben separat erreichbar.

## Daten und Quellen

- `scripts/content/course-alphabets.mjs`: redaktionelle Zeichen- und Buchstabennamen.
- `scripts/import-language-courses.mjs`: reproduzierbarer Import aus dem festgehaltenen CLDR-Commit. Lädt Originaldateien in den ignorierten Script-Cache und erzeugt `public/data/entities/language-courses.json` und `src/config/languageCourses.json`.
- `public/data/UNICODE-LICENSE.txt`: die mitgelieferte Unicode-Lizenz.
- `scripts/import-language-course-fonts.mjs`: erzeugt lokale CJK-Schriftdateien für sämtliche Kurszeichen und die bisherigen Textproben. Quellen und Zeichenvorrat stehen in `public/fonts/scripts/COURSE-SOURCES.json`; die vorhandenen SIL-OFL-Lizenzen gelten auch für die neuen Noto-Subsets.

Aktualisieren: `node scripts/import-language-courses.mjs`, bei neuen CJK-Zeichen zusätzlich `node scripts/import-language-course-fonts.mjs`, dann `npm run data:validate`. Die Kurse sind auch in `npm run data:scripts` eingebunden. Übersetzungen kommen zur Laufzeit aus den lokalen Dateien; es gibt keine externen Übersetzungsanfragen.

## Prüfung

`src/engine/languageCourses.test.ts` prüft alle Sprach-, Schrift-/Wortschatz- und Eingabevarianten, Sprachtrennung, eindeutige Antwortoptionen, Themenauswahl und URL-Konfiguration. Der allgemeine Inhaltsaudit prüft jede neue Karte. `e2e/language-courses.spec.ts` prüft Erreichbarkeit aller Kurse, Lernkarten, Suche, Filter, Übungsstart, Fortsetzen, Schreibrichtung und lokale CJK-Fonts auf Desktop und Mobilgerät.
