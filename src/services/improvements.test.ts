import { describe, expect, it } from 'vitest'
import { improvementContext } from './improvements'

describe('improvementContext', () => {
  it('keeps quiz configuration but never stores unknown parameters or fragment secrets', () => {
    const context = improvementContext(
      'Flaggen',
      '/play/flags/round?quiz=country-flags&scope=world&mode=choice&token=secret&notebook=private#secret-link',
    )
    expect(context.path).toBe('/play/flags/round?mode=choice&quiz=country-flags&scope=world')
    expect(JSON.stringify(context)).not.toContain('secret')
    expect(JSON.stringify(context)).not.toContain('private')
  })
})
