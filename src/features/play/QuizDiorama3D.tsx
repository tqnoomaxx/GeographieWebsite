import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, RoundedBox } from '@react-three/drei'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Car,
  Dices,
  Flag,
  Globe2,
  Landmark,
  Languages,
  Mountain,
  Puzzle,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { CatmullRomCurve3, DoubleSide, MathUtils, Vector3, type Group } from 'three'
import { PLAY_QUIZZES, type QuizDef } from '@/config/quizzes'
import type { CategoryId } from '@/engine/types'

type SceneId = CategoryId | 'daily'
type Vec3 = [number, number, number]

type Station = {
  id: SceneId
  href: string
  label: string
  detail?: string
  position: Vec3
  hitbox: Vec3
}

const PLACEMENTS: Partial<Record<CategoryId, { position: Vec3; hitbox: Vec3 }>> = {
  license_plates: { position: [-6.5, 0, 2.9], hitbox: [2.6, 1.8, 2.1] },
  countries: { position: [-4.3, 0, 0.5], hitbox: [2.3, 3.1, 2.3] },
  mixed: { position: [-2.6, 0, 3.1], hitbox: [2.1, 1.2, 2.1] },
  capitals: { position: [-0.7, 0, 0.2], hitbox: [2.8, 2.7, 2.3] },
  cities: { position: [2.1, 0, 1.25], hitbox: [3.2, 2.8, 2.7] },
  water: { position: [2.3, 0, 3.75], hitbox: [3.4, 1.2, 2.2] },
  landmarks: { position: [4.75, 0, 1.7], hitbox: [2.4, 3, 2.1] },
  languages: { position: [5.8, 0, -0.75], hitbox: [2.6, 2.7, 2.2] },
  flags: { position: [6.65, 0, -3.25], hitbox: [2, 3.8, 2] },
  nature: { position: [2.25, 0, -3.6], hitbox: [4.4, 3.6, 2.8] },
}

const MENU_ICONS: Partial<Record<SceneId, LucideIcon>> = {
  flags: Flag,
  countries: Globe2,
  capitals: Landmark,
  languages: Languages,
  cities: Building2,
  landmarks: Landmark,
  water: Waves,
  nature: Mountain,
  license_plates: Car,
  mixed: Dices,
  daily: Puzzle,
}

const TREE_POSITIONS: Array<[number, number, number, number]> = [
  [-7.7, -3.5, 0.75, 1.1],
  [-7.1, -3.7, 0.6, 0.9],
  [-6.2, -3.9, 0.7, 1],
  [-5.2, -3.5, 0.62, 0.85],
  [-3.7, -3.8, 0.72, 1.05],
  [-3.15, -3.4, 0.55, 0.8],
  [-7.7, 0.25, 0.65, 0.95],
  [-7.3, 0.9, 0.52, 0.8],
  [-7.8, 1.55, 0.7, 1],
  [7.65, 0.5, 0.68, 1],
  [7.35, 1.25, 0.55, 0.82],
  [7.5, 2.1, 0.72, 1.05],
  [5.9, 3.55, 0.56, 0.82],
  [5.25, 3.75, 0.64, 0.94],
  [-0.1, -4.4, 0.58, 0.82],
  [-1.05, -4.25, 0.66, 0.98],
]

function countLabel(quiz: QuizDef, counts?: Record<string, number>) {
  const value = quiz.countKey ? counts?.[quiz.countKey] : undefined
  return value === undefined ? undefined : `${value.toLocaleString('de-DE')} Einträge`
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return reduced
}

function useCompactScene() {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 700px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)')
    const update = () => setCompact(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return compact
}

function CameraSetup({ compact }: { compact: boolean }) {
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    camera.position.set(12, 13.5, 16)
    camera.lookAt(0, 0, 0)
    if ('zoom' in camera) {
      camera.zoom = compact ? 31 : 47
      camera.updateProjectionMatrix()
    }
  }, [camera, compact])
  return null
}

function Tree({ x, z, scale, height }: { x: number; z: number; scale: number; height: number }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, height * 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, height * 0.72, 7]} />
        <meshStandardMaterial color="#795c43" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, height * 0.92, 0]} castShadow>
        <coneGeometry args={[0.5, height, 7]} />
        <meshStandardMaterial color="#275d4b" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, height * 1.34, 0]} castShadow>
        <coneGeometry args={[0.36, height * 0.78, 7]} />
        <meshStandardMaterial color="#34745c" roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

