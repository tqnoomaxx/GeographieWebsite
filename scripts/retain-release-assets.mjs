import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

/** Keep only public, hashed build assets. Never overwrite current files or copy HTML/data/maps. */
export function retainAssetFiles(previous, current) {
  if (!existsSync(previous)) return 0
  mkdirSync(current, { recursive: true })
  let copied = 0
  for (const file of readdirSync(previous, { withFileTypes: true })) {
    if (
      !file.isFile() ||
      !/^[a-z0-9_][a-z0-9_.-]*-[a-z0-9_-]{8,}\.(?:js|css|woff2?|png|svg)$/i.test(file.name)
    )
      continue
    const target = join(current, file.name)
    if (!existsSync(target)) {
      copyFileSync(join(previous, file.name), target)
      copied++
    }
  }
  return copied
}

export function retainPreviousReleases(directory, repository) {
  if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repository)) throw new Error('Invalid repository')
  const runs = JSON.parse(
    execFileSync(
      'gh',
      [
        'run',
        'list',
        '--repo',
        repository,
        '--workflow',
        'deploy.yml',
        '--branch',
        'main',
        '--event',
        'push',
        '--status',
        'success',
        '--limit',
        '2',
        '--json',
        'databaseId',
      ],
      { encoding: 'utf8' },
    ),
  )
  const temporary = mkdtempSync(join(tmpdir(), 'atlas-previous-releases-'))
  let copied = 0
  try {
    for (const run of runs) {
      if (!Number.isSafeInteger(run.databaseId) || run.databaseId <= 0) throw new Error('Invalid release ID')
      const target = join(temporary, String(run.databaseId))
      try {
        execFileSync(
          'gh',
          [
            'run',
            'download',
            String(run.databaseId),
            '--repo',
            repository,
            '--name',
            'release-build',
            '--dir',
            target,
          ],
          { stdio: ['ignore', 'pipe', 'pipe'] },
        )
      } catch {
        // Artifacts expire after seven days. The client recovery handles older open tabs.
        console.log(`Previous build ${run.databaseId} is no longer available.`)
        continue
      }
      copied += retainAssetFiles(join(target, 'assets'), join(directory, 'assets'))
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
  console.log(`Retained ${copied} assets from up to two previous releases.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  retainPreviousReleases(process.argv[2] ?? 'dist', process.argv[3] ?? process.env.GITHUB_REPOSITORY ?? '')
}
