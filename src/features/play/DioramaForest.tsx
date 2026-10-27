import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Matrix4, Object3D } from 'three'
import { useDioramaMotion } from './DioramaMotion'

export function DioramaForest({ trees }: { trees: Array<[number, number, number, number]> }) {
  const clock = useDioramaMotion()
  const meshes = useRef<Array<InstancedMesh | null>>([])
  const transforms = useMemo(
    () => ({ parent: new Object3D(), part: new Object3D(), matrix: new Matrix4() }),
    [],
  )
  const update = useCallback(
    (time: number) => {
      const { parent, part, matrix } = transforms
      trees.forEach(([x, z, scale, height], index) => {
        parent.position.set(x, 0, z)
        parent.scale.setScalar(scale)
        parent.rotation.z = Math.sin(time * 0.9 + x * 0.2 + z * 0.3) * 0.025
        parent.updateMatrix()
        for (let layer = 0; layer < 3; layer++) {
          part.position.set(0, height * [0.36, 0.92, 1.34][layer], 0)
          part.scale.set(1, height, 1)
          part.updateMatrix()
          matrix.multiplyMatrices(parent.matrix, part.matrix)
          meshes.current[layer]?.setMatrixAt(index, matrix)
        }
      })
      meshes.current.forEach((mesh) => {
        if (mesh) mesh.instanceMatrix.needsUpdate = true
      })
    },
    [transforms, trees],
  )
  useLayoutEffect(() => {
    update(0)
    meshes.current.forEach((mesh) => mesh?.computeBoundingSphere())
  }, [update])
  useFrame(() => {
    if (clock.running) update(clock.time.value)
  })
  return (
    <group>
      {[0, 1, 2].map((layer) => (
        <instancedMesh
          key={layer}
          ref={(mesh) => {
            meshes.current[layer] = mesh
          }}
          args={[undefined, undefined, trees.length]}
          castShadow
          frustumCulled={false}
        >
          {layer === 0 ? (
            <cylinderGeometry args={[0.09, 0.12, 0.72, 7]} />
          ) : (
            <coneGeometry args={[layer === 1 ? 0.5 : 0.36, layer === 1 ? 1 : 0.78, 7]} />
          )}
          <meshStandardMaterial color={['#795c43', '#285f45', '#3c8056'][layer]} roughness={1} flatShading />
        </instancedMesh>
      ))}
    </group>
  )
}
