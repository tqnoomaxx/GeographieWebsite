-- Öffentliche Vorschläge dürfen nur über die validierende, rate-limitierte Edge Function eingehen.
drop policy if exists "suggestions_insert" on public.suggestions;
revoke insert on public.suggestions from anon, authenticated;

-- Der öffentliche Profil-View filtert weiterhin auf ausdrückliche Freigaben und erschwert Predicate-Pushdown.
alter view public.public_profiles set (security_barrier = true);
