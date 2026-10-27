import { useReducedMotion } from '@/services/settings/motion'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { RoundedBox, useTexture } from '@react-three/drei'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Building2,
  Car,
  Dices,
  Flag,
  Globe2,
  Landmark,
  Languages,
  Lightbulb,
  Mountain,
  Puzzle,
  Waves,
  ArrowRight,
  Compass,
  Crosshair,
  Moon,
  Sun,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Pause,
  Play,
  type LucideIcon,
} from 'lucide-react'
import {
  CatmullRomCurve3,
  CanvasTexture,
  DoubleSide,
  MathUtils,
  MeshBasicMaterial,
  InstancedMesh,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
} from 'three'
import { PLAY_QUIZZES, type QuizDef } from '@/config/quizzes'
import type { CategoryId } from '@/engine/types'
import type { PlayStationId, StationProgress, StationProgressMap } from './stationProgress'
import {
  createRibbonGeometry,
  DEFAULT_DIORAMA_VIEW,
  DIORAMA_ZOOM,
  fitDioramaCamera,
  type DioramaView,
} from './dioramaGeometry'
import { DioramaLandscape, IslandTerrain } from './DioramaLandscape'
import { DioramaMotion, useDioramaMotion } from './DioramaMotion'
import { DioramaWater } from './DioramaWater'
import { DioramaForest } from './DioramaForest'
import './diorama.css'

type SceneId = PlayStationId
type Vec3 = [number, number, number]

const GROUND_SURFACE_Y = 0
const WATER_SURFACE_Y = GROUND_SURFACE_Y + 0.15

type Station = {
  id: SceneId
  href: string
  label: string
  detail?: string
  position: Vec3
  hitbox: Vec3
  progress?: StationProgress
}

const PLACEMENTS: Partial<Record<CategoryId, { position: Vec3; hitbox: Vec3 }>> = {
  trivia: { position: [-1.8, GROUND_SURFACE_Y, -2.65], hitbox: [2.5, 3.1, 2.3] },
  license_plates: { position: [-6.05, GROUND_SURFACE_Y, 3.05], hitbox: [3.5, 2, 2.5] },
  countries: { position: [-4.55, GROUND_SURFACE_Y, 0.1], hitbox: [2.3, 3.1, 2.3] },
  mixed: { position: [-3.2, GROUND_SURFACE_Y, 3.75], hitbox: [2.1, 1.2, 2.1] },
  capitals: { position: [1.1, GROUND_SURFACE_Y, 0.05], hitbox: [2.8, 2.7, 2.3] },
  cities: { position: [3.15, GROUND_SURFACE_Y, 1.15], hitbox: [3.2, 2.8, 2.7] },
  water: { position: [0.15, GROUND_SURFACE_Y, 3.7], hitbox: [4.2, 2.2, 2.8] },
  landmarks: { position: [5.35, GROUND_SURFACE_Y, 1.75], hitbox: [2.4, 3, 2.1] },
  languages: { position: [5.9, GROUND_SURFACE_Y, -1], hitbox: [2.6, 2.7, 2.2] },
  flags: { position: [6.8, GROUND_SURFACE_Y, -3.5], hitbox: [2, 3.8, 2] },
  nature: { position: [2.7, GROUND_SURFACE_Y, -3.95], hitbox: [4.4, 3.6, 2.8] },
}

const MENU_ICONS: Partial<Record<SceneId, LucideIcon>> = {
  trivia: Lightbulb,
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
  [-5.2, -3.5, 0.62, 0.85],
  [-3.7, -3.8, 0.72, 1.05],
  [-7.7, 0.25, 0.65, 0.95],
  [7.65, 0.5, 0.68, 1],
  [7.5, 2.1, 0.72, 1.05],
  [5.25, 3.75, 0.64, 0.94],
  [-2.25, -4.65, 0.58, 0.82],
]

function countLabel(quiz: QuizDef, counts?: Record<string, number>) {
  const value = quiz.countKey ? counts?.[quiz.countKey] : undefined
  return value === undefined
    ? undefined
    : `${value.toLocaleString('de-DE')} ${quiz.id === 'trivia' ? 'Fragen' : 'Einträge'}`
}

function stationLevelLabel(progress: StationProgress | undefined, t: TFunction) {
  if (!progress) return undefined
  return t('play.station_level', {
    level: progress.level,
    name: t(`play.station_levels.${progress.level}`),
  })
}

function stationProgressLabel(progress: StationProgress | undefined, t: TFunction) {
  if (!progress) return undefined
  const unit = t(`play.station_unit_${progress.unit}`)
  if (!progress.nextThreshold) {
    return t('play.station_masterpiece', { value: progress.value.toLocaleString('de-DE'), unit })
  }
  return t('play.station_progress', {
    value: progress.value.toLocaleString('de-DE'),
    next: progress.nextThreshold.toLocaleString('de-DE'),
    unit,
  })
}

function CameraSetup({ view, reducedMotion }: { view: DioramaView; reducedMotion: boolean }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const canvas = useThree((state) => state.gl.domElement)
  const target = useMemo(() => new OrthographicCamera(), [])
  const lastSize = useRef('')
  const changing = useRef(false)
  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return
    target.copy(camera)
    fitDioramaCamera(target, size.width, size.height, view)
    const key = `${size.width}:${size.height}`
    changing.current = !reducedMotion && lastSize.current === key
    if (!changing.current) camera.copy(target)
    lastSize.current = key
    const root = canvas.closest<HTMLElement>('.quiz-diorama-3d')
    if (root) root.dataset.camera = changing.current ? 'moving' : 'still'
    invalidate()
  }, [camera, size.width, size.height, invalidate, view, reducedMotion, target, canvas])
  useFrame((_, delta) => {
    if (!changing.current || !(camera instanceof OrthographicCamera)) return
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 12)
    camera.position.lerp(target.position, alpha)
    camera.quaternion.slerp(target.quaternion, alpha)
    camera.zoom = MathUtils.lerp(camera.zoom, target.zoom, alpha)
    if (camera.position.distanceTo(target.position) < 0.002 && Math.abs(camera.zoom - target.zoom) < 0.002) {
      camera.copy(target)
      changing.current = false
      const root = canvas.closest<HTMLElement>('.quiz-diorama-3d')
      if (root) root.dataset.camera = 'still'
    }
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    invalidate()
  })
  return null
}

