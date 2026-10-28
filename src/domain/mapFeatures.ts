import type { Entity } from './types'

export type MapFeatureType = 'river' | 'lake' | 'mountain'
export function hasMapGeometry(entity: Entity): boolean {
  if (entity.type === 'mountain')
    return !!entity.location && Number.isFinite(entity.location.lat) && Number.isFinite(entity.location.lon)
  return entity.type === 'river'
    ? entity.mapGeometry?.type === 'LineString' || entity.mapGeometry?.type === 'MultiLineString'
    : entity.type === 'lake' &&
        (entity.mapGeometry?.type === 'Polygon' || entity.mapGeometry?.type === 'MultiPolygon')
}
export function mapGeometry(entity: Entity): GeoJSON.Geometry | undefined {
  if (!hasMapGeometry(entity)) return undefined
  if (entity.type === 'mountain')
    return { type: 'Point', coordinates: [entity.location!.lon, entity.location!.lat] }
  return entity.mapGeometry
}
