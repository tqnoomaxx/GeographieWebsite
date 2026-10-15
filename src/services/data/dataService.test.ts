import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('erneut abrufbare Datenpakete', () => {
  it('teilt laufende und erfolgreiche Abrufe, verwirft aber HTTP-Fehler', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json([{ id: 'ok' }]))
    vi.stubGlobal('fetch', fetch)
    const { fetchJson } = await import('./dataService')
    const failed = fetchJson('retry.json')
    expect(fetchJson('retry.json')).toBe(failed)
    await expect(failed).rejects.toThrow('503')
    const retried = fetchJson('retry.json')
    await expect(retried).resolves.toEqual([{ id: 'ok' }])
    expect(fetchJson('retry.json')).toBe(retried)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('versteckt Netzwerkfehler bei Naturdaten nicht als leere Sammlung', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(Response.json([{ id: 'river:test' }]))
    vi.stubGlobal('fetch', fetch)
    const { loadRivers } = await import('./dataService')
    await expect(loadRivers()).rejects.toThrow('offline')
    await expect(loadRivers()).resolves.toEqual([{ id: 'river:test' }])
  })

  it('kann Regionskarten nach einem Fehler erneut laden', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ region_maps: { DE: 'de-map.json' } }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ label: 'Deutschland', shapes: [] }))
    vi.stubGlobal('fetch', fetch)
    const { loadRegionMap } = await import('./dataService')
    await expect(loadRegionMap('DE')).rejects.toThrow()
    await expect(loadRegionMap('DE')).resolves.toMatchObject({ label: 'Deutschland' })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('unterscheidet fehlende Kennzeichenangebote von defekten vorhandenen Paketen', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ plates: { DE: { file: 'plates-DE.json' } } }))
        .mockResolvedValueOnce(new Response('', { status: 500 }))
        .mockResolvedValueOnce(Response.json([{ id: 'license_plate:DE-B' }])),
    )
    const { loadPlates } = await import('./plates')
    await expect(loadPlates('XX')).resolves.toEqual([])
    await expect(loadPlates('DE')).rejects.toThrow('500')
    await expect(loadPlates('DE')).resolves.toHaveLength(1)
  })
})
