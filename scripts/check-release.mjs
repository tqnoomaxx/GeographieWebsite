const required = ['VITE_LEGAL_NAME', 'VITE_LEGAL_ADDRESS', 'VITE_CONTACT_EMAIL']
const missing = required.filter((key) => !process.env[key]?.trim())

const fail = (message) => {
  const fullMessage = `Release blockiert: ${message}`
  if (process.env.GITHUB_ACTIONS === 'true') {
    const escaped = fullMessage.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')
    console.error(`::error title=Release-Konfiguration unvollständig::${escaped}`)
  } else {
    console.error(fullMessage)
  }
  process.exit(1)
}

if (missing.length) {
  fail(
    `${missing.join(', ')} fehlt. Unter Settings → Secrets and variables → Actions als Repository-Variablen eintragen.`,
  )
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(process.env.VITE_CONTACT_EMAIL)) {
  fail('VITE_CONTACT_EMAIL ist ungültig.')
}

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY?.trim()
const isServiceRoleKey = (key) => {
  if (/^sb_secret_/i.test(key)) return true
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}
if (!!supabaseUrl !== !!supabaseKey) {
  fail('VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY müssen gemeinsam gesetzt sein.')
}

if (supabaseUrl) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
    fail('VITE_SUPABASE_URL muss eine HTTPS-Projekt-URL von Supabase sein.')
  }
  if (
    !process.env.VITE_SUPABASE_REGION?.trim() ||
    !/^https:\/\//i.test(process.env.VITE_SUPABASE_DPA_URL ?? '')
  ) {
    fail('Bei aktiviertem Supabase fehlen Region oder eine gültige HTTPS-DPA-URL.')
  }
  if (isServiceRoleKey(supabaseKey ?? '')) {
    fail('Ein Service-Role-Key darf niemals im Frontend stehen.')
  }
}

console.log('Release-Angaben vollständig.')
