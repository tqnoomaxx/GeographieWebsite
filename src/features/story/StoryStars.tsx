import { Star } from 'lucide-react'

export function StoryStars({ count, large = false }: { count: number; large?: boolean }) {
  return (
    <span
      className={`story-stars${large ? ' is-large' : ''}`}
      role="img"
      aria-label={`${count} von 3 Sternen`}
    >
      {[0, 1, 2].map((i) => (
        <Star key={i} aria-hidden className={i < count ? 'is-earned' : ''} />
      ))}
    </span>
  )
}
