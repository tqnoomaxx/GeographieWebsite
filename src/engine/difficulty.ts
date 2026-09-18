import type { Entity } from '@/domain/types'

/**
 * Bekanntheitsklasse 1 (leicht) .. 3 (schwer) aus Einwohnerzahl bzw. Entity-Typ.
 * Wird mit dem Lernstand kombiniert; der Nutzer sieht keinen Regler.
 */
export function baseDifficulty(e: Entity): 1 | 2 | 3 {
  if (e.type === 'country') {
    const pop = e.attributes.population ?? 0
    const independent = e.attributes.independent !== false
    if (!independent) return 3
    if (pop > 20_000_000) return 1
    if (pop > 3_000_000) return 2
    return 3
  }
  if (e.type === 'city') return e.attributes.is_capital ? 2 : 3
  if (e.type === 'landmark') return 2
  if (e.type === 'river' || e.type === 'lake' || e.type === 'mountain') {
    const sl = (e.attributes.sitelinks as number) ?? 0
    return sl > 120 ? 1 : sl > 70 ? 2 : 3
  }
  if (e.type === 'license_plate') return (e.attributes.code as string).length === 1 ? 1 : (e.attributes.code as string).length === 2 ? 2 : 3
  return 2
}
