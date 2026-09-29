import type { CategoryId } from '@/engine/types'
import { CategoryIconTile } from '@/ui/icons'
import type { PuzzleDef } from './puzzles'

const PUZZLE_ART: Record<PuzzleDef['id'], CategoryId> = {
  flagle: 'flags',
  countryle: 'countries',
  outline: 'maps',
  capitale: 'capitals',
  bildle: 'images',
  kennzeichle: 'license_plates',
}

export function PuzzleArt({ puzzle, featured = false }: { puzzle: PuzzleDef['id']; featured?: boolean }) {
  return (
    <span className={`daily-puzzle-art ${featured ? 'is-featured' : ''}`} aria-hidden>
      <CategoryIconTile id={PUZZLE_ART[puzzle]} size={featured ? 'lg' : 'md'} />
    </span>
  )
}
