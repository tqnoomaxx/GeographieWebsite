# Landbezogene Quiz-Auswahl

Die Auswahl unter der Weltkugel, die Länderseiten und `/play?scope=country:<ISO>` verwenden `CountryQuizPanel` und dieselbe Verfügbarkeitsprüfung aus `src/engine/countryExercises.ts`.

Jeder Eintrag verweist auf eine konkrete Katalogübung mit Land, Antwortart und gegebenenfalls Einwohnergrenze oder Profilfeldern. Die Prüfung berücksichtigt erlaubte Bereiche, die benötigte Zahl an Zielen und die Erzeugbarkeit einer Frage. Bei kleiner Datenmenge wird eine mögliche Eingabe- oder Kartenvariante angeboten. Städte sammeln erhält die Standardgrenze von 300.000 Einwohnern oder, falls dort keine Ziele existieren, 15.000 Einwohner. Ohne passende Ziele erscheint die Übung nicht.

Das Länderprofil wählt bis zu fünf vorhandene Wissensfelder aus Hauptstadt/Regierungssitz, Währung, Sprache, Nachbarländern, höchster Erhebung und weiteren Grundlagen. Für ausgewählte Länder und Gebiete ist der Profilmodus explizit freigegeben. Die Einstellungen zeigen die Verfügbarkeit je Kategorie für das gewählte Land und blenden die unpassende Auswahl „Länder pro Runde“ aus.

Länder-Raten bleibt außerhalb eines bereits benannten Landes. Flüsse, Seen und Berge werden bei Länderbezug als Kartenaufgaben angeboten. Vergleichsaufgaben und Fotos nutzen die Inhalte des gewählten Landes. Im Setup bleibt ein gültiges, explizit gewähltes Land auch bei fehlenden Zielen erhalten; ein Start ist dann deaktiviert. Ungültige alte Länderkennungen behalten die bisherige Fallback-Behandlung. Die URL-Auswertung wählt bei Naturübungen im Länderbereich eine erlaubte Kartenvariante statt den Länderbezug zu verwerfen.

Der Ladeadapter fordert nur Ressourcen der geeigneten Übungen an; reine Welt-/Sprachquiz-Pakete werden nicht mitgeladen. Ein ausgefallenes Paket sperrt nur die davon abhängigen Einträge. Bereits verfügbare Übungen bleiben sichtbar und fehlgeschlagene Pakete lassen sich erneut laden. Die Länderauswahl auf der Startseite gehört zum Verlaufseintrag und bleibt beim Zurückgehen aus dem Setup erhalten.

`src/engine/countryExercises.test.ts` prüft erzeugbare Fragen und unveränderten Länderbezug für unterschiedliche Länder und Datenlagen. `e2e/country-exercises.spec.ts` prüft Weltkugel, Setup, Rundeneinstieg, Wiederaufnahme, Naturkarten, gemeinsame Ländereinstiege und Teilausfälle auf Desktop und Mobilgeräten.
