import {
  Flag, Globe2, Landmark, Map, Camera, Building2, Compass, Car, Waves, Mountain, BookOpen, Trophy, Home, Target,
  Search, User, Puzzle, Settings, Heart, Star, Flame, Award, ScrollText, ChevronLeft, Check, X, Info, Share2, RotateCcw, Play,
  MapPin, Image as ImageIcon, Droplets, Layers, Sparkles, Wrench, Mail, Lightbulb, AlertTriangle, ArrowRight, type LucideIcon,
  Keyboard, ListChecks, Languages,
} from 'lucide-react'
import type { CategoryId } from '@/engine/types'
import type { CSSProperties } from 'react'

export const Icons = {
  home: Home, play: Target, learn: BookOpen, explore: Compass, progress: Trophy, search: Search, profile: User, daily: Puzzle, settings: Settings,
  heart: Heart, star: Star, flame: Flame, award: Award, quest: ScrollText, back: ChevronLeft, check: Check, x: X, info: Info, share: Share2,
  retry: RotateCcw, start: Play, pin: MapPin, image: ImageIcon, layers: Layers, sparkles: Sparkles, admin: Wrench, mail: Mail, idea: Lightbulb,
  warn: AlertTriangle, arrow: ArrowRight, globe: Globe2,
  keyboard: Keyboard, choices: ListChecks, map: Map,
}

const CATEGORY_ICON_FILES: Record<CategoryId, string> = {
  flags: 'flags.png',
  countries: 'countries.png',
  capitals: 'capitals.png',
  regions: 'regions.png',
  cities: 'cities.png',
  maps: 'maps.png',
  images: 'images.png',
  landmarks: 'landmarks.png',
  water: 'water.png',
  nature: 'nature.png',
  license_plates: 'license-plates.png',
  languages: 'languages.svg',
  mixed: 'mixed.png',
}

/** Kategoriefarben (Kachelhintergrund / Icon) für Hell- und Dunkelmodus über CSS-Variablen. */
export const CATEGORY_TONES: Record<CategoryId, string> = {
  flags: 'tone-red', countries: 'tone-indigo', capitals: 'tone-amber', regions: 'tone-teal', cities: 'tone-slate', maps: 'tone-green',
  images: 'tone-pink', landmarks: 'tone-amber', water: 'tone-blue', nature: 'tone-green', license_plates: 'tone-slate', languages: 'tone-teal', mixed: 'tone-violet',
}

export const TYPE_ICONS: Record<string, LucideIcon> = {
  country: Globe2, region: Layers, city: Building2, landmark: Landmark, license_plate: Car, river: Waves, lake: Droplets, mountain: Mountain, script_word: Languages,
}

export const PUZZLE_ICONS: Record<string, LucideIcon> = { flagle: Flag, countryle: Globe2, outline: Map, capitale: Landmark, bildle: Camera, kennzeichle: Car }

export type NavAtlasIconId = 'home' | 'play' | 'learn' | 'explore' | 'progress' | 'daily' | 'search' | 'profile'

const NAV_ATLAS_POSITIONS: Record<NavAtlasIconId, [number, number]> = {
  home: [0, 30], play: [33.333, 30], learn: [66.667, 30], explore: [100, 30],
  progress: [0, 74], daily: [33.333, 74], search: [66.667, 74], profile: [100, 74],
}

export const PROFILE_AVATARS = [
  { id: 'compass', legacy: '🧭', label: 'Kompass' },
  { id: 'globe', legacy: '🌍', label: 'Globus' },
  { id: 'map', legacy: '🗺️', label: 'Weltkarte' },
  { id: 'mountain', legacy: '🏔️', label: 'Berg' },
  { id: 'wave', legacy: '🌊', label: 'Welle' },
  { id: 'capitol', legacy: '🏛️', label: 'Kuppel' },
  { id: 'fox', legacy: '🦊', label: 'Fuchs' },
  { id: 'owl', legacy: '🦉', label: 'Eule' },
  { id: 'turtle', legacy: '🐢', label: 'Schildkröte' },
  { id: 'parrot', legacy: '🦜', label: 'Papagei' },
  { id: 'rocket', legacy: '🚀', label: 'Rakete' },
  { id: 'sailboat', legacy: '⛵', label: 'Segelboot' },
] as const

