import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Object3D,
} from 'three'
import { createIslandGeometry, ISLAND_OUTLINE } from './dioramaGeometry'

export function IslandTerrain() {
  const grass = useMemo(() => createIslandGeometry('grass'), [])
  const cliff = useMemo(() => createIslandGeometry('cliff'), [])
  useEffect(
    () => () => {
      grass.dispose()
      cliff.dispose()
    },
    [grass, cliff],
  )
  return (
    <group>
      <mesh geometry={cliff} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} flatShading />
      </mesh>
      <mesh geometry={grass} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} flatShading />
      </mesh>
    </group>
  )
}

function Ocean({ night }: { night: boolean }) {
  return (
    <mesh position={[0, -3.45, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial color={night ? '#164459' : '#419bad'} roughness={0.6} metalness={0.06} />
    </mesh>
  )
}

const COAST_ROCK_POSITIONS = [0, 5, 8, 11, 14].map((index) => ISLAND_OUTLINE[index])

/** Gleiche Küstenfelsen teilen eine Geometrie und einen Draw Call. */
function CoastRocks() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    COAST_ROCK_POSITIONS.forEach(([x, z], i) => {
      object.position.set(x * 1.11, -2.9, z * 1.11)
      object.scale.set(0.4 + (i % 3) * 0.13, 0.35 + (i % 4) * 0.15, 0.38 + (i % 2) * 0.16)
      object.rotation.set(i * 0.4, i * 1.7, 0.1)
      object.updateMatrix()
      ref.current!.setMatrixAt(i, object.matrix)
      ref.current!.setColorAt(i, new Color(i % 2 ? '#7d8779' : '#9c9277'))
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [])
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, COAST_ROCK_POSITIONS.length]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} flatShading />
    </instancedMesh>
  )
}

function Lanterns({ night }: { night: boolean }) {
  const positions = [
    [-4.5, 2.8],
    [1.1, 1.8],
    [7.2, 1.5],
    [-2.4, -3.6],
  ]
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {night && i % 2 === 0 && (
            <pointLight position={[0, 0.8, 0]} color="#ffc36c" intensity={1.7} distance={3} decay={2} />
          )}
          <mesh position={[0, 0.29, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.05, 0.58, 6]} />
            <meshStandardMaterial color="#77533b" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[0.13, 0.19, 0.13]} />
            <meshStandardMaterial
              color="#ffdb8c"
              emissive="#ffbb55"
              emissiveIntensity={night ? 2.4 : 0.7}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.755, 0]} castShadow>
            <coneGeometry args={[0.14, 0.1, 4]} />
            <meshStandardMaterial color="#6d4d33" roughness={0.8} />
          </mesh>
          {night && (
            <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.38, 16]} />
              <meshBasicMaterial color="#f8c66d" transparent opacity={0.12} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

function Balloon({ moving }: { moving: boolean }) {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    if (!moving || !ref.current) return
    ref.current.position.y = 4.45 + Math.sin(state.clock.elapsedTime * 0.45) * 0.16
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.2
  })
  return (
    <group ref={ref} position={[-6.8, 4.45, -4]}>
      <group scale={[0.75, 1, 0.75]}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} castShadow>
            <sphereGeometry args={[0.64, 4, 10, (i * Math.PI) / 4, Math.PI / 4]} />
            <meshStandardMaterial color={i % 2 ? '#f6dfaa' : '#d16a48'} roughness={0.8} flatShading />
          </mesh>
        ))}
      </group>
      {[-0.14, 0.14].flatMap((x) =>
        [-0.12, 0.12].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, -0.68, z]}>
            <cylinderGeometry args={[0.012, 0.012, 0.55, 5]} />
            <meshStandardMaterial color="#a98b56" />
          </mesh>
        )),
      )}
      <mesh position={[0, -0.98, 0]} castShadow>
        <boxGeometry args={[0.35, 0.24, 0.28]} />
        <meshStandardMaterial color="#b88442" roughness={1} />
      </mesh>
    </group>
  )
}

function Waterfall({ night }: { night: boolean }) {
  const geometry = useMemo(() => {
    const vertices: number[] = [],
      indices: number[] = []
    for (let i = 0; i <= 16; i++) {
      const t = i / 16,
        z = 5.46 + Math.sin((t * Math.PI) / 2) * 0.38
      vertices.push(-0.19, 0.16 - t * 3.5, z, 0.49, 0.16 - t * 3.5, z)
      if (i < 16) {
        const a = i * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const mesh = new BufferGeometry()
    mesh.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    mesh.setIndex(indices)
    mesh.computeVertexNormals()
    return mesh
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      <mesh position={[0.15, 0.13, 5.02]} receiveShadow>
        <boxGeometry args={[0.68, 0.045, 1.02]} />
        <meshStandardMaterial color="#58c2cd" roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={night ? '#63b9d0' : '#7cdae0'}
          transparent
          opacity={0.82}
          side={DoubleSide}
          roughness={0.3}
          emissive="#267c9d"
          emissiveIntensity={night ? 0.25 : 0.06}
        />
      </mesh>
      <mesh position={[0.15, -3.36, 5.8]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.65, 1]}>
        <circleGeometry args={[0.5, 12]} />
        <meshBasicMaterial color="#dbf1e7" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function DioramaLandscape({ night, moving }: { night: boolean; moving: boolean }) {
  return (
    <group>
      <Ocean night={night} />
      <CoastRocks />
      <Lanterns night={night} />
      <Balloon moving={moving} />
      <Waterfall night={night} />
    </group>
  )
}
