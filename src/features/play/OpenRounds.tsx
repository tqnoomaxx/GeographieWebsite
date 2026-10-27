import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAsync } from '@/app/hooks'
import { getRepository } from '@/services/progress'
import { baseQuestionPosition, baseQuestionTotal, setupOf } from '@/engine/session'
import { RoundTitle } from './RoundLabel'
import { ProgressBar } from '@/ui'

export function OpenRounds() {
  const { data: rounds } = useAsync(() => getRepository().getOpenSessions(), [])
  if (!rounds?.length) return null
  return (
    <section className="open-rounds" aria-label="Offene Runden">
      <h2>Hier geht’s weiter</h2>
      {rounds.slice(0, 2).map((round) => {
        const done = baseQuestionPosition(round)
        const total = baseQuestionTotal(round)
        return (
          <Link
            className="open-round-link"
            key={round.id}
            to={`/play/session/${encodeURIComponent(round.id)}`}
          >
            <div>
              <RoundTitle setup={setupOf(round)} progress={{ done, total }} icon={false} />
              <ProgressBar value={done / total} className="mt-2" />
            </div>
            <span>
              Weiterspielen <ArrowRight aria-hidden />
            </span>
          </Link>
        )
      })}
    </section>
  )
}
