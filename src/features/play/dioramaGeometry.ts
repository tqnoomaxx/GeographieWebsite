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

// Include the island edges, mountain upgrades and the full drift of the cloud and balloon.
export const DIORAMA_FRAME_POINTS = [
  ...ISLAND_OUTLINE.flatMap(([x, z]) => [0, -3.2].map((y) => new Vector3(x * 1.035, y, z * 1.035))),
  new Vector3(7.1, 3.8, -5.55),
  new Vector3(2.7, 4, -3.95),
  new Vector3(6.8, 3.7, -3.5),
  new Vector3(-7.1, 4.25, 1.4),
  new Vector3(-5.9, 4.25, 1.4),
]

export function fitDioramaCamera(
  camera: OrthographicCamera,
  width: number,
  height: number,
  view: DioramaView = DEFAULT_DIORAMA_VIEW,
  framePadding?: { top: number; bottom: number; side: number },
) {
  const compact = width < 750
  const padding = framePadding ?? {
    top: compact ? 140 : 54,
    bottom: compact ? 126 : 90,
    side: compact ? 10 : 24,
  }
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
  const grass = ['#8cb568', '#93ba6e', '#89af64']
  const rock = ['#7c7c6c', '#918875', '#717b70', '#85816f']
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
      subdivide([0, 0, 0], [nx, 0, nz], [x, 0, z], 1)
    })
  } else {
    const ring = (i: number, level: number) => {
      const [x, z] = ISLAND_OUTLINE[i % ISLAND_OUTLINE.length]
      const scale = [1, 1 + ((i % 3) - 1) * 0.035, 0.97 + ((i % 3) - 1) * 0.018][level]
      return [x * scale, [0, -1.5 - (i % 3) * 0.12, -3.02][level], z * scale]
    }
    for (let level = 0; level < 2; level++) {
      ISLAND_OUTLINE.forEach((_, i) => {
        const faceColor = [rock[i % rock.length]]
        triangle(ring(i, level), ring(i + 1, level), ring(i, level + 1), faceColor)
        triangle(ring(i + 1, level), ring(i + 1, level + 1), ring(i, level + 1), faceColor)
      })
    }
    ISLAND_OUTLINE.forEach((_, i) => triangle(ring(i, 2), ring(i + 1, 2), [0, -3.02, 0], rock))
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  return geometry
}

/** A continuous shore follows the same silhouette as the cliff, including seam-safe UVs. */
export function createCoastBand(inner: number, outer: number, y: number) {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = []
  const count = ISLAND_OUTLINE.length
  for (let i = 0; i <= count; i++) {
    const [x, z] = ISLAND_OUTLINE[i % count]
    positions.push(x * inner, y, z * inner, x * outer, y, z * outer)
    uvs.push(i / count, 0, i / count, 1)
    if (i < count) {
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
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
