import { join } from 'node:path'
import { PUBLIC, listDir, readJson } from './common.mjs'

/** Eine Landeskarte kann mehrere Verwaltungsebenen haben (z. B. Belgien). */
export function regionMapCatalog() {
  const directory = join(PUBLIC, 'media', 'maps', 'regions')
  const rank = (file) =>
    ({ ADM1: 0, ADM2: 1, NE: 2, EUROPE: 3 })[file.replace('.json', '').split('-')[1]] ?? 9
  const files = listDir(directory)
    .filter((file) => /^[A-Z]{2}-[A-Z0-9]+\.json$/.test(file))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
  const countries = {}
  const targets = {}
  for (const file of files) {
    const path = `media/maps/regions/${file}`
    countries[file.split('-')[0]] ??= path
    for (const shape of readJson(join(directory, file)).shapes) {
      const id = shape.flagId.replace(/^region-/, 'region:').replace(/^country-/, 'country:')
      targets[id] ??= path
    }
  }
  return { countries, targets }
}

export function applyRegionMapTargets(regions, targets) {
  for (const region of regions) {
    if (targets[region.id]) region.attributes.map = targets[region.id]
    else delete region.attributes.map
  }
}
