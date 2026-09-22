import { describe, expect, it } from 'vitest'
import { isStrongPassword, passwordChecks, safeNextPath } from './password'

describe('password policy', () => {
  it('requires length and all character groups', () => {
    expect(isStrongPassword('Kurzer1!')).toBe(false)
    expect(isStrongPassword('Eine-Lange9!Passphrase')).toBe(true)
    expect(passwordChecks('Äpfel-sind-2026-GRÜN!').lower).toBe(true)
  })
})

describe('safeNextPath', () => {
  it('allows internal paths only', () => {
    expect(safeNextPath('/passwort')).toBe('/passwort')
    expect(safeNextPath('//evil.example')).toBe('/account')
    expect(safeNextPath('https://evil.example')).toBe('/account')
    expect(safeNextPath('/\\evil.example')).toBe('/account')
  })
})
