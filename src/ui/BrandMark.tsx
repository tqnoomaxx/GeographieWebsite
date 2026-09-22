import { BRAND_NAME } from '@/config/brand'

export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={`${BRAND_NAME} Zeichen`}>
      <rect width="48" height="48" rx="15" className="fill-accent" />
      <path d="M24 8 27.7 20.3 40 24l-12.3 3.7L24 40l-3.7-12.3L8 24l12.3-3.7L24 8Z" className="fill-bg" />
      <path d="m24 13 2.2 8.8L35 24l-8.8 2.2L24 35l-2.2-8.8L13 24l8.8-2.2L24 13Z" className="fill-coral" />
      <circle cx="24" cy="24" r="3.5" className="fill-gold" />
    </svg>
  )
}
