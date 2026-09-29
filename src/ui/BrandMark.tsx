import { BRAND_NAME } from '@/config/brand'

export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={`${BRAND_NAME} Zeichen`}>
      <circle cx="24" cy="24" r="16.5" fill="none" className="stroke-current" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="11" fill="none" className="stroke-current" strokeWidth="0.8" />
      <path d="M24 2v44M2 24h44" className="stroke-current" strokeWidth="1.3" />
      <path d="m24 5 4.1 14.9L43 24l-14.9 4.1L24 43l-4.1-14.9L5 24l14.9-4.1L24 5Z" className="fill-current" />
      <path d="m24 11 1.9 11.1L37 24l-11.1 1.9L24 37l-1.9-11.1L11 24l11.1-1.9L24 11Z" className="fill-bg" />
      <circle cx="24" cy="24" r="3.4" className="fill-coral" />
    </svg>
  )
}