function Clouds({ moving }: { moving: boolean }) {
  const first = useRef<Group>(null)
  const second = useRef<Group>(null)
  useFrame((state) => {
    if (!moving) return
    const time = state.clock.elapsedTime
    if (first.current) first.current.position.x = -5.8 + Math.sin(time * 0.07) * 1.1
    if (second.current) second.current.position.x = 4.9 + Math.sin(time * 0.055 + 2) * 1.25
  })
  const cloud = (x: number, y: number, z: number, scale: number, ref: React.RefObject<Group | null>) => (
    <group ref={ref} position={[x, y, z]} scale={scale}>
      {[
        [-0.55, 0, 0],
        [0, 0.15, 0],
        [0.55, 0, 0],
        [0.05, -0.03, 0.35],
      ].map(([cx, cy, cz], index) => (
        <mesh key={index} position={[cx, cy, cz]}>
          <sphereGeometry args={[0.52, 10, 7]} />
          <meshStandardMaterial color="#f5f1dd" transparent opacity={0.8} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
  return (
    <group aria-hidden>
      {cloud(-5.8, 5.1, -4.4, 0.9, first)}
      {cloud(4.9, 4.4, -5.1, 0.72, second)}
    </group>
  )
}

function Ground() {
  const road = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-8.7, 0.07, 3.2),
        new Vector3(-5.1, 0.08, 2.15),
        new Vector3(-1.9, 0.08, 2.45),
        new Vector3(1.05, 0.08, 1.2),
        new Vector3(4.15, 0.08, 2.15),
        new Vector3(8.5, 0.08, 0.9),
      ]),
    [],
  )
  const river = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-2.4, 0.12, -5.3),
        new Vector3(-1.35, 0.13, -2.8),
        new Vector3(0.3, 0.13, -0.75),
        new Vector3(1.2, 0.13, 1.45),
        new Vector3(2.3, 0.13, 3.8),
        new Vector3(3.25, 0.13, 5.2),
      ]),
    [],
  )
  return (
    <group>
      <RoundedBox
        args={[18.4, 0.75, 11.2]}
        radius={0.65}
        smoothness={3}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#856f52" roughness={1} flatShading />
      </RoundedBox>
      <RoundedBox
        args={[17.9, 0.42, 10.7]}
        radius={0.58}
        smoothness={3}
        position={[0, -0.08, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#6f9767" roughness={0.98} flatShading />
      </RoundedBox>
      <mesh position={[-5.35, 0.11, -1.75]} rotation={[0, 0.28, 0]} receiveShadow>
        <cylinderGeometry args={[3.7, 4.05, 0.34, 9]} />
        <meshStandardMaterial color="#7ca66f" roughness={1} flatShading />
      </mesh>
      <mesh position={[3.75, 0.13, -1.2]} rotation={[0, -0.18, 0]} receiveShadow>
        <cylinderGeometry args={[4.1, 4.45, 0.38, 10]} />
        <meshStandardMaterial color="#759d68" roughness={1} flatShading />
      </mesh>
      <mesh receiveShadow>
        <tubeGeometry args={[road, 80, 0.25, 8, false]} />
        <meshStandardMaterial color="#d5c7a5" roughness={0.9} />
      </mesh>
      <mesh receiveShadow>
        <tubeGeometry args={[river, 70, 0.32, 9, false]} />
        <meshStandardMaterial color="#4d91a0" roughness={0.3} metalness={0.12} />
      </mesh>
      {TREE_POSITIONS.map(([x, z, scale, height], index) => (
        <Tree key={index} x={x} z={z} scale={scale} height={height} />
      ))}
    </group>
  )
}

function material(color: string, active: boolean, metalness = 0) {
  return (
    <meshStandardMaterial
      color={active ? '#f0cc78' : color}
      emissive={active ? '#8ccfc4' : '#000000'}
      emissiveIntensity={active ? 0.3 : 0}
      roughness={0.72}
      metalness={metalness}
      flatShading
    />
  )
}

function Observatory({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        {material('#e6dfc9', active)}
        <cylinderGeometry args={[0.72, 0.82, 1, 10]} />
      </mesh>
      <mesh position={[0, 1.05, 0]} scale={[1, 0.55, 1]} castShadow>
        {material('#9fc2c2', active, 0.12)}
        <sphereGeometry args={[0.72, 12, 8]} />
      </mesh>
      <mesh position={[0.15, 1.43, -0.02]} rotation={[0, 0, -0.7]} castShadow>
        {material('#4c5960', active, 0.35)}
        <cylinderGeometry args={[0.12, 0.18, 1.1, 8]} />
      </mesh>
      <mesh position={[0.5, 1.77, 0]} rotation={[0, 0, -0.7]} castShadow>
        {material('#d8a65b', active, 0.15)}
        <cylinderGeometry args={[0.32, 0.32, 0.12, 12]} />
      </mesh>
    </group>
  )
}

function GlobeStation({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.35, 0]} castShadow>
        {material('#d5c4a0', active)}
        <cylinderGeometry args={[0.55, 0.8, 0.24, 10]} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        {material('#438a8e', active, 0.08)}
        <sphereGeometry args={[0.92, 14, 10]} />
      </mesh>
      <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0.2, 0]}>
        {material('#e8d69b', active, 0.25)}
        <torusGeometry args={[1.02, 0.045, 6, 28]} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        {material('#735f4a', active)}
        <cylinderGeometry args={[0.09, 0.11, 0.9, 8]} />
      </mesh>
    </group>
  )
}