const ACHIEVEMENT_ICON_IDS = [
  'first_steps', 'flag_novice_25', 'flag_expert_150', 'flag_master_500', 'capital_keeper_50',
  'capital_keeper_200', 'country_scholar_100', 'city_expert_25', 'picture_pro_100', 'cartographer_50',
  'plate_expert_100', 'water_wise_50', 'summit_50', 'region_ranger_50', 'world_traveler',
  'marathon_1', 'marathon_5', 'mastered_50', 'mastered_250', 'puzzle_fox_10',
  'puzzle_fox_30', 'streak_7', 'streak_30', 'level_10', 'level_25',
] as const

const spriteStyle = (file: string, size: string, x: number, y: number): CSSProperties => ({
  backgroundImage: `url(${import.meta.env.BASE_URL}icons/generated/${file})`,
  backgroundPosition: `${x}% ${y}%`,
  backgroundSize: size,
})

/** KI-illustriertes Navigationssymbol aus dem Atlas-Sprite. */
export function NavAtlasIcon({ id, className = 'h-5 w-5' }: { id: NavAtlasIconId; className?: string }) {
  const [x, y] = NAV_ATLAS_POSITIONS[id]
  return <span className={`atlas-generated-icon atlas-nav-icon ${className}`} style={spriteStyle('navigation-atlas.webp', '400% auto', x, y)} aria-hidden />
}

export function profileAvatarId(value?: string) {
  return PROFILE_AVATARS.find((avatar) => avatar.id === value || avatar.legacy === value)?.id ?? 'compass'
}

/** KI-illustriertes Profilmotiv; akzeptiert zur Migration auch die bisherigen Emoji-Werte. */
export function ProfileAvatarIcon({ id, className = 'h-16 w-16' }: { id?: string; className?: string }) {
  const index = PROFILE_AVATARS.findIndex((avatar) => avatar.id === profileAvatarId(id))
  const col = index % 4
  const row = Math.floor(index / 4)
  return <span className={`atlas-generated-icon atlas-profile-icon ${className}`} style={spriteStyle('profile-atlas.webp', '400% 300%', col * 33.333, row * 50)} aria-hidden />
}

/** Individuelles KI-illustriertes Abzeichen für jeden Erfolg. */
export function AchievementIcon({ id, className = 'h-8 w-8' }: { id: string; className?: string }) {
  const index = Math.max(0, ACHIEVEMENT_ICON_IDS.indexOf(id as (typeof ACHIEVEMENT_ICON_IDS)[number]))
  const col = index % 5
  const row = Math.floor(index / 5)
  return <span className={`atlas-generated-icon atlas-achievement-icon ${className}`} style={spriteStyle('achievements-atlas.webp', '500% 500%', col * 25, row * 25)} aria-hidden />
}

export function CategoryIcon({ id, className = 'h-5 w-5' }: { id: CategoryId; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icons/quizzes/${CATEGORY_ICON_FILES[id]}`}
      alt=""
      className={`quiz-category-icon ${className}`}
      aria-hidden
      decoding="async"
      draggable={false}
    />
  )
}

/** Illustrierte Atlas-Kachel für die zwölf Quizkategorien. */
export function CategoryIconTile({ id, size = 'md', className = '' }: { id: CategoryId; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'h-10 w-10', md: 'h-16 w-16', lg: 'h-20 w-20' }[size]
  return (
    <span className={`quiz-category-tile ${CATEGORY_TONES[id]} ${s} ${className}`} aria-hidden>
      <CategoryIcon id={id} className="h-[86%] w-[86%]" />
    </span>
  )
}

/** Farbige Icon-Kachel, z. B. für Kategoriekarten. */
export function IconTile({ icon: I, tone = 'tone-indigo', size = 'md' }: { icon: LucideIcon; tone?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'h-9 w-9 [&>svg]:h-4 [&>svg]:w-4', md: 'h-12 w-12 [&>svg]:h-6 [&>svg]:w-6', lg: 'h-16 w-16 [&>svg]:h-8 [&>svg]:w-8' }[size]
  return (
    <span className={`inline-flex items-center justify-center rounded-2xl ${tone} ${s}`} aria-hidden>
      <I strokeWidth={1.75} />
    </span>
  )
}

export function TypeIcon({ type, className = 'h-4 w-4' }: { type: string; className?: string }) {
  const I = TYPE_ICONS[type] ?? MapPin
  return <I className={className} aria-hidden strokeWidth={1.75} />
}
