import type { Entity } from './types'
import { normalizeAnswer } from '@/engine/normalize'

/** Ein Kürzel kann heute mehreren Zulassungsbezirken gehören. */
export function platePlaceNames(plate: Entity): string[] {
  const districts = plate.attributes.districts as string[] | undefined
  return [
    ...new Set(
      [plate.names.de, ...(districts ?? [])].map((name) =>
        name.replace(
          /^(Landkreis|Kreis|Stadtkreis|Region|Regionalverband|Städteregion|Bezirk|Kanton|Statutarstadt) /,
          '',
        ),
      ),
    ),
  ]
}

export function platePlaceKeys(plate: Entity): string[] {
  return [...new Set(platePlaceNames(plate).map(normalizeAnswer))]
}

export function sharePlatePlace(a: Entity, b: Entity): boolean {
  return (
    a.type === 'license_plate' &&
    b.type === 'license_plate' &&
    a.attributes.country === b.attributes.country &&
    platePlaceKeys(a).some((key) => platePlaceKeys(b).includes(key))
  )
}