function CompassStation({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.13, 0]} castShadow receiveShadow>
        {material('#ead9ab', active, 0.08)}
        <cylinderGeometry args={[0.95, 1.05, 0.24, 16]} />
      </mesh>
      <mesh position={[0, 0.28, 0]} rotation={[0, 0.78, 0]}>
        {material('#ad4f42', active, 0.05)}
        <boxGeometry args={[0.22, 0.12, 1.35]} />
      </mesh>
      <mesh position={[0, 0.29, 0]} rotation={[0, -0.78, 0]}>
        {material('#315c63', active, 0.05)}
        <boxGeometry args={[0.2, 0.13, 1.05]} />
      </mesh>
    </group>
  )
}

function CapitolStation({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.18, 0]} castShadow>
        {material('#d9cfb9', active)}
        <boxGeometry args={[2.1, 0.35, 1.45]} />
      </mesh>
      {[-0.7, -0.23, 0.23, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.92, 0.42]} castShadow>
          {material('#eee6d0', active)}
          <cylinderGeometry args={[0.12, 0.15, 1.25, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]} castShadow>
        {material('#c3b48e', active)}
        <cylinderGeometry args={[0.72, 0.92, 0.28, 10]} />
      </mesh>
      <mesh position={[0, 1.82, 0]} scale={[1, 0.58, 1]} castShadow>
        {material('#7c9b91', active, 0.12)}
        <sphereGeometry args={[0.72, 12, 8]} />
      </mesh>
      <mesh position={[0, 1.2, -0.28]} castShadow>
        {material('#d9cfb9', active)}
        <boxGeometry args={[1.65, 1.65, 0.85]} />
      </mesh>
    </group>
  )
}