/** Cache the expensive shadow pass; slow wind can share a shadow map for several frames. */
function IslandShadows({
  active,
  night,
  celebrating,
}: {
  active?: SceneId
  night: boolean
  celebrating?: SceneId
}) {
  const gl = useThree((state) => state.gl)
  const clock = useDioramaMotion()
  const elapsed = useRef(0)
  const settling = useRef(0)
  useEffect(() => {
    const previous = gl.shadowMap.autoUpdate
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      gl.shadowMap.autoUpdate = previous
    }
  }, [gl])
  useEffect(() => {
    gl.shadowMap.needsUpdate = true
    settling.current = 0.6
  }, [gl, active, night, celebrating])
  useFrame((_, delta) => {
    if (!clock.running) return
    elapsed.current += delta
    settling.current = Math.max(0, settling.current - delta)
    if (elapsed.current >= (settling.current > 0 ? 0.06 : 0.2)) {
      gl.shadowMap.needsUpdate = true
      elapsed.current = 0
    }
  })
  return null
}

function StationContactShadows({ stations }: { stations: Station[] }) {
  const resources = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    const context = canvas.getContext('2d')!
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(23, 43, 35, .65)')
    gradient.addColorStop(0.45, 'rgba(23, 43, 35, .26)')
    gradient.addColorStop(1, 'rgba(23, 43, 35, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 64, 64)
    const texture = new CanvasTexture(canvas)
    const geometry = new PlaneGeometry(1, 1)
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      toneMapped: false,
    })
    return { texture, geometry, material }
  }, [])
  useEffect(
    () => () => {
      resources.texture.dispose()
      resources.geometry.dispose()
      resources.material.dispose()
    },
    [resources],
  )
  return (
    <group dispose={null}>
      {stations.map((station) => (
        <mesh
          key={station.id}
          geometry={resources.geometry}
          material={resources.material}
          position={[station.position[0], 0.018, station.position[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[station.hitbox[0] * 1.2, station.hitbox[2] * 1.2, 1]}
        />
      ))}
    </group>
  )
}

function Tree({ x, z, scale, height }: { x: number; z: number; scale: number; height: number }) {
  const ref = useRef<Group>(null)
  const clock = useDioramaMotion()
  useFrame(() => {
    if (!clock.running || !ref.current) return
    ref.current.rotation.z = Math.sin(clock.time.value * 0.9 + x * 0.2 + z * 0.3) * 0.025
  })
  return (
    <group ref={ref} position={[x, GROUND_SURFACE_Y, z]} scale={scale}>
      <mesh position={[0, height * 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, height * 0.72, 7]} />
        <meshStandardMaterial color="#795c43" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, height * 0.92, 0]} castShadow>
        <coneGeometry args={[0.5, height, 7]} />
        <meshStandardMaterial color="#285f45" roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, height * 1.34, 0]} castShadow>
        <coneGeometry args={[0.36, height * 0.78, 7]} />
        <meshStandardMaterial color="#3c8056" roughness={0.95} flatShading />
      </mesh>
    </group>
  )
}

