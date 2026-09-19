import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { mediaUrl } from '@/services/data/dataService'
import type { Entity } from '@/domain/types'
import { ChevronLeft } from 'lucide-react'

export function Page({ title, children, back, action }: { title?: string; children: ReactNode; back?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-4 md:pb-10 md:pt-8">
      {(title || back) && (
        <header className="mb-5 flex items-center gap-3">
          {back && (
            <Link to={back} className="btn-ghost -ml-2 px-2" aria-label="Zurück">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          )}
          {title && <h1 className="text-3xl font-medium md:text-4xl">{title}</h1>}
          <div className="ml-auto">{action}</div>
        </header>
      )}
      {children}
    </div>
  )
}

export function Card({ children, className = '', as: As = 'div', ...rest }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' } & Record<string, unknown>) {
  return (
    <As className={`card p-4 ${className}`} {...rest}>
      {children}
    </As>
  )
}

export function ProgressBar({ value, label, className = '' }: { value: number; label?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)))
  return (
    <div className={className} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-card-2">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />
}

export function EmptyState({ icon = '🌍', title, hint, action }: { icon?: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm text-ink-2">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useTranslation()
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="font-medium">{message ?? t('common.error')}</p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}

export function Flag({ entity, className = '', size = 'md' }: { entity: Entity; className?: string; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  const flag = entity.media?.find((m) => m.kind === 'flag')
  const sizes = { xs: 'h-4', sm: 'h-6', md: 'h-10', lg: 'h-24 md:h-32', xl: 'h-40 md:h-56' }
  if (!flag) return <div className={`${sizes[size]} aspect-[3/2] rounded-md bg-card-2 ${className}`} aria-hidden />
  return (
    <img
      src={mediaUrl(flag.url)}
      alt={`Flagge ${entity.names.de}`}
      loading="lazy"
      decoding="async"
      className={`${sizes[size]} w-auto max-w-full rounded-md border border-line object-contain bg-white ${className}`}
    />
  )
}

export function Chips<T extends string | number>({ items, value, onChange, label }: { items: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={String(it.value)}
          type="button"
          role="radio"
          aria-checked={it.value === value}
          className={`chip ${it.value === value ? 'chip-active' : ''}`}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div role="status" className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-bg shadow-lg md:bottom-8">
      {message}
    </div>
  )
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const toast = msg ? <Toast message={msg} onDone={() => setMsg(null)} /> : null
  return { show: setMsg, toast }
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="card flex flex-col items-center px-3 py-4 text-center">
      <div className="text-xl font-semibold tabular-nums md:text-2xl">{value}</div>
      <div className="text-xs text-ink-2 md:text-sm">{label}</div>
    </div>
  )
}

export function SourceInfo({ label, source, url, asOf }: { label?: string; source: string; url?: string; asOf?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" className="text-ink-2 hover:text-ink" aria-label={`${t('facts.source')}: ${label ?? ''}`} onClick={() => setOpen((o) => !o)}>
        ⓘ
      </button>
      {open && (
        <span className="text-xs text-ink-2">
          {t('facts.source')}: {url ? <a className="underline" href={url} target="_blank" rel="noreferrer">{source}</a> : source}
          {asOf && ` · ${t('facts.as_of')}: ${asOf}`}
        </span>
      )}
    </span>
  )
}

export function formatNumber(n: number | undefined, unit = '') {
  if (n === undefined) return '–'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace('.', ',')} Mrd.${unit}`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} Mio.${unit}`
  return `${n.toLocaleString('de-DE')}${unit}`
}

export function typeIcon(type: string) {
  return { country: '🌍', region: '🧭', city: '🏙️', landmark: '🏛️', license_plate: '🚗', river: '🌊', lake: '🌊', mountain: '🏔️' }[type] ?? '📍'
}

export function entityPath(e: Pick<Entity, 'id' | 'type'>) {
  const [, rest] = e.id.split(':')
  const seg: Record<string, string> = { country: 'country', region: 'region', city: 'city', landmark: 'landmark', license_plate: 'plate', river: 'water', lake: 'water', mountain: 'nature' }
  return `/${seg[e.type] ?? e.type}/${encodeURIComponent(rest)}`
}
