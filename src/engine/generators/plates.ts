import type { Generator } from './base'
import { qid, effectiveDifficulty, nameOf, accepted, uniqueNames } from './base'
import type { GeneratorContext } from '../types'
import type { Entity } from '@/domain/types'

const code = (e: Entity) => e.attributes.code as string
const nameKey = (e: Entity) => `${e.attributes.country}:${nameOf(e).trim().toLocaleLowerCase('de-DE')}`
const plateGroups = (plates: Entity[]) => {
  const groups = new Map<string, Entity[]>()
  for (const plate of plates) groups.set(nameKey(plate), [...(groups.get(nameKey(plate)) ?? []), plate])
  return groups
}
const sameState = (target: Entity, ctx: GeneratorContext) => ctx.plates.filter((p) => p.id !== target.id && p.attributes.region && p.attributes.region === target.attributes.region)
const sameCountry = (target: Entity, ctx: GeneratorContext) => ctx.plates.filter((p) => p.id !== target.id && p.attributes.country === target.attributes.country)

function pick(target: Entity, ctx: GeneratorContext, rng: Parameters<Generator['make']>[2], difficulty: number): Entity[] | null {
  const near = rng.shuffle(sameState(target, ctx))
  const far = rng.shuffle(sameCountry(target, ctx).filter((p) => !near.includes(p)))
  const ordered = difficulty >= 2 ? [...near, ...far] : [...far.slice(0, 2), ...near, ...far.slice(2)]
  const seen = new Set<string>([nameOf(target)])
  const out: Entity[] = []
  for (const p of ordered) {
    if (seen.has(nameOf(p))) continue
    seen.add(nameOf(p))
    out.push(p)
    if (out.length === 3) break
  }
  return out.length === 3 ? out : null
}

export const plateToCity: Generator = {
  id: 'plate_to_city',
  category: 'license_plates',
  pool: (ctx) => ctx.plates,
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const wrong = pick(target, ctx, rng, d)
    if (!wrong) return null
    return {
      id: qid(this.id, target), category: 'license_plates', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.plate_to_city', params: { code: code(target) } }, answer: target.id,
      options: rng.shuffle([target, ...wrong]).map((e) => ({ id: e.id, label: nameOf(e) })),
      difficulty: d, entities: [target.id], explanation: (target.attributes.districts as string[])?.join(' · '),
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const cityToPlate: Generator = {
  id: 'city_to_plate',
  category: 'license_plates',
  pool: (ctx) => uniqueNames(ctx.plates),
  make(target, ctx, rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    const wrong = pick(target, ctx, rng, d)
    if (!wrong) return null
    return {
      id: qid(this.id, target), category: 'license_plates', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.city_to_plate', params: { name: nameOf(target) } }, answer: target.id,
      options: rng.shuffle([target, ...wrong]).map((e) => ({ id: e.id, label: code(e) })),
      difficulty: d, entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const plateToRegion: Generator = {
  id: 'plate_to_region',
  category: 'license_plates',
  pool: (ctx) => ctx.plates.filter((plate) => !!plate.attributes.region && ctx.byId.has(plate.attributes.region as string)),
  make(target, ctx, rng, difficulty) {
    const regionId = target.attributes.region as string | undefined
    const region = regionId ? ctx.byId.get(regionId) : undefined
    if (!region) return null
    const seen = new Set([region.id])
    const distractors: Entity[] = []
    for (const plate of rng.shuffle(ctx.plates.filter((item) => item.attributes.country === target.attributes.country))) {
      const candidateId = plate.attributes.region as string | undefined
      const candidate = candidateId ? ctx.byId.get(candidateId) : undefined
      if (!candidate || seen.has(candidate.id)) continue
      seen.add(candidate.id)
      distractors.push(candidate)
      if (distractors.length === 3) break
    }
    if (distractors.length < 3) return null
    return {
      id: qid(this.id, target), category: 'license_plates', type: this.id, question_type: 'multiple_choice',
      prompt: { key: 'q.plate_to_region', params: { code: code(target) } }, answer: region.id,
      options: rng.shuffle([region, ...distractors]).map((entity) => ({ id: entity.id, label: nameOf(entity) })),
      difficulty: effectiveDifficulty(target, difficulty), entities: [target.id, region.id],
      explanation: `${nameOf(target)} · ${nameOf(region)}`, metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const plateInput: Generator = {
  id: 'plate_input',
  category: 'license_plates',
  pool: (ctx) => ctx.plates,
  make(target, ctx, _rng, difficulty) {
    const d = effectiveDifficulty(target, difficulty)
    return {
      id: qid(this.id, target), category: 'license_plates', type: this.id, question_type: 'text_input',
      prompt: { key: 'q.plate_input', params: { code: code(target) } }, answer: target.id, accepted: accepted(target),
      difficulty: d, entities: [target.id], metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}

export const cityToPlateInput: Generator = {
  id: 'city_to_plate_input',
  category: 'license_plates',
  pool: (ctx) => [...plateGroups(ctx.plates).values()].map((group) => group[0]),
  make(target, ctx, _rng, difficulty) {
    const group = plateGroups(ctx.plates).get(nameKey(target)) ?? [target]
    const acceptedCodes = [...new Set(group.map(code))]
    return {
      id: qid(this.id, target), category: 'license_plates', type: this.id, question_type: 'text_input',
      prompt: { key: 'q.city_to_plate_input', params: { name: nameOf(target) } }, answer: code(target),
      accepted: acceptedCodes, difficulty: effectiveDifficulty(target, difficulty), entities: group.map((plate) => plate.id),
      explanation: acceptedCodes.length > 1 ? `${nameOf(target)}: ${acceptedCodes.join(' · ')}` : undefined,
      metadata: { generator: this.id, scope: ctx.scope },
    }
  },
}