function Cloud({ moving }: { moving: boolean }) {
  const ref = useRef<Group>(null)
  const clock = useDioramaMotion()
  useFrame(() => {
    if (!moving || !ref.current) return
    ref.current.position.x = 4.9 + Math.sin(clock.time.value * 0.055 + 2) * 1.25
  })
  return (
    <group ref={ref} position={[4.9, 3.2, -5.1]} scale={0.72}>
      {[
        [-0.55, 0, 0],
        [0, 0.15, 0],
        [0.55, 0, 0],
      ].map(([cx, cy, cz], index) => (
        <mesh key={index} position={[cx, cy, cz]}>
          <sphereGeometry args={[0.52, 16, 12]} />
          <meshStandardMaterial color="#fff9e9" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function Ribbon({
  curve,
  width,
  y,
  color,
  water = false,
}: {
  curve: CatmullRomCurve3
  width: number
  y: number
  color: string
  water?: boolean
}) {
  const geometry = useMemo(() => createRibbonGeometry(curve, width, y), [curve, width, y])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry} receiveShadow>
      {water ? <DioramaWater kind="river" /> : <meshStandardMaterial color={color} roughness={0.96} />}
    </mesh>
  )
}

function RiverCourse({ points }: { points: Vector3[] }) {
  const curve = useMemo(() => new CatmullRomCurve3(points), [points])
  return (
    <group>
      <Ribbon curve={curve} width={0.96} y={0.035} color="#b3ae83" />
      <Ribbon curve={curve} width={0.67} y={WATER_SURFACE_Y} color="#4da6ae" water />
      {[0.3, 0.66].map((t) => {
        const point = curve.getPoint(t)
        const tangent = curve.getTangent(t)
        return (
          <mesh
            key={t}
            position={[point.x, WATER_SURFACE_Y + 0.006, point.z]}
            rotation={[-Math.PI / 2, 0, -Math.atan2(tangent.z, tangent.x)]}
          >
            <planeGeometry args={[0.28, 0.025]} />
            <meshBasicMaterial color="#c6eae2" transparent opacity={0.7} depthWrite={false} />
          </mesh>
        )
      })}
      {[-0.36, 0.36].map((x, index) => (
        <mesh key={x} position={[points[0].x + x, 0.14, points[0].z]} scale={[0.32, 0.22, 0.3]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={index ? '#8b9480' : '#9da08b'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Bridge() {
  return (
    <group position={[-0.65, 0.24, 1.85]} rotation={[0, 0.38, 0]}>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[(i - 4) * 0.17, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 0.09, 0.72]} />
          <meshStandardMaterial color={i % 2 ? '#c09b69' : '#caa876'} roughness={0.9} />
        </mesh>
      ))}
      {[-0.39, 0.39].map((z) => (
        <group key={z}>
          {[-0.66, 0, 0.66].map((x) => (
            <mesh key={x} position={[x, 0.18, z]} castShadow>
              <boxGeometry args={[0.055, 0.43, 0.055]} />
              <meshStandardMaterial color="#846b4d" roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, 0.35, z]} castShadow>
            <boxGeometry args={[1.6, 0.055, 0.055]} />
            <meshStandardMaterial color="#ad8a5c" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Ground() {
  const road = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-8.55, 0, 2.3),
        new Vector3(-5.1, 0.08, 2.15),
        new Vector3(-1.9, 0.08, 2.45),
        new Vector3(1.05, 0.08, 1.2),
        new Vector3(4.15, 0.08, 2.15),
        new Vector3(8.45, 0, 0.9),
      ]),
    [],
  )
  const riverPoints = useMemo(
    () => [
      new Vector3(-0.5, 0, -5.25),
      new Vector3(-1.15, 0, -4.35),
      new Vector3(-1.35, 0, -3.2),
      new Vector3(-1.08, 0, -2.1),
      new Vector3(-1.45, 0, -1),
      new Vector3(-1.32, 0, 0.15),
      new Vector3(-0.92, 0, 1.3),
      new Vector3(-0.18, 0, 2.55),
      new Vector3(0.15, 0, 4.2),
    ],
    [],
  )
  return (
    <group>
      <IslandTerrain />
      <Ribbon curve={road} width={0.6} y={0.025} color="#bfad85" />
      <Ribbon curve={road} width={0.45} y={0.03} color="#eee1bb" />
      <RiverCourse points={riverPoints} />
      <Bridge />
      <DioramaForest trees={TREE_POSITIONS} />
    </group>
  )
}

function material(color: string, active: boolean, metalness = 0) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={active ? '#d3aa59' : '#000000'}
      emissiveIntensity={active ? 0.17 : 0}
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
  const texture = useTexture(`${import.meta.env.BASE_URL}media/illustrations/diorama-globe.svg`, (loaded) => {
    loaded.colorSpace = SRGBColorSpace
  })
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow>
        {material('#d5c4a0', active)}
        <cylinderGeometry args={[0.55, 0.8, 0.24, 10]} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <meshStandardMaterial
          map={texture}
          roughness={0.65}
          metalness={0.06}
          emissive="#d3aa59"
          emissiveIntensity={active ? 0.15 : 0}
        />
        <sphereGeometry args={[0.92, 40, 28]} />
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

const CITY_BUILDINGS: Array<[number, number, number, number, string]> = [
  [-0.85, 0.55, 0.2, 1.1, '#c66f54'],
  [-0.25, 0.85, -0.15, 1.7, '#e0c788'],
  [0.42, 0.65, 0.18, 1.3, '#73958d'],
  [0.92, 1.05, -0.22, 2.1, '#a75f51'],
]

function CityWindows() {
  const ref = useRef<InstancedMesh>(null)
  const clock = useDioramaMotion()
  const count = CITY_BUILDINGS.reduce((n, building) => n + Math.floor(building[3] / 0.34) * 3, 0)
  useLayoutEffect(() => {
    if (!ref.current) return
    const transform = new Object3D()
    let index = 0
    for (const [x, , z, height] of CITY_BUILDINGS) {
      for (let row = 0; row < Math.floor(height / 0.34); row++) {
        for (const offset of [-0.14, 0.14]) {
          transform.position.set(x + offset, 0.26 + row * 0.32, z + 0.332)
          transform.scale.set(0.095, 0.13, 0.018)
          transform.updateMatrix()
          ref.current.setMatrixAt(index++, transform.matrix)
        }
        transform.position.set(x + 0.284, 0.26 + row * 0.32, z + 0.05)
        transform.scale.set(0.018, 0.13, 0.14)
        transform.updateMatrix()
        ref.current.setMatrixAt(index++, transform.matrix)
      }
    }
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#f4dfaa"
        emissive="#ffce79"
        emissiveIntensity={clock.night ? 0.9 : 0.12}
        roughness={0.7}
      />
    </instancedMesh>
  )
}

function CityStation({ active }: { active: boolean }) {
  return (
    <group>
      <CityWindows />
      {CITY_BUILDINGS.map(([x, y, z, height, color], index) => (
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

function FlagCloth({ active }: { active: boolean }) {
  const clock = useDioramaMotion()
  const geometry = useMemo(() => new PlaneGeometry(1, 0.62, 10, 2), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(() => {
    if (!clock.running) return
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      positions.setZ(i, Math.sin(clock.time.value * 2.8 + x * 6) * 0.07 * (x + 0.5))
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
  })
  return (
    <mesh position={[0.5, 2.35, 0]} geometry={geometry} castShadow>
      <meshStandardMaterial
        color="#c65c47"
        roughness={0.8}
        side={DoubleSide}
        emissive="#d3aa59"
        emissiveIntensity={active ? 0.17 : 0}
      />
    </mesh>
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
      <FlagCloth active={active} />
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
      <mesh position={[0, 0.065, 0]} scale={[2.05, 1, 1.3]} receiveShadow>
        {material('#456f69', active)}
        <cylinderGeometry args={[1.08, 1.16, 0.13, 32]} />
      </mesh>
      <mesh position={[0, WATER_SURFACE_Y - 0.015, 0]} scale={[1.88, 1, 1.18]} receiveShadow>
        <DioramaWater kind="lake" />
        <cylinderGeometry args={[1.04, 1.08, 0.03, 32]} />
      </mesh>
      <mesh
        position={[0.25, WATER_SURFACE_Y + 0.008, 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.45, 0.8, 1]}
      >
        <ringGeometry args={[0.46, 0.48, 48]} />
        <meshBasicMaterial color="#c6eae2" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {[
        [-1.5, 0.65],
        [1.45, 0.52],
        [1.65, -0.35],
      ].map(([x, z], index) => (
        <group key={index} position={[x, WATER_SURFACE_Y, z]}>
          {[-0.1, 0.1].map((offset) => (
            <mesh key={offset} position={[offset, 0.18, 0]} rotation={[0, 0, offset * 1.5]}>
              {material('#4e7655', active)}
              <boxGeometry args={[0.045, 0.42, 0.045]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function CarStation({ active }: { active: boolean }) {
  return (
    <group rotation={[0, -0.3, 0]} scale={0.94}>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        {material('#d1c19a', active)}
        <boxGeometry args={[4.5, 0.12, 3.3]} />
      </mesh>
      <mesh position={[0, 0.14, 0]} receiveShadow>
        {material('#4f5d59', active)}
        <boxGeometry args={[4.22, 0.08, 3.02]} />
      </mesh>
      {[-1.25, 0, 1.25].map((z) => (
        <mesh key={z} position={[0, 0.188, z]} receiveShadow>
          {material('#fff5d6', active)}
          <boxGeometry args={[3.76, 0.018, 0.065]} />
        </mesh>
      ))}
      <mesh position={[-1.88, 0.188, 0]} receiveShadow>
        {material('#fff5d6', active)}
        <boxGeometry args={[0.065, 0.018, 2.56]} />
      </mesh>
      <group position={[0, 0.11, -0.62]}>
        <RoundedBox args={[2.25, 0.5, 1]} radius={0.13} smoothness={2} position={[0, 0.52, 0]} castShadow>
          {material('#bd5144', active, 0.12)}
        </RoundedBox>
        <RoundedBox
          args={[1.08, 0.5, 0.9]}
          radius={0.1}
          smoothness={2}
          position={[-0.18, 0.92, 0]}
          castShadow
        >
          {material('#a9413a', active, 0.08)}
        </RoundedBox>
        <RoundedBox
          args={[0.68, 0.035, 0.58]}
          radius={0.02}
          smoothness={2}
          position={[-0.18, 1.185, 0]}
          castShadow
        >
          {material('#9bc8cd', active, 0.16)}
        </RoundedBox>
        <mesh position={[-0.16, 0.96, 0.465]} castShadow>
          {material('#83b6bf', active, 0.16)}
          <boxGeometry args={[0.76, 0.28, 0.035]} />
        </mesh>
        <mesh position={[0.39, 0.93, 0]} rotation={[0, Math.PI / 2, -0.08]} castShadow>
          {material('#9bc8cd', active, 0.16)}
          <boxGeometry args={[0.82, 0.31, 0.035]} />
        </mesh>
        {[-0.72, 0.72].flatMap((x) =>
          [-0.52, 0.52].map((z) => (
            <group key={`${x}-${z}`} position={[x, 0.38, z]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.3, 0.3, 0.24, 12]} />
                <meshStandardMaterial color="#202625" roughness={0.9} flatShading />
              </mesh>
              <mesh position={[0, 0.095, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.02, 10]} />
                <meshStandardMaterial color="#c4b786" roughness={0.65} metalness={0.18} />
              </mesh>
            </group>
          )),
        )}
        {[-0.3, 0.3].map((z) => (
          <mesh key={z} position={[1.13, 0.57, z]}>
            {material('#ffe4a0', active, 0.2)}
            <boxGeometry args={[0.05, 0.16, 0.18]} />
          </mesh>
        ))}
        <mesh position={[1.16, 0.43, 0]}>
          <meshStandardMaterial color="#f5edd6" roughness={0.65} />
          <boxGeometry args={[0.045, 0.18, 0.48]} />
        </mesh>
        <mesh position={[1.185, 0.43, 0]}>
          <meshStandardMaterial color="#26302e" roughness={0.65} />
          <boxGeometry args={[0.02, 0.07, 0.28]} />
        </mesh>
      </group>
    </group>
  )
}

/** Ein Wissenspavillon mit einer großen Glühbirne als eigener Trivia-Station. */
function TriviaStation({ active }: { active: boolean }) {
  return (
    <group>
      <RoundedBox args={[1.8, 0.22, 1.6]} radius={0.08} position={[0, 0.11, 0]} receiveShadow>
        {material('#b7bcab', active)}
      </RoundedBox>
      <RoundedBox args={[1.25, 0.8, 1]} radius={0.06} position={[0, 0.62, 0]} castShadow>
        {material('#496e79', active)}
      </RoundedBox>
      <mesh position={[0, 1.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        {material('#d6b27a', active)}
        <coneGeometry args={[1.04, 0.35, 4]} />
      </mesh>
      <mesh position={[0, 1.59, 0]} castShadow>
        {material('#6d7164', active, 0.35)}
        <cylinderGeometry args={[0.19, 0.24, 0.4, 12]} />
      </mesh>
      <mesh position={[0, 2.12, 0]} castShadow>
        <meshStandardMaterial
          color="#f4d279"
          roughness={0.4}
          emissive="#e9a945"
          emissiveIntensity={active ? 0.85 : 0.15}
        />
        <sphereGeometry args={[0.49, 20, 14]} />
      </mesh>
      {[-0.37, 0.37].map((x) => (
        <mesh key={x} position={[x, 0.68, 0.51]}>
          {material('#f0d995', active)}
          <boxGeometry args={[0.24, 0.32, 0.025]} />
        </mesh>
      ))}
      <mesh position={[0, 0.48, 0.515]}>
        {material('#c4b495', active)}
        <boxGeometry args={[0.24, 0.5, 0.025]} />
      </mesh>
    </group>
  )
}

function BaseStationModel({ id, active }: { id: SceneId; active: boolean }) {
  switch (id) {
    case 'trivia':
      return <TriviaStation active={active} />
    case 'daily':
      return <Observatory active={active} />
    case 'countries':
      return (
        <Suspense
          fallback={
            <mesh position={[0, 1.35, 0]}>
              <sphereGeometry args={[0.92, 16, 12]} />
              <meshStandardMaterial color="#4899a8" roughness={0.7} />
            </mesh>
          }
        >
          <GlobeStation active={active} />
        </Suspense>
      )
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

function SmallBuilding({
  position,
  height,
  color,
  active,
}: {
  position: Vec3
  height: number
  color: string
  active: boolean
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        {material(color, active)}
        <boxGeometry args={[0.48, height, 0.52]} />
      </mesh>
      <mesh position={[0, height + 0.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        {material('#485d57', active)}
        <coneGeometry args={[0.4, 0.28, 4]} />
      </mesh>
    </group>
  )
}

/** Additive Ausbauten: Jede Stufe ergänzt das vollständige Grundmotiv, statt es zu ersetzen. */
function StationUpgrades({
  id,
  level,
  active,
}: {
  id: SceneId
  level: StationProgress['level']
  active: boolean
}) {
  switch (id) {
    case 'trivia':
      return (
        <group>
          {level >= 1 ? (
            <SmallBuilding position={[-0.82, 0, 0.35]} height={0.65} color="#74959b" active={active} />
          ) : null}
          {level >= 2 ? (
            <SmallBuilding position={[0.82, 0, 0.35]} height={0.85} color="#d1aa70" active={active} />
          ) : null}
          {level >= 3 ? (
            <mesh position={[0, 2.15, 0]} rotation={[Math.PI / 2, 0.3, 0]} castShadow>
              {material('#b58b45', active, 0.35)}
              <torusGeometry args={[0.67, 0.045, 8, 32]} />
            </mesh>
          ) : null}
          {level >= 4 ? (
            <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              {material('#e0bd65', active, 0.35)}
              <torusGeometry args={[1.06, 0.07, 8, 32]} />
            </mesh>
          ) : null}
        </group>
      )
    case 'daily':
      return (
        <group>
          {level >= 1 ? (
            <SmallBuilding position={[-0.95, 0, 0.35]} height={0.72} color="#d8cfb8" active={active} />
          ) : null}
          {level >= 2 ? (
            <group position={[0.92, 0.18, 0.35]} rotation={[0, -0.35, -0.18]}>
              <mesh castShadow>
                {material('#477c86', active, 0.28)}
                <boxGeometry args={[1.05, 0.07, 0.72]} />
              </mesh>
              <mesh position={[0, -0.22, 0]}>
                {material('#64645b', active)}
                <cylinderGeometry args={[0.05, 0.05, 0.4, 6]} />
              </mesh>
            </group>
          ) : null}
          {level >= 3 ? (
            <group position={[-0.15, 0, -0.85]}>
              <mesh position={[0, 0.8, 0]} castShadow>
                {material('#5a625f', active, 0.25)}
                <cylinderGeometry args={[0.05, 0.09, 1.6, 7]} />
              </mesh>
              <mesh position={[0, 1.48, 0]}>
                {material('#d8a65b', active, 0.18)}
                <sphereGeometry args={[0.18, 8, 6]} />
              </mesh>
            </group>
          ) : null}
          {level >= 4 ? (
            <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
              {material('#e0bd65', active, 0.35)}
              <torusGeometry args={[1.45, 0.08, 7, 28]} />
            </mesh>
          ) : null}
        </group>
      )
    case 'countries':
      return (
        <group>
          {level >= 1
            ? [-1.05, 1.05].map((x) => (
                <SmallBuilding
                  key={x}
                  position={[x, 0, 0.25]}
                  height={0.58}
                  color="#d8c7a3"
                  active={active}
                />
              ))
            : null}
          {level >= 2 ? (
            <mesh position={[0, 1.35, 0]} rotation={[0.25, 0, Math.PI / 2]}>
              {material('#e8d69b', active, 0.25)}
              <torusGeometry args={[1.12, 0.035, 6, 30]} />
            </mesh>
          ) : null}
          {level >= 3 ? (
            <group>
              {[-1.2, 1.2].flatMap((x) =>
                [-0.75, 0.75].map((z) => (
                  <mesh key={`${x}-${z}`} position={[x, 0.35, z]} castShadow>
                    {material('#c4ad7f', active)}
                    <cylinderGeometry args={[0.1, 0.13, 0.7, 7]} />
                  </mesh>
                )),
              )}
            </group>
          ) : null}
          {level >= 4 ? (
            <mesh position={[0, 2.48, 0]} castShadow>
              {material('#e5bf5e', active, 0.3)}
              <octahedronGeometry args={[0.25, 0]} />
            </mesh>
          ) : null}
        </group>
      )
    case 'mixed':
      return (
        <group>
          {level >= 1 ? (
            <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              {material('#c9aa62', active, 0.16)}
              <torusGeometry args={[1.25, 0.08, 7, 24]} />
            </mesh>
          ) : null}
          {level >= 2
            ? [
                [-1.15, 0],
                [1.15, 0],
                [0, -1.15],
                [0, 1.15],
              ].map(([x, z], index) => (
                <mesh key={index} position={[x, 0.32, z]} castShadow>
                  {material('#d8c49c', active)}
                  <cylinderGeometry args={[0.11, 0.18, 0.64, 5]} />
                </mesh>
              ))
            : null}
          {level >= 3 ? (
            <mesh position={[0, 0.92, 0]} castShadow>
              {material('#4c625d', active, 0.18)}
              <cylinderGeometry args={[0.055, 0.08, 1.5, 7]} />
            </mesh>
          ) : null}
          {level >= 4 ? (
            <mesh position={[0, 1.72, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
              {material('#efca67', active, 0.3)}
              <octahedronGeometry args={[0.3, 0]} />
            </mesh>
          ) : null}
        </group>
      )
    case 'capitals':
      return (
        <group>
          {level >= 1 ? (
            <mesh position={[0, 0.08, 0.9]} castShadow>
              {material('#c8b58c', active)}
              <boxGeometry args={[2.55, 0.16, 0.48]} />
            </mesh>
          ) : null}
          {level >= 2
            ? [-1.35, 1.35].map((x) => (
                <mesh key={x} position={[x, 0.55, -0.1]} castShadow>
                  {material('#d9cfb9', active)}
                  <boxGeometry args={[0.62, 1.1, 1.15]} />
                </mesh>
              ))
            : null}
          {level >= 3
            ? [-1.35, 1.35].map((x) => (
                <mesh key={x} position={[x, 1.28, -0.1]} castShadow>
                  {material('#7c9b91', active, 0.12)}
                  <coneGeometry args={[0.43, 0.55, 6]} />
                </mesh>
              ))
            : null}
          {level >= 4 ? (
            <mesh position={[0, 2.52, 0]} castShadow>
              {material('#d7af55', active, 0.3)}
              <coneGeometry args={[0.14, 0.85, 8]} />
            </mesh>
          ) : null}
        </group>
      )
    case 'cities': {
      const additions: Array<[number, Vec3, number, string]> = [
        [1, [-1.35, 0, -0.55], 0.9, '#d2a06f'],
        [1, [1.42, 0, 0.5], 1.15, '#678d86'],
        [2, [-0.75, 0, -0.85], 1.45, '#b95f50'],
        [2, [0.65, 0, -0.92], 1.75, '#d5bd7d'],
        [3, [1.5, 0, -0.6], 2.15, '#8e6257'],
        [3, [-1.48, 0, 0.65], 1.8, '#568078'],
        [4, [0.05, 0, -1.2], 2.65, '#c86c51'],
      ]
      return (
        <group>
          {additions
            .filter(([from]) => level >= from)
            .map(([from, position, height, color], index) => (
              <SmallBuilding
                key={`${from}-${index}`}
                position={position}
                height={height}
                color={color}
                active={active}
              />
            ))}
        </group>
      )
    }
    case 'landmarks':
      return (
        <group>
          {level >= 1
            ? [-1.35, 1.35].map((x) => (
                <SmallBuilding
                  key={x}
                  position={[x, 0, -0.15]}
                  height={0.72}
                  color="#d3bd93"
                  active={active}
                />
              ))
            : null}
          {level >= 2 ? (
            <mesh position={[0, 0.08, 0.85]} castShadow>
              {material('#bfa56f', active)}
              <boxGeometry args={[2.9, 0.16, 0.55]} />
            </mesh>
          ) : null}
          {level >= 3
            ? [-1.05, 1.05].map((x) => (
                <mesh key={x} position={[x, 1.38, -0.25]} castShadow>
                  {material('#b16b4f', active)}
                  <coneGeometry args={[0.34, 0.72, 4]} />
                </mesh>
              ))
            : null}
          {level >= 4 ? (
            <mesh position={[0, 2.42, 0]} castShadow>
              {material('#e0b858', active, 0.25)}
              <boxGeometry args={[0.22, 0.82, 0.22]} />
            </mesh>
          ) : null}
        </group>
      )
    case 'languages':
      return (
        <group>
          {level >= 1
            ? [-1.25, 1.25].map((x) => (
                <mesh key={x} position={[x, 0.45, 0]} castShadow>
                  {material('#b96950', active)}
                  <boxGeometry args={[0.55, 0.9, 1.15]} />
                </mesh>
              ))
            : null}
          {level >= 2
            ? [-1.25, 1.25].map((x) => (
                <mesh key={x} position={[x, 1.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                  {material('#475e59', active)}
                  <coneGeometry args={[0.48, 0.46, 4]} />
                </mesh>
              ))
            : null}
          {level >= 3 ? (
            <mesh position={[0, 2.02, -0.25]} castShadow>
              {material('#d6c28f', active)}
              <cylinderGeometry args={[0.28, 0.38, 1.15, 8]} />
            </mesh>
          ) : null}
          {level >= 4 ? (
            <mesh position={[0, 2.75, -0.25]} scale={[1, 0.62, 1]} castShadow>
              {material('#70a39a', active, 0.18)}
              <sphereGeometry args={[0.42, 10, 7]} />
            </mesh>
          ) : null}
        </group>
      )
    case 'flags':
      return (
        <group>
          {level >= 1 ? (
            <mesh position={[0, 0.04, 0]} castShadow>
              {material('#c6b38d', active)}
              <cylinderGeometry args={[1.28, 1.38, 0.1, 8]} />
            </mesh>
          ) : null}
          {level >= 2
            ? [-0.75, 0.75].map((x) => (
                <mesh key={x} position={[x, 1.05, 0.25]} castShadow>
                  {material('#58635d', active, 0.28)}
                  <cylinderGeometry args={[0.035, 0.05, 1.8, 7]} />
                </mesh>
              ))
            : null}
          {level >= 3 ? (
            <mesh position={[0, 1.05, 0]} castShadow>
              {material('#a99b82', active)}
              <cylinderGeometry args={[0.48, 0.62, 0.45, 6]} />
            </mesh>
          ) : null}
          {level >= 4 ? (
            <mesh position={[0, 3.12, 0]} castShadow>
              {material('#e6bf57', active, 0.32)}
              <octahedronGeometry args={[0.24, 0]} />
            </mesh>
          ) : null}
        </group>
      )
    case 'nature':
      return (
        <group>
          {level >= 1 ? <Tree x={-2.05} z={0.68} scale={0.48} height={0.8} /> : null}
          {level >= 2 ? <Tree x={2.05} z={0.72} scale={0.55} height={0.92} /> : null}
          {level >= 2 ? (
            <mesh position={[-1.95, 0.55, -0.25]} castShadow>
              {material('#73887b', active)}
              <coneGeometry args={[0.72, 1.1, 6]} />
            </mesh>
          ) : null}
          {level >= 3 ? (
            <mesh position={[1.92, 0.72, -0.4]} castShadow>
              {material('#60746d', active)}
              <coneGeometry args={[0.9, 1.45, 6]} />
            </mesh>
          ) : null}
          {level >= 4 ? (
            <group position={[0, 2.92, -0.1]}>
              <mesh position={[0, 0.35, 0]} castShadow>
                {material('#70533d', active)}
                <cylinderGeometry args={[0.04, 0.06, 0.7, 6]} />
              </mesh>
              <mesh position={[0.32, 0.62, 0]}>
                {material('#e2b957', active, 0.2)}
                <boxGeometry args={[0.64, 0.28, 0.04]} />
              </mesh>
            </group>
          ) : null}
        </group>
      )
    case 'water':
      return (
        <group position={[0, -0.8, 0]}>
          {level >= 1 ? (
            <mesh position={[-0.9, 1.02, 0.5]} rotation={[0, 0.25, 0]} castShadow>
              {material('#826849', active)}
              <boxGeometry args={[1.15, 0.12, 0.28]} />
            </mesh>
          ) : null}
          {level >= 2 ? (
            <group position={[1.15, 0.82, -0.3]}>
              <mesh position={[0, 0.58, 0]} castShadow>
                {material('#e6dfc9', active)}
                <cylinderGeometry args={[0.17, 0.25, 1.15, 8]} />
              </mesh>
              <mesh position={[0, 1.22, 0]} castShadow>
                {material('#b85449', active)}
                <coneGeometry args={[0.3, 0.38, 8]} />
              </mesh>
            </group>
          ) : null}
          {level >= 3 ? (
            <mesh position={[0.8, 1.02, 0.82]} rotation={[0, -0.2, 0]} castShadow>
              {material('#d9c48f', active)}
              <boxGeometry args={[1.4, 0.1, 0.2]} />
            </mesh>
          ) : null}
          {level >= 4 ? (
            <pointLight
              position={[1.15, 1.7, -0.3]}
              color="#ffd66f"
              intensity={active ? 2.2 : 1.2}
              distance={3.2}
              decay={2}
            />
          ) : null}
        </group>
      )
    case 'license_plates':
      return (
        <group>
          {level >= 1 ? (
            <group position={[-1.28, 0, -0.72]}>
              <mesh position={[0, 0.55, 0]} castShadow>
                {material('#58635f', active, 0.2)}
                <cylinderGeometry args={[0.035, 0.05, 1.1, 7]} />
              </mesh>
              <mesh position={[0, 1, 0]} castShadow>
                {material('#3f7d8a', active, 0.12)}
                <boxGeometry args={[0.48, 0.38, 0.07]} />
              </mesh>
            </group>
          ) : null}
          {level >= 2 ? (
            <group position={[-0.65, 0, -0.95]}>
              <mesh position={[0, 0.72, 0]} castShadow>
                {material('#d0b890', active)}
                <boxGeometry args={[2.45, 1.42, 0.58]} />
              </mesh>
              <mesh position={[0.2, 0.72, 0.31]}>
                {material('#53635f', active)}
                <boxGeometry args={[1.25, 0.92, 0.04]} />
              </mesh>
            </group>
          ) : null}
          {level >= 3 ? (
            <SmallBuilding position={[1.45, 0, -0.82]} height={1.35} color="#b5654f" active={active} />
          ) : null}
          {level >= 4 ? (
            <mesh position={[-0.65, 1.62, -0.95]} castShadow>
              {material('#ddb854', active, 0.25)}
              <boxGeometry args={[2.7, 0.16, 0.75]} />
            </mesh>
          ) : null}
        </group>
      )
    default:
      return null
  }
}

function StationModel({
  id,
  active,
  level,
}: {
  id: SceneId
  active: boolean
  level: StationProgress['level']
}) {
  return (
    <group>
      <BaseStationModel id={id} active={active} />
      <StationUpgrades id={id} level={level} active={active} />
    </group>
  )
}

function InteractiveStation({
  station,
  active,
  celebrating,
  reducedMotion,
  onActivate,
  onOpen,
}: {
  station: Station
  active: boolean
  celebrating: boolean
  reducedMotion: boolean
  onActivate: () => void
  onOpen: () => void
}) {
  const model = useRef<Group>(null)
  const beacon = useRef<Mesh>(null)
  const clock = useDioramaMotion()
  const canvas = useThree((state) => state.gl.domElement)
  useFrame((_, delta) => {
    const group = model.current
    if (!group) return
    const target = active ? 1.09 : celebrating ? 1.06 : 1
    if (reducedMotion || !clock.running) group.scale.setScalar(target)
    else group.scale.setScalar(MathUtils.damp(group.scale.x, target, 8, delta))
    if (beacon.current && clock.running) {
      beacon.current.position.y = station.hitbox[1] + 0.2 + Math.sin(clock.time.value * 3) * 0.07
      beacon.current.rotation.y += delta * 0.8
    }
  })

  const hover = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (event.nativeEvent.pointerType !== 'touch') {
      canvas.style.cursor = 'pointer'
      onActivate()
    }
  }

  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const touchLike =
      'pointerType' in event.nativeEvent
        ? event.nativeEvent.pointerType === 'touch'
        : window.matchMedia('(hover: none), (pointer: coarse)').matches
    if (touchLike && !active) {
      onActivate()
      return
    }
    canvas.style.cursor = ''
    onOpen()
  }

  const leave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    canvas.style.cursor = ''
  }

  return (
    <group
      name={`station-${station.id}`}
      position={station.position}
      onPointerOver={hover}
      onPointerOut={leave}
      onClick={click}
    >
      <group ref={model}>
        <StationModel id={station.id} active={active || celebrating} level={station.progress?.level ?? 0} />
      </group>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[station.hitbox[0], 0.12, station.hitbox[2]]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {active ? (
        <mesh ref={beacon} position={[0, station.hitbox[1] + 0.2, 0]}>
          <octahedronGeometry args={[0.14, 0]} />
          <meshBasicMaterial color="#ffdc7f" toneMapped={false} />
        </mesh>
      ) : null}
      {active ? (
        <mesh
          position={[0, 0.025, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[station.hitbox[0] / 2, station.hitbox[2] / 2, 1]}
        >
          <ringGeometry args={[0.94, 1, 48]} />
          <meshBasicMaterial color="#f5d87a" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      ) : null}
      {active || celebrating ? (
        <pointLight
          position={[0, 2.3, 0]}
          color={celebrating ? '#ffd36b' : '#9ee8dc'}
          intensity={celebrating ? 3.8 : 1.5}
          distance={celebrating ? 6 : 4.5}
          decay={2}
        />
      ) : null}
      {celebrating ? (
        <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.38, 0.075, 8, 32]} />
          <meshStandardMaterial color="#ffd66f" emissive="#f2a93b" emissiveIntensity={1.4} roughness={0.42} />
        </mesh>
      ) : null}
    </group>
  )
}

function DioramaScene({
  stations,
  active,
  celebrating,
  reducedMotion,
  moving,
  onActive,
  onOpen,
  onReady,
  night,
  view,
}: {
  night: boolean
  view: DioramaView
  stations: Station[]
  active?: SceneId
  celebrating?: SceneId
  reducedMotion: boolean
  moving: boolean
  onActive: (id?: SceneId) => void
  onOpen: (href: string) => void
  onReady: (ready: boolean) => void
}) {
  useEffect(() => onReady(true), [onReady])
  const daily = stations.find((station) => station.id === 'daily')
  return (
    <DioramaMotion running={moving} night={night}>
      <CameraSetup view={view} reducedMotion={reducedMotion} />
      <IslandShadows active={active} night={night} celebrating={celebrating} />
      <color attach="background" args={[night ? '#0e243c' : '#a0ced1']} />
      <fog attach="fog" args={[night ? '#102c41' : '#a0ced1', 28, 80]} />
      <hemisphereLight
        args={[night ? '#abc7ec' : '#fff4dc', night ? '#294f56' : '#748a6b', night ? 1.05 : 1.45]}
      />
      <directionalLight
        position={[8, 7, -8]}
        intensity={night ? 1.1 : 0.85}
        color={night ? '#91b9f4' : '#d6eaf4'}
      />
      <directionalLight
        position={[-6, 13, 8]}
        intensity={night ? 0.85 : 2.5}
        color={night ? '#a5c6f2' : '#ffe7b4'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
        shadow-normalBias={0.025}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <Ground />
      <StationContactShadows stations={stations} />
      <DioramaLandscape night={night} moving={moving} />
      <Cloud moving={moving} />
      {daily ? (
        <InteractiveStation
          station={daily}
          active={active === 'daily'}
          celebrating={celebrating === 'daily'}
          reducedMotion={reducedMotion}
          onActivate={() => onActive('daily')}
          onOpen={() => onOpen('/daily')}
        />
      ) : null}
      {stations
        .filter((station) => station.id !== 'daily')
        .map((station) => (
          <InteractiveStation
            key={station.id}
            station={station}
            active={active === station.id}
            celebrating={celebrating === station.id}
            reducedMotion={reducedMotion}
            onActivate={() => onActive(station.id)}
            onOpen={() => onOpen(station.href)}
          />
        ))}
      <mesh position={[0, -3.6, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={() => onActive(undefined)}>
        <planeGeometry args={[26, 19]} />
        <meshBasicMaterial transparent opacity={0} side={DoubleSide} depthWrite={false} />
      </mesh>
    </DioramaMotion>
  )
}

function SceneFallback({ children }: { children: ReactNode }) {
  return <div className="play-diorama-loading">{children}</div>
}

export default function QuizDiorama3D({
  counts,
  progress,
  celebrating,
}: {
  counts?: Record<string, number>
  progress?: StationProgressMap
  celebrating?: PlayStationId
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [active, setActive] = useState<SceneId>()
  const [view, setView] = useState<DioramaView>(DEFAULT_DIORAMA_VIEW)
  const [night, setNight] = useState(() => localStorage.getItem('atlasfunke.diorama.time') === 'night')
  const [sceneReady, setSceneReady] = useState(false)
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(!document.hidden)
  const [paused, setPaused] = useState(() => localStorage.getItem('atlasfunke.diorama.paused') === 'true')
  const [expanded, setExpanded] = useState(false)
  const expandButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const changed = () => setExpanded(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [])

  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    rootRef.current?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = previous
      expandButton.current?.focus({ preventScroll: true })
    }
  }, [expanded])

  const closeExpanded = () => {
    if (document.fullscreenElement === rootRef.current) void document.exitFullscreen().catch(() => {})
    setExpanded(false)
  }

  const stations = useMemo<Station[]>(() => {
    const quizStations = PLAY_QUIZZES.map((quiz) => {
      const placement = PLACEMENTS[quiz.id]
      if (!placement) throw new Error(`Keine Diorama-Position für sichtbares Quiz: ${quiz.id}`)
      return {
        id: quiz.id,
        href: `/play/${quiz.id}`,
        label: t(`category.${quiz.id}`),
        detail: countLabel(quiz, counts),
        progress: progress?.[quiz.id],
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
        progress: progress?.daily,
        position: [-6.45, GROUND_SURFACE_Y, -2.45] as Vec3,
        hitbox: [2.4, 3.1, 2.2] as Vec3,
      },
    ]
  }, [counts, progress, t])

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
  const motionEnabled = !reducedMotion && !paused && (inView || expanded) && pageVisible

  return (
    <div
      ref={rootRef}
      className={`quiz-diorama-3d atlas-diorama ${motionEnabled ? '' : 'is-motion-paused'}`}
      data-active-station={active}
      data-upgrade-station={celebrating}
      data-motion={motionEnabled ? 'running' : 'paused'}
      data-time={night ? 'night' : 'day'}
      data-view-angle={view.angle.toFixed(3)}
      data-view-zoom={view.zoom.toFixed(2)}
      data-expanded={expanded}
      data-camera="still"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setActive(undefined)
          if (expanded) closeExpanded()
        }
        if (expanded && event.key === 'Tab') {
          const controls = rootRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]')
          const first = controls?.[0],
            last = controls?.[controls.length - 1]
          if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === rootRef.current)
          ) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }
      }}
      role="application"
      aria-label={t('play.diorama_label')}
      aria-busy={!sceneReady}
    >
      <div className="quiz-diorama-canvas" aria-hidden="true">
        <Canvas
          orthographic
          shadows
          dpr={[1, 1.4]}
          frameloop={motionEnabled ? 'always' : 'demand'}
          camera={{ position: [12, 13.5, 16], zoom: 1, near: 0.1, far: 80 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          fallback={<SceneFallback>{t('play.diorama_unavailable')}</SceneFallback>}
          onPointerMissed={() => setActive(undefined)}
        >
          <Suspense fallback={null}>
            <DioramaScene
              stations={stations}
              active={active}
              celebrating={celebrating}
              reducedMotion={reducedMotion}
              moving={motionEnabled}
              onActive={setActive}
              onOpen={navigate}
              onReady={setSceneReady}
              night={night}
              view={view}
            />
          </Suspense>
        </Canvas>
      </div>

      <div className="diorama-world-caption">
        <Compass aria-hidden />
        <div>
          <strong>Deine Wissensinsel</strong>
          <span>Wähle einen Ort und starte dein Quiz.</span>
        </div>
      </div>
      <div className="diorama-world-tools" role="group" aria-label="Diorama steuern">
        <button
          type="button"
          aria-label="Ansicht nach links drehen"
          title="Nach links drehen"
          onClick={() => setView((v) => ({ ...v, angle: v.angle - Math.PI / 6 }))}
        >
          <RotateCcw aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Ansicht nach rechts drehen"
          title="Nach rechts drehen"
          onClick={() => setView((v) => ({ ...v, angle: v.angle + Math.PI / 6 }))}
        >
          <RotateCw aria-hidden />
        </button>
        <span className="diorama-tool-divider" aria-hidden />
        <button
          type="button"
          aria-label="Verkleinern"
          title="Verkleinern"
          disabled={view.zoom <= DIORAMA_ZOOM.min}
          onClick={() => setView((v) => ({ ...v, zoom: Math.max(DIORAMA_ZOOM.min, v.zoom - 0.15) }))}
        >
          <Minus aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Vergrößern"
          title="Vergrößern"
          disabled={view.zoom >= DIORAMA_ZOOM.max}
          onClick={() => setView((v) => ({ ...v, zoom: Math.min(DIORAMA_ZOOM.max, v.zoom + 0.15) }))}
        >
          <Plus aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Ansicht zurücksetzen"
          title="Ansicht zurücksetzen"
          onClick={() => {
            setView(DEFAULT_DIORAMA_VIEW)
            setActive(undefined)
          }}
        >
          <Crosshair aria-hidden />
        </button>
        <span className="diorama-tool-divider" aria-hidden />
        <button
          type="button"
          className="diorama-time-button"
          aria-label="Nachtmodus"
          aria-pressed={night}
          onClick={() => {
            setNight(!night)
            localStorage.setItem('atlasfunke.diorama.time', night ? 'day' : 'night')
          }}
        >
          {night ? <Sun aria-hidden /> : <Moon aria-hidden />}
          <span>{night ? 'Tag' : 'Nacht'}</span>
        </button>
        <button
          type="button"
          aria-label={paused ? 'Animationen fortsetzen' : 'Animationen pausieren'}
          aria-pressed={paused}
          disabled={reducedMotion}
          title={
            reducedMotion
              ? 'Reduzierte Bewegung ist aktiviert'
              : paused
                ? 'Animationen fortsetzen'
                : 'Animationen pausieren'
          }
          onClick={() => {
            setPaused(!paused)
            localStorage.setItem('atlasfunke.diorama.paused', String(!paused))
          }}
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        </button>
        <button
          ref={expandButton}
          type="button"
          aria-label={expanded ? 'Vollbild schließen' : 'Vollbild öffnen'}
          aria-pressed={expanded}
          title={expanded ? 'Vollbild schließen' : 'Vollbild öffnen'}
          onClick={() => {
            if (expanded) closeExpanded()
            else {
              setExpanded(true)
              void rootRef.current?.requestFullscreen?.().catch(() => {})
            }
          }}
        >
          {expanded ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
        </button>
      </div>
      <div className={`quiz-diorama-context ${selected ? 'is-active' : ''}`} aria-live="polite">
        {selected && (
          <>
            <strong>{selected.label}</strong>
            {selected.detail && <small>{selected.detail}</small>}
            {selected.progress && (
              <div className="quiz-diorama-progress" data-station-level={selected.progress.level}>
                <b>{stationLevelLabel(selected.progress, t)}</b>
                <span className="play-station-progress-track" aria-hidden>
                  <span style={{ width: `${selected.progress.progress * 100}%` }} />
                </span>
                <small>{stationProgressLabel(selected.progress, t)}</small>
              </div>
            )}
            <Link to={selected.href}>
              {t('play.configure')} <ArrowRight aria-hidden />
            </Link>
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
              data-station-level={station.progress?.level}
              aria-label={[
                station.label,
                stationLevelLabel(station.progress, t),
                stationProgressLabel(station.progress, t),
                station.detail,
                t('play.configure'),
              ]
                .filter(Boolean)
                .join(', ')}
              title={station.label}
              data-label={station.label}
              onPointerEnter={() => setActive(station.id)}
              onFocus={() => setActive(station.id)}
            >
              <Icon strokeWidth={1.7} aria-hidden />
              {celebrating === station.id ? (
                <span className="quiz-diorama-new">{t('play.upgrade_new')}</span>
              ) : null}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
