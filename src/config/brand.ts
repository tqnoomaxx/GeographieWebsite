export const BRAND_NAME = 'Atlasfunke'
export const BRAND_TAGLINE = 'Die Welt im Kopf. Den Funken im Blick.'

const value = (key: string) => String(import.meta.env[key] ?? '').trim()
const lines = (key: string) => value(key).replace(/\\n/g, '\n')

export const LEGAL = {
  operator: value('VITE_LEGAL_NAME'),
  address: lines('VITE_LEGAL_ADDRESS'),
  email: value('VITE_CONTACT_EMAIL'),
  extraImprint: lines('VITE_LEGAL_EXTRA'),
  hostingProvider: value('VITE_HOSTING_PROVIDER') || 'GitHub, Inc.',
  hostingPrivacyUrl: value('VITE_HOSTING_PRIVACY_URL') || 'https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement',
  supabaseRegion: value('VITE_SUPABASE_REGION'),
  supabaseDpaUrl: value('VITE_SUPABASE_DPA_URL'),
}

export const legalDetailsComplete = Boolean(LEGAL.operator && LEGAL.address && LEGAL.email)
