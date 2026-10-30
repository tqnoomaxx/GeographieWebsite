import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRepository } from '@/app/useRepository'

export function FavoriteButton({ id }: { id: string }) {
  const { t } = useTranslation()
  const repo = useRepository()
  const [fav, setFav] = useState(false)
  useEffect(() => {
    let cancelled = false
    setFav(false)
    void repo.getFavorites().then((l) => { if (!cancelled) setFav(l.includes(id)) }).catch(() => {})
    return () => { cancelled = true }
  }, [id, repo])
  return (
    <button className="btn-ghost px-3 text-xl" aria-pressed={fav} aria-label={fav ? t('common.unfavorite') : t('common.favorite')} onClick={() => void repo.toggleFavorite(id).then(setFav).catch(() => {})}>
      {fav ? '♥' : '♡'}
    </button>
  )
}
