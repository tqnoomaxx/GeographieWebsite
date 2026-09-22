export const PASSWORD_MIN_LENGTH = 12
const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~"

export interface PasswordChecks {
  length: boolean
  lower: boolean
  upper: boolean
  number: boolean
  symbol: boolean
}

/** Mirrors the strongest Supabase password policy configured for this project. */
export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: [...password].some((character) => PASSWORD_SYMBOLS.includes(character)),
  }
}

export function isStrongPassword(password: string): boolean {
  return Object.values(passwordChecks(password)).every(Boolean)
}

/** Only accepts in-app paths and blocks protocol-relative/open redirects. */
export function safeNextPath(value: string | null | undefined, fallback = '/account'): string {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : fallback
}
