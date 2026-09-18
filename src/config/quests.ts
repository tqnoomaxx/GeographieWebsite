import type { CategoryId } from '@/engine/types'

export type QuestType = 'answer_questions' | 'play_category' | 'learn_entities' | 'reach_accuracy' | 'complete_sessions'

export interface QuestDef {
  id: string
  type: QuestType
  category?: CategoryId
  scope?: string
  target: number
  reward_xp: number
  kind: 'short' | 'long'
}

export const QUESTS: QuestDef[] = [
  { id: 'flags_10', type: 'answer_questions', category: 'flags', target: 10, reward_xp: 50, kind: 'short' },
  { id: 'capitals_5', type: 'answer_questions', category: 'capitals', target: 5, reward_xp: 40, kind: 'short' },
  { id: 'countries_5', type: 'answer_questions', category: 'countries', target: 5, reward_xp: 40, kind: 'short' },
  { id: 'maps_3', type: 'answer_questions', category: 'maps', target: 3, reward_xp: 40, kind: 'short' },
  { id: 'images_5', type: 'answer_questions', category: 'images', target: 5, reward_xp: 40, kind: 'short' },
  { id: 'plates_10', type: 'answer_questions', category: 'license_plates', target: 10, reward_xp: 50, kind: 'short' },
  { id: 'learn_10', type: 'learn_entities', target: 10, reward_xp: 40, kind: 'short' },
  { id: 'sessions_3', type: 'complete_sessions', target: 3, reward_xp: 60, kind: 'short' },
  { id: 'europe_expedition', type: 'learn_entities', scope: 'europe', target: 50, reward_xp: 300, kind: 'long' },
  { id: 'africa_expedition', type: 'learn_entities', scope: 'africa', target: 50, reward_xp: 300, kind: 'long' },
  { id: 'asia_expedition', type: 'learn_entities', scope: 'asia', target: 45, reward_xp: 300, kind: 'long' },
  { id: 'americas_expedition', type: 'learn_entities', scope: 'americas', target: 50, reward_xp: 300, kind: 'long' },
  { id: 'germany_expert', type: 'learn_entities', scope: 'country:DE', target: 16, reward_xp: 200, kind: 'long' },
]
