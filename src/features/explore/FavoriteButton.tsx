import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getRepository } from '@/services/progress/localRepository'

export function FavoriteButton({ id }: { id: string }) {
  const { t } = useTranslation()
  const [fav, setFav] = useState(false)
  useEffect(() => {
    void getRepository().getFavorites().then((l) => setFav(l.includes(id)))
  }, [id])
  return (
    <button className="btn-ghost px-3 text-xl" aria-pressed={fav} aria-label={fav ? t('common.unfavorite') : t('common.favorite')} onClick={() => void getRepository().toggleFavorite(id).then(setFav)}>
      {fav ? '♥' : '♡'}
    </button>
  )
}
