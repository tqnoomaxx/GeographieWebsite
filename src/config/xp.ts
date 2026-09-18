/** Zentrale XP-Konfiguration. Werte nirgends sonst hart kodieren. */
export const XP = {
  correct_answer: 10,
  wrong_answer: 2,
  difficulty_bonus: { 1: 0, 2: 5, 3: 10 } as Record<number, number>,
  quiz_completed: 25,
  full_run_completed: 100,
  new_entity_seen: 1,
  learned_flashcard: 3,
  quest_completed: 50,
  achievement: 100,
  puzzle_solved_by_attempt: [60, 50, 40, 30, 20, 10],
} as const
