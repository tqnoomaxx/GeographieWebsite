import { describe, expect, it } from 'vitest'
import { CatmullRomCurve3, OrthographicCamera, Vector3 } from 'three'
import {
  createIslandGeometry,
  createRibbonGeometry,
  DEFAULT_DIORAMA_VIEW,
  DIORAMA_FRAME_POINTS,
  DIORAMA_ZOOM,
  fitDioramaCamera,
} from './dioramaGeometry'

describe('Diorama camera framing', () => {
  it.each([
    [294, 512],
    [364, 512],
    [710, 560],
    [1406, 752],
  ])('keeps the complete island visible at %i × %i', (width, height) => {
    const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 80)
    fitDioramaCamera(camera, width, height)
    for (const point of DIORAMA_FRAME_POINTS) {
      const projected = point.clone().project(camera)
      expect(Math.abs(projected.x)).toBeLessThan(1)
      expect(Math.abs(projected.y)).toBeLessThan(1)
      expect(projected.z).toBeGreaterThan(-1)
      expect(projected.z).toBeLessThan(1)
      // The two-row mobile dock must never cover the world.
      if (width < 750) expect(((1 - projected.y) * height) / 2).toBeLessThanOrEqual(height - 126 + 0.01)
    }
  })

  it('reframes without accumulating camera offsets after a resize', () => {
    const camera = new OrthographicCamera(-700, 700, 376, -376, 0.1, 80)
    fitDioramaCamera(camera, 1400, 752)
    const position = camera.position.clone()
    fitDioramaCamera(camera, 364, 512)
    fitDioramaCamera(camera, 1400, 752)
    expect(camera.position.distanceTo(position)).toBeLessThan(0.000001)
  })

  it.each([-Math.PI, -Math.PI / 2, Math.PI / 2])('frames every station after rotating by %f', (angle) => {
    const camera = new OrthographicCamera(-182, 182, 300, -300, 0.1, 80)
    fitDioramaCamera(camera, 364, 600, { angle, zoom: 1 })
    for (const point of DIORAMA_FRAME_POINTS) {
      const projected = point.clone().project(camera)
      expect(Math.abs(projected.x)).toBeLessThan(1)
      expect(Math.abs(projected.y)).toBeLessThan(1)
    }
  })

  it('clamps zoom and returns exactly to the overview after reset', () => {
    const camera = new OrthographicCamera(-560, 560, 380, -380, 0.1, 80)
    fitDioramaCamera(camera, 1120, 760)
    const original = { position: camera.position.clone(), zoom: camera.zoom }
    fitDioramaCamera(camera, 1120, 760, { angle: 0, zoom: 100 })
    expect(camera.zoom).toBeCloseTo(original.zoom * DIORAMA_ZOOM.max)
    fitDioramaCamera(camera, 1120, 760, { angle: Math.PI / 2, zoom: 1.4 })
    fitDioramaCamera(camera, 1120, 760, DEFAULT_DIORAMA_VIEW)
    expect(camera.position.distanceTo(original.position)).toBeLessThan(0.000001)
    expect(camera.zoom).toBeCloseTo(original.zoom)
  })
})

describe('Floating island geometry', () => {
  it.each(['grass', 'cliff'] as const)('creates finite %s facets with a color per vertex', (kind) => {
    const geometry = createIslandGeometry(kind)
    const positions = geometry.getAttribute('position')
    expect(positions.count).toBeGreaterThan(100)
    expect(geometry.getAttribute('color').count).toBe(positions.count)
    for (let i = 0; i < positions.count; i++) {
      expect(Number.isFinite(positions.getX(i))).toBe(true)
      expect(Number.isFinite(positions.getY(i))).toBe(true)
      expect(Number.isFinite(positions.getZ(i))).toBe(true)
      if (kind === 'grass') expect(geometry.getAttribute('normal').getY(i)).toBeCloseTo(1)
    }
    expect(geometry.boundingBox!.max.y).toBeCloseTo(0)
    if (kind === 'cliff') expect(geometry.boundingBox!.min.y).toBeLessThanOrEqual(-2.7)
    geometry.dispose()
  })
})

describe('Diorama ribbons', () => {
  it('keeps winding river geometry flat, finite and facing upward', () => {
    const curve = new CatmullRomCurve3([
      new Vector3(-0.5, 0, -5.25),
      new Vector3(-1.35, 0, -3.2),
      new Vector3(-1.08, 0, -2.1),
      new Vector3(-1.45, 0, -1),
      new Vector3(0.15, 0, 4.2),
    ])
    const geometry = createRibbonGeometry(curve, 0.67, 0.15)
    const positions = geometry.getAttribute('position')
    const normals = geometry.getAttribute('normal')
    for (let i = 0; i < positions.count; i++) {
      expect(Number.isFinite(positions.getX(i))).toBe(true)
      expect(Number.isFinite(positions.getZ(i))).toBe(true)
      expect(positions.getY(i)).toBeCloseTo(0.15)
      expect(normals.getY(i)).toBeCloseTo(1)
    }
    geometry.dispose()
  })
})
