const required = ['VITE_LEGAL_NAME', 'VITE_LEGAL_ADDRESS', 'VITE_CONTACT_EMAIL']
const missing = required.filter((key) => !process.env[key]?.trim())

if (missing.length) {
  console.error(`Release blockiert: ${missing.join(', ')} fehlt.`)
  process.exit(1)
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.VITE_CONTACT_EMAIL)) {
  console.error('Release blockiert: VITE_CONTACT_EMAIL ist ungültig.')
  process.exit(1)
}

if (process.env.VITE_SUPABASE_URL && (!process.env.VITE_SUPABASE_REGION || !process.env.VITE_SUPABASE_DPA_URL)) {
  console.error('Release blockiert: Bei aktiviertem Supabase fehlen VITE_SUPABASE_REGION oder VITE_SUPABASE_DPA_URL.')
  process.exit(1)
}

console.log('Release-Angaben vollständig.')
