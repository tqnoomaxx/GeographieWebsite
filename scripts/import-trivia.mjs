import { join } from 'node:path'
import { DATA, ROOT, readJson, writeJson } from './lib/common.mjs'
import { triviaExpansion } from './content/trivia-expansion.mjs'

const base = readJson(join(ROOT, 'scripts/data/trivia-base.json'))
const questions = [...base, ...triviaExpansion]
if (
  new Set(questions.map((question) => question.id)).size !== questions.length ||
  new Set(questions.map((question) => question.names.de)).size !== questions.length
)
  throw new Error('Doppelte Trivia-ID oder doppelte Frage im redaktionellen Bestand')
writeJson(join(DATA, 'entities/trivia.json'), questions)
console.log(`Trivia: ${questions.length} Fragen (${base.length} bisherige + ${triviaExpansion.length} neue)`)
