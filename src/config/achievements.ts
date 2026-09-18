import type { CategoryId } from '@/engine/types'

export type AchievementType =
  | 'correct_answers'
  | 'entities_mastered'
  | 'sessions_completed'
  | 'continents_played'
  | 'full_runs'
  | 'puzzles_solved'
  | 'streak_days'
  | 'level'

export interface AchievementDef {
  id: string
  type: AchievementType
  category?: CategoryId
  threshold: number
  icon: string
}

/** Datengetrieben: neue Achievements = neue Zeilen, keine neue Logik. Texte in locales/de/common.json unter achievements.<id>. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_steps', type: 'sessions_completed', threshold: 1, icon: '🧭' },
  { id: 'flag_novice_25', type: 'correct_answers', category: 'flags', threshold: 25, icon: '🏳️' },
  { id: 'flag_expert_150', type: 'correct_answers', category: 'flags', threshold: 150, icon: '🏳️' },
  { id: 'flag_master_500', type: 'correct_answers', category: 'flags', threshold: 500, icon: '🏆' },
  { id: 'capital_keeper_50', type: 'correct_answers', category: 'capitals', threshold: 50, icon: '🏛️' },
  { id: 'capital_keeper_200', type: 'correct_answers', category: 'capitals', threshold: 200, icon: '🏛️' },
  { id: 'country_scholar_100', type: 'correct_answers', category: 'countries', threshold: 100, icon: '🌍' },
  { id: 'city_expert_25', type: 'correct_answers', category: 'cities', threshold: 25, icon: '🏙️' },
  { id: 'picture_pro_100', type: 'correct_answers', category: 'images', threshold: 100, icon: '📸' },
  { id: 'cartographer_50', type: 'correct_answers', category: 'maps', threshold: 50, icon: '🗺️' },
  { id: 'plate_expert_100', type: 'correct_answers', category: 'license_plates', threshold: 100, icon: '🚗' },
  { id: 'region_ranger_50', type: 'correct_answers', category: 'regions', threshold: 50, icon: '🧭' },
  { id: 'world_traveler', type: 'continents_played', threshold: 6, icon: '🌐' },
  { id: 'marathon_1', type: 'full_runs', threshold: 1, icon: '🏁' },
  { id: 'marathon_5', type: 'full_runs', threshold: 5, icon: '🏁' },
  { id: 'mastered_50', type: 'entities_mastered', threshold: 50, icon: '⭐' },
  { id: 'mastered_250', type: 'entities_mastered', threshold: 250, icon: '🌟' },
  { id: 'puzzle_fox_10', type: 'puzzles_solved', threshold: 10, icon: '🧩' },
  { id: 'puzzle_fox_30', type: 'puzzles_solved', threshold: 30, icon: '🧩' },
  { id: 'streak_7', type: 'streak_days', threshold: 7, icon: '🔥' },
  { id: 'streak_30', type: 'streak_days', threshold: 30, icon: '🔥' },
  { id: 'level_10', type: 'level', threshold: 10, icon: '🎖️' },
  { id: 'level_25', type: 'level', threshold: 25, icon: '🎖️' },
]
