import type { Generator } from './base'
import { accepted, qid } from './base'
import { CITY_RECALL_MINIMUM } from '@/domain/cityRecall'
export const cityRecall: Generator = {
  id: 'city_recall',
  category: 'cities',
  pool: (ctx) =>
    ctx.cities.filter((c) => Number(c.attributes.geonames_population) > CITY_RECALL_MINIMUM && !!c.location),
  make(target, ctx, _rng, difficulty) {
    if (!target.location) return null
    return {
      id: qid(this.id, target),
      category: 'cities',
      type: this.id,
      question_type: 'text_input',
      prompt: {
        key: 'q.city_recall',
        params: {
          name:
            (ctx.scope === 'world' ? 'der ganzen Welt' : ctx.byId.get(ctx.scope)?.names.de) ??
            ctx.byId.get(target.attributes.country ?? '')?.names.de ??
            'diesem Land',
        },
      },
      answer: target.id,
      accepted: accepted(target),
      place: {
        name: target.names.de,
        lat: target.location.lat,
        lon: target.location.lon,
        population: Number(target.attributes.geonames_population),
        geonameId: String(target.attributes.geonames),
      },
      difficulty,
      entities: [target.id],
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