function CityStation({ active }: { active: boolean }) {
  const buildings: Array<[number, number, number, number, string]> = [
    [-0.85, 0.55, 0.2, 1.1, '#c66f54'],
    [-0.25, 0.85, -0.15, 1.7, '#e0c788'],
    [0.42, 0.65, 0.18, 1.3, '#73958d'],
    [0.92, 1.05, -0.22, 2.1, '#a75f51'],
  ]
  return (
    <group>
      {buildings.map(([x, y, z, height, color], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, y, 0]} castShadow>
            {material(color, active)}
            <boxGeometry args={[0.55, height, 0.65]} />
          </mesh>
          <mesh position={[0, height + 0.1, 0]} castShadow>
            {material('#4f625b', active)}
            <coneGeometry args={[0.48, 0.32, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function LandmarkStation({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[-0.65, 0.85, 0]} castShadow>
        {material('#d8c49e', active)}
        <boxGeometry args={[0.5, 1.7, 0.8]} />
      </mesh>
      <mesh position={[0.65, 0.85, 0]} castShadow>
        {material('#d8c49e', active)}
        <boxGeometry args={[0.5, 1.7, 0.8]} />
      </mesh>
      <mesh position={[0, 1.58, 0]} castShadow>
        {material('#d8c49e', active)}
        <boxGeometry args={[1.8, 0.42, 0.85]} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        {material('#b16b4f', active)}
        <boxGeometry args={[2.05, 0.22, 1]} />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        {material('#c6ad7b', active)}
        <boxGeometry args={[2.25, 0.28, 1.1]} />
      </mesh>
    </group>
  )
}

function LibraryStation({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.65, 0]} castShadow>
        {material('#b96950', active)}
        <boxGeometry args={[2, 1.3, 1.35]} />
      </mesh>
      <mesh position={[0, 1.46, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        {material('#475e59', active)}
        <coneGeometry args={[1.25, 0.65, 4]} />
      </mesh>
      {[-0.62, 0, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.7]}>
          {material('#f0dcae', active)}
          <boxGeometry args={[0.28, 0.72, 0.08]} />
        </mesh>
      ))}
      <mesh position={[0, 0.66, 0.76]}>
        {material('#3c4d4a', active)}
        <boxGeometry args={[0.34, 0.9, 0.1]} />
      </mesh>
    </group>
  )
}

function FlagStation({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        {material('#b4a78e', active)}
        <cylinderGeometry args={[0.62, 0.82, 1, 6]} />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        {material('#59665f', active, 0.35)}
        <cylinderGeometry args={[0.045, 0.055, 2.8, 8]} />
      </mesh>
      <mesh position={[0.5, 2.35, 0]} castShadow>
        {material('#b94f47', active, 0.04)}
        <boxGeometry args={[1, 0.62, 0.06]} />
      </mesh>
      <mesh position={[0, 0.07, 0]} castShadow>
        {material('#d4c39e', active)}
        <cylinderGeometry args={[0.95, 1.05, 0.15, 8]} />
      </mesh>
    </group>
  )
}

function MountainStation({ active }: { active: boolean }) {
  const peaks: Array<[number, number, number, number]> = [
    [-1.25, 0.9, 0.15, 1.8],
    [0, 1.45, -0.12, 2.9],
    [1.25, 1.05, 0.2, 2.1],
  ]
  return (
    <group>
      {peaks.map(([x, y, z, height], index) => (
        <group key={index} position={[x, 0, z]}>
          <mesh position={[0, y, 0]} castShadow>
            {material(index === 1 ? '#60746d' : '#6f8378', active)}
            <coneGeometry args={[height * 0.62, height, 6]} />
          </mesh>
          <mesh position={[0, height * 0.86, 0]} castShadow>
            {material('#f1ead8', active)}
            <coneGeometry args={[height * 0.22, height * 0.35, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function WaterStation({ active }: { active: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.11, 0]} scale={[1.7, 1, 1]} receiveShadow>
        {material('#4e99a8', active, 0.12)}
        <cylinderGeometry args={[1.05, 1.12, 0.18, 18]} />
      </mesh>
      <mesh position={[0.18, 0.38, 0]} rotation={[0, -0.35, 0]} castShadow>
        {material('#f0dfb3', active)}
        <boxGeometry args={[1.1, 0.18, 0.38]} />
      </mesh>
      <mesh position={[0.18, 0.78, 0]} rotation={[0, -0.35, 0]} castShadow>
        {material('#c65d4c', active)}
        <coneGeometry args={[0.42, 0.8, 3]} />
      </mesh>
      <mesh position={[0.18, 0.75, 0]} rotation={[0, -0.35, Math.PI / 2]}>
        {material('#5a5146', active)}
        <cylinderGeometry args={[0.035, 0.035, 1, 6]} />
      </mesh>
    </group>
  )
}

function CarStation({ active }: { active: boolean }) {
  return (
    <group rotation={[0, 0.18, 0]}>
      <mesh position={[0, 0.46, 0]} castShadow>
        {material('#b55347', active, 0.12)}
        <boxGeometry args={[2.05, 0.55, 1]} />
      </mesh>
      <mesh position={[-0.2, 0.88, 0]} castShadow>
        {material('#a9ced0', active, 0.08)}
        <boxGeometry args={[1.05, 0.45, 0.88]} />
      </mesh>
      {[-0.67, 0.67].flatMap((x) =>
        [-0.55, 0.55].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, 0.16, 12]} />
            <meshStandardMaterial color="#222826" roughness={0.9} />
          </mesh>
        )),
      )}
      <mesh position={[1.035, 0.43, 0]} rotation={[0, Math.PI / 2, 0]}>
        {material('#f4e8c6', active, 0.18)}
        <boxGeometry args={[0.04, 0.22, 0.55]} />
      </mesh>
    </group>
  )
}

function StationModel({ id, active }: { id: SceneId; active: boolean }) {
  switch (id) {
    case 'daily':
      return <Observatory active={active} />
    case 'countries':
      return <GlobeStation active={active} />
    case 'mixed':
      return <CompassStation active={active} />
    case 'capitals':
      return <CapitolStation active={active} />
    case 'cities':
      return <CityStation active={active} />
    case 'landmarks':
      return <LandmarkStation active={active} />
    case 'languages':
      return <LibraryStation active={active} />
    case 'flags':
      return <FlagStation active={active} />
    case 'nature':
      return <MountainStation active={active} />
    case 'water':
      return <WaterStation active={active} />
    case 'license_plates':
      return <CarStation active={active} />
    default:
      return null
  }
}

function InteractiveStation({
  station,
  active,
  reducedMotion,
  onActivate,
  onDeactivate,
  onOpen,
}: {
  station: Station
  active: boolean
  reducedMotion: boolean
  onActivate: () => void
  onDeactivate: () => void
  onOpen: () => void
}) {
  const model = useRef<Group>(null)
  useFrame((_state, delta) => {
    const group = model.current
    if (!group) return
    const target = active ? 1.09 : 1
    if (reducedMotion) group.scale.setScalar(target)
    else group.scale.setScalar(MathUtils.damp(group.scale.x, target, 8, delta))
  })

  const hover = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (event.nativeEvent.pointerType !== 'touch') onActivate()
  }

  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const touchLike = window.matchMedia('(hover: none), (pointer: coarse)').matches
    if (touchLike && !active) {
      onActivate()
      return
    }
    onOpen()
  }

  const leave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (event.nativeEvent.pointerType !== 'touch') onDeactivate()
  }

  return (
    <group position={station.position}>
      <group ref={model}>
        <StationModel id={station.id} active={active} />
      </group>
      <mesh
        position={[0, station.hitbox[1] / 2, 0]}
        onPointerOver={hover}
        onPointerOut={leave}
        onClick={click}
      >
        <boxGeometry args={station.hitbox} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {active ? (
        <pointLight position={[0, 2.3, 0]} color="#9ee8dc" intensity={1.5} distance={4.5} decay={2} />
      ) : null}
    </group>
  )
}

