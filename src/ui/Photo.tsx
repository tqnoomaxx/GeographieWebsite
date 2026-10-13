import { useState, type ImgHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'

type PhotoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'> & {
  src: string
  alt: string
}

/** Keep the photo frame readable when an offline or missing image cannot be decoded. */
export function Photo({ src, alt, className = '', ...props }: PhotoProps) {
  const { t } = useTranslation()
  const [failedSource, setFailedSource] = useState<string | null>(null)
  if (!src || failedSource === src) {
    return (
      <div
        className={`grid place-items-center bg-card-2 p-4 text-center text-sm text-ink-2 ${className}`}
        role="img"
        aria-label={alt || t('common.photo_unavailable')}
        data-photo-fallback
      >
        {t('common.photo_unavailable')}
      </div>
    )
  }
  return <img {...props} src={src} alt={alt} className={className} onError={() => setFailedSource(src)} />
}
