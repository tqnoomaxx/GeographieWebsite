import type { TriviaQuestion } from '@/domain/types'
import type { Generator } from './base'
import { qid } from './base'

export const geographyTrivia: Generator = {
  id: 'geography_trivia',
  category: 'trivia',
  pool: (ctx) => ctx.trivia,
  make(target, ctx, rng) {
    if (target.type !== 'trivia') return null
    const { choices, answer, explanation, difficulty } = (target as TriviaQuestion).attributes
    if (choices?.length !== 4 || !choices.some((choice) => choice.id === answer)) return null
    return {
      id: qid(this.id, target),
      category: this.category,
      type: this.id,
      question_type: 'multiple_choice',
      prompt: { key: 'q.trivia', params: { question: target.names.de } },
      options: rng.shuffle(choices),
      answer,
      difficulty,
      entities: [target.id],
      explanation,
      sources: target.provenance.source_url
        ? [{ label: target.provenance.source, url: target.provenance.source_url }]
        : undefined,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
