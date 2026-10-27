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
import { createCoastBand, createIslandGeometry, ISLAND_OUTLINE } from './dioramaGeometry'
import { useDioramaMotion } from './DioramaMotion'
import { DioramaWater } from './DioramaWater'

export function IslandTerrain() {
  const grass = useMemo(() => createIslandGeometry('grass'), [])
  const cliff = useMemo(() => createIslandGeometry('cliff'), [])
  const sand = useMemo(() => createCoastBand(0.955, 1.035, -3.025), [])
  useEffect(
    () => () => {
      grass.dispose()
      cliff.dispose()
      sand.dispose()
    },
    [grass, cliff, sand],
  )
  return (
    <group>
      <mesh geometry={cliff} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} flatShading />
      </mesh>
      <mesh geometry={grass} receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} flatShading />
      </mesh>
      <mesh geometry={sand} receiveShadow>
        <meshStandardMaterial color="#e4d3a5" roughness={1} />
      </mesh>
    </group>
  )
}

function Ocean() {
  return (
    <mesh position={[0, -3.18, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 120]} />
      <DioramaWater kind="ocean" />
    </mesh>
  )
}

function Surf() {
  const clock = useDioramaMotion()
  const geometry = useMemo(() => createCoastBand(1.025, 1.13, -3.135), [])
  const uniforms = useMemo(() => ({ uTime: clock.time }), [clock])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`
        uniform float uTime; varying vec2 vUv;
        void main() {
          float wave = sin(vUv.x * 80.0 - uTime * 0.6) * 0.16 + sin(vUv.x * 150.0 + uTime * 0.3) * 0.06;
          float line = 1.0 - smoothstep(0.05, 0.2, abs(vUv.y - 0.32 - wave - sin(uTime * 0.5) * 0.06));
          float wash = (1.0 - vUv.y) * 0.15;
          float foam = 0.65 + 0.35 * sin(vUv.x * 180.0 + sin(vUv.x * 70.0));
          gl_FragColor = vec4(0.76, 0.94, 0.9, line * 0.4 * foam + wash);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `}
      />
    </mesh>
  )
}

function DistantIslets({ night }: { night: boolean }) {
  return (
    <group>
      {[
        [-13, -5, 0.7],
        [0, -14, 0.9],
      ].map(([x, z, scale], index) => (
        <group key={index} position={[x, -3.15, z]} scale={scale}>
          <mesh position={[0.2, 0, 0.15]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.55, 1.1, 1]}>
            <circleGeometry args={[1, 10]} />
            <meshStandardMaterial color={night ? '#576d70' : '#bdc8ac'} roughness={1} />
          </mesh>
          <mesh position={[0.2, -0.005, 0.15]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.55, 1.1, 1]}>
            <ringGeometry args={[1.02, 1.09, 20]} />
            <meshBasicMaterial color="#a9dfdc" transparent opacity={0.35} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.55, 0]} rotation={[0, index + 0.3, 0]} castShadow>
            <coneGeometry args={[1.4, 1.5, 5]} />
            <meshStandardMaterial color={night ? '#2e5260' : '#81aaa4'} flatShading roughness={1} />
          </mesh>
          <mesh position={[0.8, 0.1, 0.4]} scale={[1.2, 0.6, 0.9]}>
            <dodecahedronGeometry args={[0.9, 0]} />
            <meshStandardMaterial color={night ? '#31505b' : '#a1b5a0'} flatShading roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
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
  const clock = useDioramaMotion()
  useFrame(() => {
    if (!moving || !ref.current) return
    const time = clock.time.value
    ref.current.position.y = 3.4 + Math.sin(time * 0.45) * 0.16
    ref.current.rotation.y = Math.sin(time * 0.15) * 0.2
    ref.current.rotation.z = Math.sin(time * 0.4) * 0.035
  })
  return (
    <group ref={ref} position={[-6.5, 3.4, 1.4]}>
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

function Waterfall() {
  const clock = useDioramaMotion()
  const foam = useRef<Group>(null)
  useFrame(() => {
    if (!clock.running || !foam.current) return
    foam.current.children.forEach((ring, i) => {
      const phase = (clock.time.value * 0.4 + i / 3) % 1
      ring.scale.setScalar(0.65 + phase * 1.1)
    })
  })
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
        <DioramaWater kind="river" />
      </mesh>
      <mesh geometry={geometry}>
        <DioramaWater kind="fall" />
      </mesh>
      <group position={[0.15, -3.12, 5.8]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.65, 1]}>
        <mesh>
          <circleGeometry args={[0.44, 16]} />
          <meshBasicMaterial color="#d3f3e9" transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <group ref={foam}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} scale={0.65 + i * 0.35}>
              <ringGeometry args={[0.42, 0.46, 24]} />
              <meshBasicMaterial
                color="#dbf1e7"
                transparent
                opacity={0.32 - i * 0.05}
                depthWrite={false}
                side={DoubleSide}
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

export function DioramaLandscape({ night, moving }: { night: boolean; moving: boolean }) {
  return (
    <group>
      <Ocean />
      <Surf />
      <DistantIslets night={night} />
      <CoastRocks />
      <Lanterns night={night} />
      <Balloon moving={moving} />
      <Waterfall />
    </group>
  )
}
