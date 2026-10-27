import { BufferGeometry, Color, Float32BufferAttribute, OrthographicCamera, Vector3, type Curve } from 'three'

export interface DioramaView {
  angle: number
  zoom: number
}
export const DEFAULT_DIORAMA_VIEW: DioramaView = { angle: 0, zoom: 1 }
export const DIORAMA_ZOOM = { min: 0.75, max: 1.65 }
export const ISLAND_OUTLINE: Array<[number, number]> = [
  [-8.1, -5.3],
  [-5.4, -5.5],
  [-1.4, -5.35],
  [2.7, -5.5],
  [7.65, -5.2],
  [8.9, -3.9],
  [9.12, -0.6],
  [9.0, 2.85],
  [8.15, 4.85],
  [4.4, 5.4],
  [0.15, 5.5],
  [-4.1, 5.5],
  [-7.9, 5.15],
  [-9.1, 3.35],
  [-9.15, -0.7],
  [-8.85, -3.9],
]

// Include the island edges, mountain upgrades and the full drift of both clouds.
export const DIORAMA_FRAME_POINTS = [
  ...[-9.5, 9.5].flatMap((x) => [-5.7, 5.7].flatMap((z) => [0, -3].map((y) => new Vector3(x, y, z)))),
  new Vector3(-7.9, 4.4, -4.9),
  new Vector3(-3.8, 4.4, -4.9),
  new Vector3(7.1, 3.8, -5.55),
  new Vector3(2.7, 4, -3.95),
  new Vector3(6.8, 3.7, -3.5),
  new Vector3(-6.8, 5.2, -4),
]

export function fitDioramaCamera(
  camera: OrthographicCamera,
  width: number,
  height: number,
  view: DioramaView = DEFAULT_DIORAMA_VIEW,
) {
  const compact = width < 750
  const padding = { top: compact ? 174 : 40, bottom: compact ? 126 : 80, side: compact ? 18 : 40 }
  camera.position.set(12, 13.5, 16)
  camera.position.applyAxisAngle(new Vector3(0, 1, 0), view.angle)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const points = DIORAMA_FRAME_POINTS.map((point) => point.clone().applyMatrix4(camera.matrixWorldInverse))
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const fittedZoom = Math.max(
    1,
    Math.min(
      (width - padding.side * 2) / (maxX - minX),
      Math.max(1, height - padding.top - padding.bottom) / (maxY - minY),
    ),
  )
  camera.zoom = fittedZoom * MathUtilsClamp(view.zoom, DIORAMA_ZOOM.min, DIORAMA_ZOOM.max)
  camera.translateX((minX + maxX) / 2)
  camera.translateY((minY + maxY) / 2 + (padding.top - padding.bottom) / (2 * camera.zoom))
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}

function MathUtilsClamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : 1))
}

/** Facetten erhalten eigene Farben und Normalen; die Insel ist kein flaches Spielbrett. */
export function createIslandGeometry(kind: 'grass' | 'cliff') {
  const positions: number[] = []
  const colors: number[] = []
  const grass = ['#7fad62', '#84b267', '#8ab66b', '#82af65', '#78a55c']
  const rock = ['#756f62', '#857d68', '#696e64', '#95886e', '#5c6863', '#a18c6b']
  let face = 0
  const triangle = (a: number[], b: number[], c: number[], palette: string[]) => {
    const color = new Color(palette[(face++ * 7 + Math.floor(face / 3)) % palette.length])
    positions.push(...a, ...b, ...c)
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b)
  }
  if (kind === 'grass') {
    const subdivide = (a: number[], b: number[], c: number[], depth: number) => {
      if (!depth) {
        triangle(a, b, c, grass)
        return
      }
      const middle = (p: number[], q: number[]) => p.map((v, i) => (v + q[i]) / 2)
      const ab = middle(a, b),
        bc = middle(b, c),
        ca = middle(c, a)
      subdivide(a, ab, ca, depth - 1)
      subdivide(ab, b, bc, depth - 1)
      subdivide(ca, bc, c, depth - 1)
      subdivide(ab, bc, ca, depth - 1)
    }
    ISLAND_OUTLINE.forEach(([x, z], i) => {
      const [nx, nz] = ISLAND_OUTLINE[(i + 1) % ISLAND_OUTLINE.length]
      subdivide([0, 0, 0], [nx, 0, nz], [x, 0, z], 2)
    })
  } else {
    const ring = (i: number, level: number) => {
      const [x, z] = ISLAND_OUTLINE[i % ISLAND_OUTLINE.length]
      const scale = [1, 1.015, 0.9, 0.66][level]
      return [x * scale, [0, -0.65, -1.75 - (i % 3) * 0.16, -2.7 + (i % 4) * 0.18][level], z * scale]
    }
    for (let level = 0; level < 3; level++) {
      ISLAND_OUTLINE.forEach((_, i) => {
        triangle(ring(i, level), ring(i + 1, level), ring(i, level + 1), rock)
        triangle(ring(i + 1, level), ring(i + 1, level + 1), ring(i, level + 1), rock)
      })
    }
    ISLAND_OUTLINE.forEach((_, i) => triangle(ring(i, 3), ring(i + 1, 3), [0, -3, 0], rock))
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  return geometry
}

/** A flat ribbon follows a curve without the raised pipe or seams of overlapping boxes. */
export function createRibbonGeometry(curve: Curve<Vector3>, width: number, y: number) {
  const positions: number[] = []
  const indices: number[] = []
  const segments = 96
  for (let index = 0; index <= segments; index++) {
    const point = curve.getPoint(index / segments)
    const tangent = curve.getTangent(index / segments)
    const side = new Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2)
    positions.push(point.x + side.x, y, point.z + side.z, point.x - side.x, y, point.z - side.z)
    if (index < segments) {
      const start = index * 2
      indices.push(start, start + 2, start + 1, start + 1, start + 2, start + 3)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