function DioramaScene({
  stations,
  active,
  reducedMotion,
  compact,
  moving,
  onActive,
  onOpen,
}: {
  stations: Station[]
  active?: SceneId
  reducedMotion: boolean
  compact: boolean
  moving: boolean
  onActive: (id?: SceneId) => void
  onOpen: (href: string) => void
}) {
  return (
    <>
      <CameraSetup compact={compact} />
      <color attach="background" args={['#b9d3d0']} />
      <fog attach="fog" args={['#b9d3d0', 18, 34]} />
      <hemisphereLight args={['#eef6e8', '#4a5545', 2.1]} />
      <directionalLight
        position={[-6, 13, 8]}
        intensity={3.1}
        color="#fff0c8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Ground />
      <Clouds moving={moving} />
      <InteractiveStation
        station={{
          id: 'daily',
          href: '/daily',
          label: '',
          position: [-6.15, 0, -2.15],
          hitbox: [2.4, 3.1, 2.2],
        }}
        active={active === 'daily'}
        reducedMotion={reducedMotion}
        onActivate={() => onActive('daily')}
        onDeactivate={() => onActive(undefined)}
        onOpen={() => onOpen('/daily')}
      />
      {stations
        .filter((station) => station.id !== 'daily')
        .map((station) => (
          <InteractiveStation
            key={station.id}
            station={station}
            active={active === station.id}
          reducedMotion={reducedMotion}
          onActivate={() => onActive(station.id)}
          onDeactivate={() => onActive(undefined)}
          onOpen={() => onOpen(station.href)}
          />
        ))}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.34}
        scale={20}
        blur={2.8}
        far={9}
        resolution={512}
        frames={1}
      />
      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={() => onActive(undefined)}>
        <planeGeometry args={[26, 19]} />
        <meshBasicMaterial transparent opacity={0} side={DoubleSide} depthWrite={false} />
      </mesh>
    </>
  )
}

