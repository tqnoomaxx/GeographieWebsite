// Build the investigation maps from published geometry. No map service is called while playing.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { geoArea } from 'd3-geo'

const cache = process.env.STORY_MAP_CACHE ?? 'scripts/.cache/story'
mkdirSync(cache, { recursive: true })
mkdirSync('public/data/story', { recursive: true })
const root = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
const names = {
  countries: 'ne_10m_admin_0_countries',
  rivers: 'ne_10m_rivers_lake_centerlines',
  lakes: 'ne_10m_lakes',
}
const datasets = Object.fromEntries(
  await Promise.all(
    Object.entries(names).map(async ([key, name]) => {
      const path = `${cache}/atlas-story-${key}.json`
      if (!existsSync(path)) {
        const response = await fetch(`${root}${name}.geojson`)
        if (!response.ok) throw new Error(`${name}: ${response.status}`)
        writeFileSync(path, await response.text())
      }
      return [key, JSON.parse(readFileSync(path, 'utf8')).features]
    }),
  ),
)
const regions = {
  caucasus: { countries: ['GE', 'AM', 'AZ', 'TR'], bounds: [44.59, 41.69, 44.91, 41.91], tolerance: 0.0002 },
  balkans: {
    countries: ['AL', 'ME', 'BA', 'HR', 'RS', 'MK', 'XK', 'GR', 'BG', 'IT'],
    bounds: [16.8, 40.5, 22.5, 44.8],
    tolerance: 0.004,
  },
  africa: {
    countries: ['CD', 'BI', 'TZ', 'ZM', 'MW', 'UG', 'RW', 'KE', 'MZ', 'SS'],
    bounds: [26.5, -15, 38, 4],
    tolerance: 0.008,
  },
  samoa: { countries: ['WS', 'AS'], bounds: [-173.2, -15.2, -168.8, -12.6], tolerance: 0.0005 },
  andes: { countries: ['CL', 'AR', 'BO'], bounds: [-70.5, -28, -64.3, -21], tolerance: 0.004 },
  'mekong-north': {
    countries: ['LA', 'TH', 'KH', 'VN', 'MM', 'CN'],
    bounds: [98, 14, 108, 22],
    tolerance: 0.005,
  },
  mekong: { countries: ['LA', 'TH', 'KH', 'VN', 'MM', 'CN'], bounds: [99, 8.3, 108.6, 22], tolerance: 0.005 },
  malta: { countries: ['MT'], bounds: [14.15, 35.78, 14.59, 36.08], tolerance: 0.0001 },
}
function simplify(points, tolerance) {
  if (points.length <= 2) return points
  const first = points[0],
    last = points.at(-1),
    dx = last[0] - first[0],
    dy = last[1] - first[1]
  let split = 0,
    farthest = 0
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      t = Math.max(
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
const round = (points) => points.map((point) => point.slice(0, 2).map((number) => +number.toFixed(5)))
function line(points, tolerance, ring = false) {
  const reduced = simplify(points, tolerance)
  return round(ring && reduced.length < 4 ? points : reduced)
}
function geometry(source, tolerance) {
  if (source.type === 'LineString')
    return { type: source.type, coordinates: line(source.coordinates, tolerance) }
  if (source.type === 'MultiLineString')
    return { type: source.type, coordinates: source.coordinates.map((points) => line(points, tolerance)) }
  const polygons =
    source.type === 'Polygon'
      ? [source.coordinates]
      : source.type === 'MultiPolygon'
        ? source.coordinates
        : []
  return {
    type: 'MultiPolygon',
    coordinates: polygons.map((polygon) => {
      const coordinates = polygon.map((points) => line(points, tolerance, true))
      return geoArea({ type: 'Polygon', coordinates }) > 2 * Math.PI
        ? coordinates.map((ring) => ring.toReversed())
        : coordinates
    }),
  }
}
function intersects(geometry, bounds) {
  const points = geometry.coordinates.flat(
    geometry.type === 'Polygon' || geometry.type === 'MultiLineString'
      ? 1
      : geometry.type === 'MultiPolygon'
        ? 2
        : 0,
  )
  return points.some(
    (p) =>
      p[0] >= bounds[0] - 0.5 &&
      p[0] <= bounds[2] + 0.5 &&
      p[1] >= bounds[1] - 0.5 &&
      p[1] <= bounds[3] + 0.5,
  )
}
const osm = JSON.parse(readFileSync('scripts/data/story-mtskheta-osm.geojson', 'utf8'))
for (const [id, region] of Object.entries(regions)) {
  const features = []
  for (const feature of datasets.countries) {
    if (
      !region.countries.includes(feature.properties.ISO_A2_EH) &&
      !region.countries.includes(feature.properties.ISO_A2) &&
      !(id === 'balkans' && feature.properties.ADMIN === 'Kosovo')
    )
      continue
    features.push({
      type: 'Feature',
      properties: { kind: 'land', name: feature.properties.NAME_DE ?? feature.properties.NAME },
      geometry: geometry(feature.geometry, region.tolerance),
    })
  }
  for (const [kind, key] of [
    ['river', 'rivers'],
    ['lake', 'lakes'],
  ])
    for (const feature of datasets[key]) {
      if (!intersects(feature.geometry, region.bounds)) continue
      const name = feature.properties.name_en ?? feature.properties.name ?? ''
      if (id === 'caucasus') continue // This local sheet uses the connected OSM river network.
      features.push({
        type: 'Feature',
        properties: { kind, name, ...(/Tanganyika/i.test(name) ? { id: 'lake:tanganyika' } : {}) },
        geometry: geometry(feature.geometry, region.tolerance),
      })
    }
  if (id === 'caucasus')
    features.push(
      ...osm.features.map((feature) => ({
        ...feature,
        geometry: geometry(feature.geometry, region.tolerance),
      })),
    )
  if (!features.some((feature) => feature.properties.kind === 'land')) throw new Error(`No land for ${id}`)
  if (id === 'africa' && !features.some((feature) => feature.properties.id === 'lake:tanganyika'))
    throw new Error('Missing Tanganyika geometry')
  writeFileSync(
    `public/data/story/${id}.geojson`,
    JSON.stringify({ type: 'FeatureCollection', features }) + '\n',
  )
  console.log(`${id}: ${features.length} geographic features`)
}
writeFileSync(
  'public/data/story/sources.json',
  JSON.stringify(
    {
      retrieved: '2026-10-29',
      naturalEarth: {
        license: 'Public Domain',
        scale: '1:10m',
        files: Object.values(names).map((name) => `${root}${name}.geojson`),
      },
      openStreetMap: {
        license: 'ODbL 1.0',
        attribution: '© OpenStreetMap contributors',
        url: 'https://www.openstreetmap.org/copyright',
        snapshot: 'https://api.openstreetmap.org/api/0.6/map?bbox=44.69,41.83,44.74,41.87',
        use: 'Aragvi and Mtkvari centerlines near their confluence; connected ways followed through the OSM API',
        ways: osm.features.map((feature) => feature.properties.osmId),
      },
      processing:
        'Douglas–Peucker simplification; coordinates retained in WGS84. Clockwise polygon exterior rings for d3-geo.',
    },
    null,
    2,
  ) + '\n',
)
