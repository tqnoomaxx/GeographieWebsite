# 🧭 GeoKompass

Entdecke die Welt. Teste dein Wissen. Eine interaktive Geografie-Plattform: Quiz, Lernen, Entdecken, Fortschritt und tägliche Rätsel (Flagle, Countryle, Umrissle, Hauptstädtle).

Spezifikation und Roadmap: [`docs/`](docs/README.md). Ursprünglicher Master-Prompt: [`TASK.md`](TASK.md).

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · react-router · i18next · idb (IndexedDB) · d3-geo · vite-plugin-pwa · Vitest · Playwright

Phase 1 läuft komplett statisch (GitHub Pages), ohne Backend. Fortschritt liegt lokal im Browser. Phase 2 (Supabase) ist über die Service-Schicht vorbereitet, siehe `supabase/`.

## Entwicklung

```bash
npm install
npm run data:all      # Daten importieren (Netzwerk nötig, gecacht in scripts/.cache)
npm run dev
```

Weitere Skripte:

| Skript | Zweck |
|---|---|
| `npm run data:countries` | Länderstammdaten (mledoze/countries) + Umrisse (Natural Earth) |
| `npm run data:legacy` | Flaggen, Regionen, Städte, Sehenswürdigkeiten aus dem Altbestand `ugbzspiele` |
| `npm run data:wikidata` | Einwohnerzahlen, höchste Punkte (Wikidata) |
| `npm run data:plates` | Kfz-Kennzeichen DE/AT/CH (Wikidata P395) |
| `npm run data:nature` | Flüsse, Seen, Berge (Wikidata, nach Bekanntheit) |
| `npm run data:validate` | Validierung, Index, Suchindex, Attribution; bricht bei Fehlern ab |
| `npm test` | Engine-Tests |
| `npm run e2e` | Playwright-Smoke-Tests gegen den Build |
| `npm run build` | Validierung + Typecheck + Build |

## Deployment

`git push` auf `main` → GitHub Actions → Validierung, Tests, Build → GitHub Pages. Für die Projektseite wird `VITE_BASE_URL=/<repo>/` gesetzt; für eine eigene Domain `VITE_BASE_URL=/` und eine `CNAME`-Datei in `public/`.

## Daten und Lizenzen

Alle Medien tragen Lizenz und Attribution in den Metadaten; der Build schlägt fehl, wenn ein Medium ohne Lizenz existiert. Übersicht in der App unter *Einstellungen → Quellen und Lizenzen* (`public/data/attribution.json`).

- Länderflaggen: [country-flag-icons](https://github.com/catamphetamine/country-flag-icons) (MIT)
- Regionalflaggen: [niemela/flags](https://github.com/niemela/flags) (Metadaten CC BY-SA 4.0, Flaggen je Ursprungslizenz)
- Fotos: Wikimedia Commons (je Bild angegeben)
- Länderdaten: [mledoze/countries](https://github.com/mledoze/countries) (ODbL 1.0), [Wikidata](https://www.wikidata.org) (CC0)
- Geometrien: [Natural Earth](https://www.naturalearthdata.com/) (Public Domain), [geoBoundaries](https://www.geoboundaries.org/) (CC BY 4.0)

Code: MIT (siehe `LICENSE`).