function SceneFallback({ children }: { children: ReactNode }) {
  return <div className="play-diorama-loading">{children}</div>
}

export default function QuizDiorama3D({ counts }: { counts?: Record<string, number> }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const compact = useCompactScene()
  const [active, setActive] = useState<SceneId>()
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(!document.hidden)

  const stations = useMemo<Station[]>(() => {
    const quizStations = PLAY_QUIZZES.map((quiz) => {
      const placement = PLACEMENTS[quiz.id]
      if (!placement) throw new Error(`Keine Diorama-Position für sichtbares Quiz: ${quiz.id}`)
      return {
        id: quiz.id,
        href: `/play/${quiz.id}`,
        label: t(`category.${quiz.id}`),
        detail: countLabel(quiz, counts),
        ...placement,
      }
    })
    return [
      ...quizStations,
      {
        id: 'daily' as const,
        href: '/daily',
        label: t('daily.title'),
        detail: t('play.daily_count'),
        position: [-6.15, 0, -2.15] as Vec3,
        hitbox: [2.4, 3.1, 2.2] as Vec3,
      },
    ]
  }, [counts, t])

  useEffect(() => {
    const node = rootRef.current
    if (!node || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true), {
      rootMargin: '100px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  const selected = stations.find((station) => station.id === active)
  const motionEnabled = !reducedMotion && inView && pageVisible

  return (
    <div
      ref={rootRef}
      className={`quiz-diorama-3d atlas-diorama ${motionEnabled ? '' : 'is-motion-paused'}`}
      data-active-station={active}
      data-motion={motionEnabled ? 'running' : 'paused'}
      role="application"
      aria-label={t('play.diorama_label')}
    >
      <div className="quiz-diorama-canvas" aria-hidden="true">
        <Canvas
          orthographic
          shadows
          dpr={[1, 1.5]}
          frameloop={motionEnabled ? 'always' : 'demand'}
          camera={{ position: [12, 13.5, 16], zoom: compact ? 31 : 47, near: 0.1, far: 80 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          fallback={<SceneFallback>{t('play.diorama_unavailable')}</SceneFallback>}
          onPointerMissed={() => setActive(undefined)}
        >
          <DioramaScene
            stations={stations}
            active={active}
            reducedMotion={reducedMotion}
            compact={compact}
            moving={motionEnabled}
            onActive={setActive}
            onOpen={navigate}
          />
        </Canvas>
      </div>

      <div className={`quiz-diorama-context ${selected ? 'is-active' : ''}`} aria-live="polite">
        {selected ? (
          <>
            <span>{selected.id === 'daily' ? 'Bonusroute' : 'Quizstation'}</span>
            <strong>{selected.label}</strong>
            {selected.detail ? <small>{selected.detail}</small> : null}
            <Link to={selected.href}>{t('play.configure')} →</Link>
          </>
        ) : (
          <>
            <span>{t('play.view_diorama')}</span>
            <strong>{t('play.diorama_pick')}</strong>
          </>
        )}
      </div>

      <nav className="quiz-diorama-dock" aria-label={t('play.landscape_nav')}>
        {stations.map((station) => {
          const Icon = MENU_ICONS[station.id] ?? Globe2
          return (
            <Link
              key={station.id}
              to={station.href}
              className={active === station.id ? 'is-active' : ''}
              data-quiz-station={station.id}
              aria-label={[station.label, station.detail, t('play.configure')].filter(Boolean).join(', ')}
              title={station.label}
              onPointerEnter={() => setActive(station.id)}
              onPointerLeave={() => setActive(undefined)}
              onFocus={() => setActive(station.id)}
              onBlur={() => setActive(undefined)}
            >
              <Icon strokeWidth={1.7} aria-hidden />
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
