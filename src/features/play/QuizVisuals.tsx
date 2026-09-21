import type { Entity } from '@/domain/types'
import type { Question } from '@/engine/types'
import { WorldMap } from '@/ui/maps'

export function LicensePlate({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <div
      className={`relative mx-auto flex aspect-[4.7/1] items-center overflow-hidden rounded-[0.7rem] border-[3px] border-[#18242c] bg-[#fffef7] text-[#15191c] shadow-[0_12px_28px_-18px_rgba(16,37,54,.8)] ${compact ? 'w-full max-w-64' : 'w-full max-w-xl'}`}
      role="img"
      aria-label={`Kennzeichen ${code}`}
    >
      <div className="flex h-full w-[13%] shrink-0 flex-col items-center justify-between bg-[#164a9b] py-[5%] text-white">
        <span className="text-[clamp(6px,1vw,11px)] tracking-[-.12em]" aria-hidden>••••••</span>
        <span className="font-semibold text-[clamp(11px,2vw,24px)]">D</span>
      </div>
      <span className="mx-auto pl-[3%] font-sans text-[clamp(1.4rem,6vw,4.8rem)] font-semibold tracking-[0.08em]">{code}</span>
      <span className="mr-[5%] h-[20%] aspect-square rounded-full border-2 border-[#aeb4b2] bg-[#e5e4d9]" aria-hidden />
    </div>
  )
}

function seed(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

export function MountainProfile({ entity, compact = false }: { entity: Entity; compact?: boolean }) {
  const n = seed(entity.id)
  const peak = 37 + (n % 22)
  const shoulder = 18 + (n % 15)
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-[linear-gradient(#dcebed_0_58%,#eee5d3_58%)] ${compact ? 'h-24' : 'h-48 md:h-56'}`} role="img" aria-label={`Bergprofil ${entity.names.de}`}>
      <svg viewBox="0 0 400 190" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={`M0 160 L70 122 L115 ${115 - shoulder} L160 116 L${peak * 4} 28 L285 114 L330 92 L400 158 V190 H0Z`} fill="#8b9c92" />
        <path d={`M70 160 L${peak * 4} 28 L285 160 Z`} fill="#596f69" />
        <path d={`M${peak * 4} 28 L${peak * 4 - 34} 82 L${peak * 4} 69 L${peak * 4 + 28} 88 Z`} fill="#fffdf7" />
        <path d="M0 160 Q90 148 185 163 T400 156 V190 H0Z" fill="#a99470" />
      </svg>
      <span className="absolute bottom-3 left-4 rounded-full bg-navy/85 px-3 py-1 text-xs font-medium text-white">{entity.names.de}</span>
    </div>
  )
}

function WaterGlyph({ lake = false }: { lake?: boolean }) {
  return (
    <svg viewBox="0 0 320 115" className="h-28 w-full" aria-hidden>
      <path d={lake ? 'M54 65 C83 23 139 33 166 47 C206 18 273 43 267 70 C259 99 195 91 157 94 C112 101 39 95 54 65Z' : 'M8 38 C64 78 100 19 151 61 S240 105 312 40'} fill="none" stroke="#2e7885" strokeWidth={lake ? 22 : 12} strokeLinecap="round" />
      {!lake && <path d="M8 38 C64 78 100 19 151 61 S240 105 312 40" fill="none" stroke="#9ed2d4" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  )
}

export function QuestionVisualization({ question, entities }: { question: Question; entities: Entity[] }) {
  const primary = entities[0]
  if (question.category === 'license_plates' && primary) {
    return <div className="mb-6 rounded-3xl border border-line bg-card-2/50 px-5 py-7 md:px-10"><LicensePlate code={String(primary.attributes.code ?? question.prompt.params?.code ?? '')} /></div>
  }
  if (question.category === 'nature' && !question.map && entities.length) {
    const shown = question.type === 'mountain_higher' ? entities.slice(0, 2) : entities.slice(0, 1)
    return <div className={`mb-6 grid gap-3 ${shown.length > 1 ? 'grid-cols-2' : ''}`}>{shown.map((entity) => <MountainProfile key={entity.id} entity={entity} compact={shown.length > 1} />)}</div>
  }
  if (question.category === 'water' && !question.map && primary) {
    if (question.type === 'river_to_country' && primary.location) {
      return <div className="mb-6 overflow-hidden rounded-3xl border border-line bg-card"><WorldMap decorative marker={{ ...primary.location, label: primary.names.de }} /></div>
    }
    const shown = question.type === 'river_longer' || question.type === 'lake_larger' ? entities.slice(0, 2) : entities.slice(0, 1)
    return (
      <div className={`mb-6 grid gap-3 ${shown.length > 1 ? 'grid-cols-2' : ''}`}>
        {shown.map((entity) => <div key={entity.id} className="rounded-2xl border border-line bg-[#e8efe9] px-3 pt-2"><WaterGlyph lake={entity.type === 'lake'} /><p className="pb-3 text-center text-sm font-semibold">{entity.names.de}</p></div>)}
      </div>
    )
  }
  return null
}
