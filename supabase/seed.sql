-- generiert durch scripts/supabase-seed.mts – nicht von Hand bearbeiten

insert into public.achievements (id, type, category, threshold, icon) values
  ('first_steps', 'sessions_completed', null, 1, '🧭'),
  ('flag_novice_25', 'correct_answers', 'flags', 25, '🏳️'),
  ('flag_expert_150', 'correct_answers', 'flags', 150, '🏳️'),
  ('flag_master_500', 'correct_answers', 'flags', 500, '🏆'),
  ('capital_keeper_50', 'correct_answers', 'capitals', 50, '🏛️'),
  ('capital_keeper_200', 'correct_answers', 'capitals', 200, '🏛️'),
  ('country_scholar_100', 'correct_answers', 'countries', 100, '🌍'),
  ('city_expert_25', 'correct_answers', 'cities', 25, '🏙️'),
  ('picture_pro_100', 'correct_answers', 'images', 100, '📸'),
  ('cartographer_50', 'correct_answers', 'maps', 50, '🗺️'),
  ('plate_expert_100', 'correct_answers', 'license_plates', 100, '🚗'),
  ('water_wise_50', 'correct_answers', 'water', 50, '🌊'),
  ('summit_50', 'correct_answers', 'nature', 50, '🏔️'),
  ('region_ranger_50', 'correct_answers', 'regions', 50, '🧭'),
  ('world_traveler', 'continents_played', null, 6, '🌐'),
  ('marathon_1', 'full_runs', null, 1, '🏁'),
  ('marathon_5', 'full_runs', null, 5, '🏁'),
  ('mastered_50', 'entities_mastered', null, 50, '⭐'),
  ('mastered_250', 'entities_mastered', null, 250, '🌟'),
  ('puzzle_fox_10', 'puzzles_solved', null, 10, '🧩'),
  ('puzzle_fox_30', 'puzzles_solved', null, 30, '🧩'),
  ('streak_7', 'streak_days', null, 7, '🔥'),
  ('streak_30', 'streak_days', null, 30, '🔥'),
  ('level_10', 'level', null, 10, '🎖️'),
  ('level_25', 'level', null, 25, '🎖️')
on conflict (id) do update set type = excluded.type, category = excluded.category, threshold = excluded.threshold, icon = excluded.icon;

insert into public.quests (id, type, category, scope, target, reward_xp, kind) values
  ('flags_10', 'answer_questions', 'flags', null, 10, 50, 'short'),
  ('capitals_5', 'answer_questions', 'capitals', null, 5, 40, 'short'),
  ('countries_5', 'answer_questions', 'countries', null, 5, 40, 'short'),
  ('maps_3', 'answer_questions', 'maps', null, 3, 40, 'short'),
  ('images_5', 'answer_questions', 'images', null, 5, 40, 'short'),
  ('plates_10', 'answer_questions', 'license_plates', null, 10, 50, 'short'),
  ('water_5', 'answer_questions', 'water', null, 5, 40, 'short'),
  ('nature_5', 'answer_questions', 'nature', null, 5, 40, 'short'),
  ('learn_10', 'learn_entities', null, null, 10, 40, 'short'),
  ('sessions_3', 'complete_sessions', null, null, 3, 60, 'short'),
  ('europe_expedition', 'learn_entities', null, 'europe', 50, 300, 'long'),
  ('africa_expedition', 'learn_entities', null, 'africa', 50, 300, 'long'),
  ('asia_expedition', 'learn_entities', null, 'asia', 45, 300, 'long'),
  ('americas_expedition', 'learn_entities', null, 'americas', 50, 300, 'long'),
  ('germany_expert', 'learn_entities', null, 'country:DE', 16, 200, 'long')
on conflict (id) do update set type = excluded.type, category = excluded.category, scope = excluded.scope, target = excluded.target, reward_xp = excluded.reward_xp, kind = excluded.kind;
