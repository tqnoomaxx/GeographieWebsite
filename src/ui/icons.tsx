import {
  Flag, Globe2, Landmark, Map, Camera, Building2, Compass, Car, Waves, Mountain, Shuffle, BookOpen, Trophy, Home, Target,
  Search, User, Puzzle, Settings, Heart, Star, Flame, Award, ScrollText, ChevronLeft, Check, X, Info, Share2, RotateCcw, Play,
  MapPin, Image as ImageIcon, Droplets, Layers, Sparkles, Wrench, Mail, Lightbulb, AlertTriangle, ArrowRight, type LucideIcon,
} from 'lucide-react'
import type { CategoryId } from '@/engine/types'

export const Icons = {
  home: Home, play: Target, learn: BookOpen, explore: Compass, progress: Trophy, search: Search, profile: User, daily: Puzzle, settings: Settings,
  heart: Heart, star: Star, flame: Flame, award: Award, quest: ScrollText, back: ChevronLeft, check: Check, x: X, info: Info, share: Share2,
  retry: RotateCcw, start: Play, pin: MapPin, image: ImageIcon, layers: Layers, sparkles: Sparkles, admin: Wrench, mail: Mail, idea: Lightbulb,
  warn: AlertTriangle, arrow: ArrowRight, globe: Globe2,
}

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  flags: Flag, countries: Globe2, capitals: Landmark, regions: Layers, cities: Building2, maps: Map, images: Camera,
  landmarks: Landmark, water: Waves, nature: Mountain, license_plates: Car, mixed: Shuffle,
}

/** Kategoriefarben (Kachelhintergrund / Icon) für Hell- und Dunkelmodus über CSS-Variablen. */
export const CATEGORY_TONES: Record<CategoryId, string> = {
  flags: 'tone-red', countries: 'tone-indigo', capitals: 'tone-amber', regions: 'tone-teal', cities: 'tone-slate', maps: 'tone-green',
  images: 'tone-pink', landmarks: 'tone-amber', water: 'tone-blue', nature: 'tone-green', license_plates: 'tone-slate', mixed: 'tone-violet',
}

export const TYPE_ICONS: Record<string, LucideIcon> = {
  country: Globe2, region: Layers, city: Building2, landmark: Landmark, license_plate: Car, river: Waves, lake: Droplets, mountain: Mountain,
}

export const PUZZLE_ICONS: Record<string, LucideIcon> = { flagle: Flag, countryle: Globe2, outline: Map, capitale: Landmark, bildle: Camera, kennzeichle: Car }

export function CategoryIcon({ id, className = 'h-5 w-5' }: { id: CategoryId; className?: string }) {
  const I = CATEGORY_ICONS[id]
  return <I className={className} aria-hidden strokeWidth={1.75} />
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
