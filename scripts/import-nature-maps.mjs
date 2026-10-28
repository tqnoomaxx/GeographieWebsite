// Real river centerlines and lake shorelines, linked by Wikidata ID (Natural Earth, Public Domain).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { geoArea } from 'd3-geo'
import { CACHE, DATA, readJson, writeJson } from './lib/common.mjs'

const sources = {
  rivers: ['ne_10m_rivers_lake_centerlines_scale_rank', 'ne_10m_rivers_europe'],
  lakes: ['ne_10m_lakes', 'ne_10m_lakes_europe', 'ne_10m_geography_marine_polys'],
}
const root = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
mkdirSync(CACHE, { recursive: true })

function simplify(points, tolerance = 0.012) {
  if (points.length <= 2) return points
  const first = points[0],
    last = points[points.length - 1]
  const dx = last[0] - first[0],
    dy = last[1] - first[1]
  let farthest = 0,
    split = 0
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const t = Math.max(
      0,
      Math.min(1, ((p[0] - first[0]) * dx + (p[1] - first[1]) * dy) / (dx * dx + dy * dy || 1)),
    )
    const distance = Math.hypot(p[0] - first[0] - t * dx, p[1] - first[1] - t * dy)
    if (distance > farthest) {
      farthest = distance
      split = i
    }
  }
  return farthest <= tolerance
    ? [first, last]
    : [
        ...simplify(points.slice(0, split + 1), tolerance).slice(0, -1),
        ...simplify(points.slice(split), tolerance),
      ]
}
const round = (p) => p.map((n) => Number(n.toFixed(4)))
const ring = (points) => {
  const simple = simplify(points)
  return (simple.length >= 4 ? simple : points).map(round)
}
function parts(geometry, type) {
  if (type === 'river') {
    if (geometry.type === 'LineString') return [simplify(geometry.coordinates).map(round)]
    if (geometry.type === 'MultiLineString')
      return geometry.coordinates.map((line) => simplify(line).map(round))
  } else {
    const polygons =
      geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : []
    return polygons.map((polygon) => {
      const coordinates = polygon.map(ring)
      // d3-geo expects clockwise exterior rings for small spherical polygons.
      return geoArea({ type: 'Polygon', coordinates }) > 2 * Math.PI
        ? coordinates.map((r) => r.toReversed())
        : coordinates
    })
  }
  return []
}

for (const [kind, names] of Object.entries(sources)) {
  const collections = await Promise.all(
    names.map(async (name) => {
      const file = join(CACHE, `${name}.geojson`)
      if (!existsSync(file) || process.argv.includes('--refresh')) {
        const response = await fetch(root + name + '.geojson')
        if (!response.ok) throw new Error(`${name}: ${response.status}`)
        writeFileSync(file, await response.text())
      }
      return readJson(file).features
    }),
  )
  const byQid = new Map()
  for (const feature of collections.flat()) {
    const id = feature.properties.wikidataid
    if (!id || !feature.geometry) continue
    const list = byQid.get(id) ?? []
    list.push(feature.geometry)
    byQid.set(id, list)
  }
  const file = join(DATA, 'entities', `${kind}.json`)
  const entities = readJson(file)
  for (const entity of entities) {
    const geometries = byQid.get(entity.attributes.wikidata) ?? []
    const coordinates = geometries.flatMap((g) => parts(g, entity.type))
    if (coordinates.length)
      entity.mapGeometry = { type: entity.type === 'river' ? 'MultiLineString' : 'MultiPolygon', coordinates }
    else delete entity.mapGeometry
  }
  // Keep the large coordinate arrays compact without changing normal entity formatting.
  const serialized = JSON.stringify(entities, null, 1).replace(
    /"mapGeometry": (\{[\s\S]*?\n  \})/g,
    (_, geometry) => '"mapGeometry": ' + JSON.stringify(JSON.parse(geometry)),
  )
  writeFileSync(file, serialized + '\n')
  console.log(
    `${kind}: ${entities.filter((e) => e.mapGeometry).length}/${entities.length} echte Kartengeometrien`,
  )
}
const attributionFile = join(DATA, 'geo', 'SOURCES.json')
const attribution = readJson(attributionFile)
attribution.nature_features = {
  source: 'Natural Earth',
  license: 'Public Domain',
  scale: '1:10m',
  rivers: 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/',
  files: Object.values(sources)
    .flat()
    .map((name) => root + name + '.geojson'),
  matching: 'Wikidata IDs; simplified to 0.012 degrees',
}
writeJson(attributionFile, attribution)
