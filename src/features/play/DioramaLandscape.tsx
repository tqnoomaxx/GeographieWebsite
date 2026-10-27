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
  PlaneGeometry,
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

function Ocean({ night, moving }: { night: boolean; moving: boolean }) {
  const ripples = useRef<Group>(null)
  const geometry = useMemo(() => {
    const mesh = new PlaneGeometry(120, 120, 48, 48)
    mesh.rotateX(-Math.PI / 2)
    const positions = mesh.getAttribute('position')
    const colors: number[] = []
    const palette = (
      night ? ['#123d56', '#16475c', '#123f54', '#164459'] : ['#398fa5', '#419bad', '#439daf', '#4098aa']
    ).map((hex) => new Color(hex))
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i)
      positions.setY(i, Math.sin(x * 1.7 + z * 0.6) * 0.045)
      const color = palette[(i * 7 + Math.floor(i / 5)) % palette.length]
      colors.push(color.r, color.g, color.b)
    }
    mesh.setAttribute('color', new Float32BufferAttribute(colors, 3))
    mesh.computeVertexNormals()
    return mesh
  }, [night])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame((state) => {
    if (!moving || !ripples.current) return
    ripples.current.children.forEach((ripple, index) => {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.7 + index) * 0.09
      ripple.scale.set(scale, scale * 0.65, 1)
    })
  })
  return (
    <group>
      <mesh position={[0, -3.45, 0]} geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.6} metalness={0.06} flatShading />
      </mesh>
      <group ref={ripples}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh
            key={i}
            position={[Math.sin(i * 2.4) * (10 + i * 0.5), -3.36, Math.cos(i * 2.4) * (7 + i * 0.4)]}
            rotation={[-Math.PI / 2, 0, i * 0.3]}
            scale={[1, 0.65, 1]}
          >
            <ringGeometry args={[0.45 + (i % 3) * 0.25, 0.47 + (i % 3) * 0.25, 24, 1, 0, Math.PI * 1.3]} />
            <meshBasicMaterial
              color={night ? '#70b9c7' : '#c4eff0'}
              transparent
              opacity={night ? 0.13 : 0.26}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Gleiche Küstenfelsen teilen eine Geometrie und einen Draw Call. */
function CoastRocks() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    ISLAND_OUTLINE.forEach(([x, z], i) => {
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
    <instancedMesh ref={ref} args={[undefined, undefined, ISLAND_OUTLINE.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} flatShading />
    </instancedMesh>
  )
}

function CliffOutcrops() {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    ISLAND_OUTLINE.forEach(([x, z], i) => {
      const [nx, nz] = ISLAND_OUTLINE[(i + 1) % ISLAND_OUTLINE.length]
      for (let j = 0; j < 2; j++) {
        const t = j ? 0.72 : 0.23
        object.position.set((x + (nx - x) * t) * 0.98, -1.18 - (i % 3) * 0.1, (z + (nz - z) * t) * 0.98)
        object.scale.set(0.7 + (i % 3) * 0.14, 1.1 + (i % 2) * 0.1, 0.7 + (i % 4) * 0.1)
        object.rotation.set(0.12, i * 0.8 + j, ((i % 3) - 1) * 0.15)
        object.updateMatrix()
        const index = i * 2 + j
        ref.current!.setMatrixAt(index, object.matrix)
        ref.current!.setColorAt(index, new Color(['#8b8472', '#777e70', '#a18f70', '#66746c'][i % 4]))
      }
    })
    ref.current.instanceMatrix.needsUpdate = true
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [])
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, ISLAND_OUTLINE.length * 2]}
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
    [-7.4, 1.7],
    [-4.5, 2.8],
    [-2.7, 2.1],
    [1.1, 1.8],
    [4.2, 2.8],
    [7.2, 1.5],
    [-5.7, -1.2],
    [-2.4, -3.6],
    [4.9, -2.4],
  ]
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {night && i % 3 === 0 && (
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

const SAIL = new Float32Array([0, 0.15, 0, 0, 0.93, 0, 0.4, 0.15, 0])
function Sailboat({ moving }: { moving: boolean }) {
  const ref = useRef<Group>(null)
  useFrame((state) => {
    if (!moving || !ref.current) return
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.035
    ref.current.position.y = 0.22 + Math.sin(state.clock.elapsedTime * 1.1) * 0.025
  })
  return (
    <group ref={ref} position={[0.35, 0.22, 3.9]} rotation={[0, -0.45, 0]}>
      <mesh scale={[1, 0.24, 0.5]} castShadow>
        <sphereGeometry args={[0.48, 10, 6]} />
        <meshStandardMaterial color="#b47b43" flatShading roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.96, 6]} />
        <meshStandardMaterial color="#85613c" />
      </mesh>
      <mesh position={[0.01, 0, 0]} castShadow>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[SAIL, 3]} />
        </bufferGeometry>
        <meshStandardMaterial color="#fff3d9" side={DoubleSide} roughness={0.85} />
      </mesh>
      <mesh position={[-0.22, 0.35, 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.22, 0.36, 3, 1]} />
        <meshStandardMaterial color="#d2764d" roughness={0.9} flatShading />
      </mesh>
    </group>
  )
}

function Waterfall({ moving, night }: { moving: boolean; night: boolean }) {
  const droplets = useRef<Group>(null)
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
  useFrame((state) => {
    if (!moving || !droplets.current) return
    droplets.current.children.forEach((drop, i) => {
      drop.position.y = 0.1 - ((state.clock.elapsedTime * 1.5 + i * 0.37) % 3.4)
    })
  })
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
      <group ref={droplets}>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={i}
            position={[-0.12 + (i % 4) * 0.15, -i * 0.35, 5.5 + i * 0.03]}
            scale={[0.035, 0.17 + (i % 2) * 0.11, 0.025]}
          >
            <sphereGeometry args={[1, 5, 4]} />
            <meshBasicMaterial color="#d5f4ed" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          position={[0.15 + Math.sin(i * 2) * 0.45, -3.24, 5.8 + Math.cos(i * 2) * 0.32]}
          scale={[0.25, 0.1, 0.21]}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#dbf1e7" roughness={0.75} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export function DioramaLandscape({ night, moving }: { night: boolean; moving: boolean }) {
  return (
    <group>
      <Ocean night={night} moving={moving} />
      <CoastRocks />
      <CliffOutcrops />
      <Lanterns night={night} />
      <Balloon moving={moving} />
      <Sailboat moving={moving} />
      <Waterfall night={night} moving={moving} />
    </group>
  )
}
