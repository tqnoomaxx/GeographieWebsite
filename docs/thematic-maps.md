# Themenkarten

Die Seite `/maps` ist über „Karten“ in Desktop- und Mobilnavigation erreichbar. `theme=calling|driving|domains|currencies` bestimmt das Kartenthema. Länderwahl, Suche, Beschriftungen und Legendenfilter gehören über `usePageViewState` zum jeweiligen Verlaufseintrag. Der Weg zum Länderprofil und zurück erhält diese Auswahl.

Karte und Liste umfassen 253 Länder und Gebiete aus dem vorhandenen Länderbestand; die EU ist keine zusätzliche Länderfläche. Kleine Staaten ohne Natural-Earth-Fläche erhalten bei vorhandener Koordinate einen Punkt. Alle Einträge sind über die Liste auffindbar, auch Gebiete ohne geografische Position. Die Karte zeichnet auf der bestehenden `MapViewport`-Komponente. Deren Render-Funktion liefert zusätzlich den aktuellen Zoomzustand; dadurch bleiben Beschriftungen bei jeder Bildschirmbreite lesbar und weitere Beschriftungen werden beim Vergrößern eingeblendet.

## Daten

`public/data/meta/country-map-facts.json` enthält Telefonvorwahlen und Verkehrsseiten aus dem dort festgehaltenen REST-Countries-Commit. `node scripts/import-country-map-facts.mjs` erzeugt den Auszug; der Import ist auch in `npm run data:countries` eingebunden. Die Quelldatei wird unter `scripts/.cache` zwischengespeichert. Der Datenstand ist eigenständig versioniert und benötigt zur Laufzeit keinen externen API-Zugriff. Die vollständige MPL-2.0-Lizenz liegt unter `public/data/RESTCOUNTRIES-LICENSE.txt`.

Normalisierung:

- USA und Kanada zeigen +1, Russland und Kasachstan +7 anstelle innerstaatlicher Nummerierungsbereiche.
- Mehrere Gebietskennzahlen bleiben für kleinere Gebiete erhalten, etwa +1809/+1829/+1849 für die Dominikanische Republik.
- Westsahara wird mit dem verwendeten Nummerierungsplan +212 angezeigt.
- Der Vatikan verwendet gemäß seinen veröffentlichten Kontaktangaben +39; die reservierte +379 wird nicht als verwendete Vorwahl ausgegeben.
- Für Antarktis und mehrere unbewohnte Gebiete wird keine allgemeine Verkehrsseite behauptet. Nicht vorhandene Angaben bleiben leer und werden in der Oberfläche als „Keine Angabe“ angezeigt.

Internet-Endungen und sämtliche Währungen stammen aus dem vorhandenen Länderbestand. Das neue Modul verändert die bisherigen Länder-Quizdaten nicht. `scripts/validate-data.mjs` prüft den Auszug und berücksichtigt ihn bei der Datenversion. Quellen sind auch in der Kartenansicht und unter „Quellen“ verlinkt.

## Prüfung

`src/features/maps/mapThemes.test.ts` prüft Abdeckung, Nummerierungspläne, Verkehrsseiten, Währungen und die Vorwahl-Präfixsuche. `e2e/maps.spec.ts` prüft Menü und Karten, Länderwahl per Tastatur, Suche, Filter, Beschriftungen, Zoom, Smartphone-/Tablet-Breiten, Wiederholung nach Datenfehlern sowie die Rückkehr aus dem Länderprofil. Die bestehenden Städte-Kartentests prüfen die gemeinsame Kartensteuerung weiterhin.
