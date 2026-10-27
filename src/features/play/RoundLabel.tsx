import { useTranslation } from 'react-i18next'
import { useGeoData } from '@/app/DataProvider'
import { exerciseFor, ANSWER_LABELS } from '@/config/quizCatalog'
import { quizFor } from '@/config/quizzes'
import { isCountryScope, type RoundConfig } from '@/engine/round'
import { CategoryIconTile } from '@/ui/icons'

/**
 * Einheitliche Bezeichnung einer Runde: „Flaggen · Flagge → Name“ plus „Europa · Länderflaggen · 10 Fragen“.
 * Überall gleich (Setup, Runde, Ergebnis, offene Runden, Verlauf), damit immer klar ist, welches Quiz gemeint ist.
 */
export function useRoundLabel() {
  const { t } = useTranslation()
  const geo = useGeoData()
  return (setup: RoundConfig, progress?: { done: number; total: number }) => {
    const quiz = quizFor(setup.category)
    const exercise = exerciseFor(setup.exercise)
    const title = exercise
      ? exercise.title +
        (Object.keys(exercise.variants).length > 1
          ? ' · ' + ANSWER_LABELS[setup.mode as keyof typeof ANSWER_LABELS]
          : '')
      : quiz.modes.length
        ? `${t(`category.${setup.category}`)} · ${t(`modes.${setup.mode}`)}`
        : t(`category.${setup.category}`)
    const parts: string[] =
      exercise?.scope === 'none' || quiz.geographicScope === false
        ? []
        : [
            isCountryScope(setup.scope)
              ? (geo.byId.get(setup.scope)?.names.de ?? setup.scope)
              : t(`scope.${setup.scope}`),
          ]
    if (!exercise && quiz.content && setup.content?.length === 1 && !isCountryScope(setup.scope))
      parts.push(t(`setup.content.${setup.category}.${setup.content[0]}`))
    if (setup.only) parts.push(t('play.selected_cards'))
    if (progress) parts.push(`${progress.done} / ${progress.total}`)
    else
      parts.push(
        setup.length === 'all' ? t('play.all_short') : t('play.n_questions', { count: setup.length }),
      )
    return { title, details: parts.join(' · ') }
  }
}

export function RoundTitle({
  setup,
  progress,
  icon = true,
  className = '',
}: {
  setup: RoundConfig
  progress?: { done: number; total: number }
  icon?: boolean
  className?: string
}) {
  const label = useRoundLabel()(setup, progress)
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {icon && <CategoryIconTile id={setup.category} size="sm" />}
      <div className="min-w-0">
        <p className="truncate font-medium">{label.title}</p>
        <p className="truncate text-xs text-ink-2">{label.details}</p>
      </div>
    </div>
  )
}
