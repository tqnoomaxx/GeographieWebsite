// Erzeugt supabase/seed.sql aus der zentralen Konfiguration (Achievements, Quests), damit Server und Client dieselben Regeln nutzen.
// Aufruf: node --experimental-strip-types scripts/supabase-seed.mts
import { writeFileSync } from 'node:fs'
import { ACHIEVEMENTS } from '../src/config/achievements.ts'
import { QUESTS } from '../src/config/quests.ts'

const esc = (v: unknown) => (v === undefined || v === null ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const lines = ['-- generiert durch scripts/supabase-seed.mts – nicht von Hand bearbeiten', '']
lines.push('insert into public.achievements (id, type, category, threshold, icon) values')
lines.push(ACHIEVEMENTS.map((a) => `  (${esc(a.id)}, ${esc(a.type)}, ${esc(a.category)}, ${a.threshold}, ${esc(a.icon)})`).join(',\n'))
lines.push('on conflict (id) do update set type = excluded.type, category = excluded.category, threshold = excluded.threshold, icon = excluded.icon;', '')
lines.push('insert into public.quests (id, type, category, scope, target, reward_xp, kind) values')
lines.push(QUESTS.map((q) => `  (${esc(q.id)}, ${esc(q.type)}, ${esc(q.category)}, ${esc(q.scope)}, ${q.target}, ${q.reward_xp}, ${esc(q.kind)})`).join(',\n'))
lines.push('on conflict (id) do update set type = excluded.type, category = excluded.category, scope = excluded.scope, target = excluded.target, reward_xp = excluded.reward_xp, kind = excluded.kind;', '')
writeFileSync('supabase/seed.sql', lines.join('\n'))
console.log(`seed.sql: ${ACHIEVEMENTS.length} Achievements, ${QUESTS.length} Quests`)
