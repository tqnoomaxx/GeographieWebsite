import type { EntityProgress } from './srs'

/** Nur bereits gelernte, fällige und im gewählten Quiz verfügbare Inhalte. */
export function dueIds(
  eligible: Iterable<string>,
  progress: Map<string, EntityProgress>,
  now = new Date(),
): string[] {
  return [...new Set(eligible)]
    .filter((id) => {
      const item = progress.get(id)
      return item && item.state !== 'new' && Date.parse(item.dueAt) <= now.getTime()
    })
    .sort((a, b) => progress.get(a)!.dueAt.localeCompare(progress.get(b)!.dueAt) || a.localeCompare(b))
}
