import { BufferGeometry, Float32BufferAttribute, OrthographicCamera, Vector3, type Curve } from 'three'

// Include the island edges, mountain upgrades and the full drift of both clouds.
export const DIORAMA_FRAME_POINTS = [
  ...[-9.2, 9.2].flatMap((x) => [-5.6, 5.6].flatMap((z) => [0, -0.9].map((y) => new Vector3(x, y, z)))),
  new Vector3(-7.9, 4.4, -4.9),
  new Vector3(-3.8, 4.4, -4.9),
  new Vector3(7.1, 3.8, -5.55),
  new Vector3(2.7, 4, -3.95),
  new Vector3(6.8, 3.7, -3.5),
]

export function fitDioramaCamera(camera: OrthographicCamera, width: number, height: number) {
  const compact = width < 750
  const padding = { top: compact ? 174 : 40, bottom: compact ? 126 : 80, side: compact ? 18 : 40 }
  camera.position.set(12, 13.5, 16)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const points = DIORAMA_FRAME_POINTS.map((point) => point.clone().applyMatrix4(camera.matrixWorldInverse))
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  camera.zoom = Math.max(
    1,
    Math.min(
      (width - padding.side * 2) / (maxX - minX),
      Math.max(1, height - padding.top - padding.bottom) / (maxY - minY),
    ),
  )
  camera.translateX((minX + maxX) / 2)
  camera.translateY((minY + maxY) / 2 + (padding.top - padding.bottom) / (2 * camera.zoom))
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
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
