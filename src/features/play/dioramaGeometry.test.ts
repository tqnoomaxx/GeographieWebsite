import { describe, expect, it } from 'vitest'
import { CatmullRomCurve3, OrthographicCamera, Vector3 } from 'three'
import { createRibbonGeometry, DIORAMA_FRAME_POINTS, fitDioramaCamera } from './dioramaGeometry'

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
