import { afterEach, describe, expect, it } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { retainAssetFiles } from './retain-release-assets.mjs'
const roots = []
afterEach(() => {
  for (const path of roots) rmSync(path, { recursive: true, force: true })
  roots.length = 0
})
describe('release asset retention', () => {
  it('keeps old route chunks without replacing the current build or publishing metadata', () => {
    const root = mkdtempSync(join(tmpdir(), 'atlas-retention-test-'))
    roots.push(root)
    const old = join(root, 'old'),
      current = join(root, 'current')
    mkdirSync(old)
    mkdirSync(current)
    writeFileSync(join(old, 'Settings-Old12345.js'), 'old route')
    writeFileSync(join(old, 'index-Current1.js'), 'wrong version')
    writeFileSync(join(current, 'index-Current1.js'), 'current version')
    for (const name of [
      'index.html',
      '.env.local',
      '.env-12345678.js',
      'credentials.js',
      'accounts.json',
      'private.js.map',
    ])
      writeFileSync(join(old, name), 'must not copy')
    symlinkSync(join(old, '.env.local'), join(old, 'symlink-12345678.js'))
    expect(retainAssetFiles(old, current)).toBe(1)
    expect(readdirSync(current).sort()).toEqual(['Settings-Old12345.js', 'index-Current1.js'])
    expect(readFileSync(join(current, 'index-Current1.js'), 'utf8')).toBe('current version')
    expect(retainAssetFiles(old, current)).toBe(0)
  })
  it('supports a first deployment with no previous asset directory', () => {
    expect(retainAssetFiles('/nonexistent/atlas-previous-build', '/nonexistent/atlas-current-build')).toBe(0)
  })
})
