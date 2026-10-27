import { geoAlbersUsa, geoArea, geoCentroid, geoContains, geoDistance, geoMercator, geoPath } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import type { RecallCity } from '@/domain/cityRecall'
export function cityRecallGeometry(
  geometry: GeoJSON.Geometry | undefined,
  cities: RecallCity[],
  iso: string,
  center: [number, number],
  width: number,
  height: number,
) {
  let focused = geometry
  if (geometry?.type === 'MultiPolygon') {
    const polygons = geometry.coordinates.map((coordinates) => ({ type: 'Polygon' as const, coordinates }))
    const kept = polygons.filter(
      (p) =>
        geoDistance(geoCentroid(p), center) < Math.PI / 12 ||
        cities.some((c) => geoContains(p, [c.lon, c.lat])),
    )
    const selected = kept.length ? kept : [polygons.reduce((a, b) => (geoArea(a) > geoArea(b) ? a : b))]
    focused = { type: 'MultiPolygon', coordinates: selected.map((p) => p.coordinates) }
  }
  const coordinates = cities.map((c) => [c.lon, c.lat])
  let fit: GeoPermissibleObjects
  if (focused)
    fit = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: {}, geometry: focused },
        { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates } },
      ],
    }
  else {
    const xs = coordinates.map((c) => c[0]),
      ys = coordinates.map((c) => c[1])
    fit = {
      type: 'MultiPoint',
      coordinates: [
        [Math.min(...xs) - 0.3, Math.min(...ys) - 0.3],
        [Math.max(...xs) + 0.3, Math.max(...ys) + 0.3],
      ],
    }
  }
  const projection = (
    iso === 'US' && focused ? geoAlbersUsa() : geoMercator().rotate([-center[0], 0])
  ).fitExtent(
    [
      [22, 22],
      [Math.max(23, width - 22), Math.max(23, height - 22)],
    ],
    fit,
  )
  if (iso !== 'US' || !focused)
    projection.clipExtent([
      [0, 0],
      [width, height],
    ])
  return { projection, path: geoPath(projection), geometry: focused }
}
