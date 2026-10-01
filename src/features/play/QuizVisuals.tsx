import type { Entity } from '@/domain/types'
import type { Question } from '@/engine/types'

function plateHash(value: string) {
  return [...value].reduce((sum, char, index) => (sum * 31 + char.charCodeAt(0) + index) >>> 0, 2166136261)
}

function plateSerial(code: string, country: string) {
  const hash = plateHash(`${country}:${code}`)
  const alphabet = 'ABCDEFGHJKLMNPRSTUVWXYZ'
  const letters = `${alphabet[hash % alphabet.length]}${alphabet[Math.floor(hash / 23) % alphabet.length]}`
  const number = 10 + (Math.floor(hash / 529) % 9889)
  if (country === 'CH') return number.toLocaleString('de-CH')
  if (country === 'AT') return `${number} ${letters[0]}`
  if (country === 'PL') return code.length === 2 ? String(10000 + (number % 89999)) : `${letters[0]} ${String(number).padStart(3, '0')}`
  return `${letters} ${number}`
}

/** Deterministisches Musterkennzeichen: Ortskürzel bleiben korrekt, Serienzeichen sind bewusst fiktiv. */
export function LicensePlate({ code, country = 'DE', compact = false }: { code: string; country?: string; compact?: boolean }) {
  const normalizedCountry = ['DE', 'AT', 'CH', 'PL'].includes(country) ? country : 'DE'
  const euMark = normalizedCountry === 'AT' ? 'A' : normalizedCountry === 'PL' ? 'PL' : 'D'
  const serial = plateSerial(code, normalizedCountry)
  const variant = plateHash(`${code}:format`) % 3
  const countryLabel = normalizedCountry === 'AT' ? 'REPUBLIK ÖSTERREICH' : normalizedCountry === 'CH' ? 'SCHWEIZERISCHE EIDGENOSSENSCHAFT' : normalizedCountry === 'PL' ? 'RZECZPOSPOLITA POLSKA' : 'BUNDESREPUBLIK DEUTSCHLAND'
  return (
    <div className={`license-plate license-plate-country-${normalizedCountry} license-plate-variant-${variant} ${compact ? 'license-plate-compact' : ''}`} role="img" aria-label={`Musterkennzeichen mit Ortskürzel ${code} aus ${normalizedCountry}`}>
      {normalizedCountry === 'CH' ? <span className="license-plate-ch-badge" aria-hidden>+</span> : (
        <div className="license-plate-eu" aria-hidden>
          <span className="license-plate-stars">✦✦✦<br />✦✦✦</span>
          <span>{euMark}</span>
        </div>
      )}
      <span className="license-plate-country-label" aria-hidden>{countryLabel}</span>
      <span className="license-plate-code">
        <strong>{code}</strong>
        {normalizedCountry === 'DE' && <span className="license-plate-badges" aria-hidden><i /><i /></span>}
        {normalizedCountry === 'AT' && <span className="license-plate-at-crest" aria-hidden />}
        <span>{serial}</span>
      </span>
      {normalizedCountry === 'CH' && <span className="license-plate-canton-badge" aria-hidden>{code}</span>}
      <span className="license-plate-screw" aria-hidden />
    </div>
  )
}

function seed(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function ContourLines({ offset = 0 }: { offset?: number }) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.25" opacity=".28" aria-hidden>
      {[0, 1, 2, 3, 4].map((line) => (
        <path
          key={line}
          d={`M${-30 + line * 9} ${166 - line * 15 + offset} Q82 ${94 - line * 7 + offset} 174 ${145 - line * 11 + offset} T430 ${107 - line * 8 + offset} T730 ${139 - line * 9 + offset}`}
        />
      ))}
    </g>
  )
}

export function MountainProfile({ entity, compact = false }: { entity: Entity; compact?: boolean }) {
  const n = seed(entity.id)
  const summitX = 44 + (n % 14)
  const leftShoulder = 23 + (n % 11)
  const rightShoulder = 69 + (n % 13)
  const summit = `${summitX * 7.2} ${28 + (n % 12)}`
  return (
    <div className={`mountain-visual ${compact ? 'mountain-visual-compact' : ''}`} role="img" aria-label={`Symbolische Illustration des Berges ${entity.names.de}`}>
      <svg viewBox="0 0 720 320" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <ContourLines offset={28} />
        <path d={`M-25 286 L${leftShoulder * 7.2} 174 L${summit} L${rightShoulder * 7.2} 194 L760 282 V340 H-25Z`} fill="var(--mountain-far)" stroke="var(--mountain-ink)" strokeWidth="2" />
        <path d={`M48 286 L${summit} L664 286 Z`} fill="var(--mountain-main)" />
        <path d={`M${summitX * 7.2} ${28 + (n % 12)} L${summitX * 7.2 - 52} 103 L${summitX * 7.2 - 5} 84 L${summitX * 7.2 + 45} 122 Z`} fill="var(--mountain-snow)" />
        <g fill="none" stroke="var(--mountain-etch)" strokeWidth="2" opacity=".72">
          <path d={`M${summitX * 7.2} 47 L${summitX * 7.2 - 114} 275`} />
          <path d={`M${summitX * 7.2 - 14} 77 L${summitX * 7.2 + 133} 278`} />
          <path d={`M${summitX * 7.2 - 42} 111 L${summitX * 7.2 - 185} 280`} />
          <path d={`M${summitX * 7.2 + 29} 121 L${summitX * 7.2 + 226} 280`} />
          <path d={`M${summitX * 7.2 - 72} 162 Q${summitX * 7.2} 128 ${summitX * 7.2 + 84} 167`} />
          <path d={`M${summitX * 7.2 - 126} 219 Q${summitX * 7.2} 166 ${summitX * 7.2 + 148} 221`} />
        </g>
        <path d="M-20 282 Q118 258 246 284 T486 273 T760 286 V340 H-20Z" fill="var(--mountain-ground)" />
        <g fill="var(--mountain-tree)" opacity=".82">
          <path d="M69 284l11-39 11 39zm28 0 9-30 10 30zm501 0 12-43 12 43zm31 0 9-32 9 32z" />
        </g>
      </svg>
      {!compact && <span className="visual-caption">Symbolbild · kein reales Bergprofil</span>}
    </div>
  )
}

function riverPath(entity: Entity) {
  const n = seed(entity.id)
  const a = 70 + (n % 56)
  const b = 218 + (n % 70)
  const c = 376 + (n % 82)
  const d = 545 + (n % 62)
  return `M-25 102 C${a} 34 ${b} 196 ${c} 107 S${d} 42 765 146`
}

function WaterAtlas({ entity, compact = false }: { entity: Entity; compact?: boolean }) {
  const lake = entity.type === 'lake'
  return (
    <div className={`water-atlas ${compact ? 'water-atlas-compact' : ''}`} role="img" aria-label={`Symbolische Atlas-Illustration ${entity.names.de}`}>
      <svg viewBox="0 0 720 360" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="720" height="360" fill="var(--water-paper)" />
        <ContourLines offset={86} />
        <path d="M-20 334 C100 282 166 313 252 275 S420 244 518 282 S645 310 750 265 V380 H-20Z" fill="var(--water-land)" opacity=".62" />
        {lake ? (
          <>
            <path d="M96 194 C139 87 287 88 348 138 C435 70 619 109 615 211 C612 300 445 274 347 287 C235 301 57 288 96 194Z" fill="var(--water-blue-soft)" stroke="var(--water-blue)" strokeWidth="10" />
            <path d="M133 198 C178 129 272 130 347 164 C426 113 542 137 572 207" fill="none" stroke="var(--water-highlight)" strokeWidth="5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d={riverPath(entity)} fill="none" stroke="var(--water-blue-shadow)" strokeWidth="22" strokeLinecap="round" />
            <path d={riverPath(entity)} fill="none" stroke="var(--water-blue)" strokeWidth="13" strokeLinecap="round" />
            <path d={riverPath(entity)} fill="none" stroke="var(--water-highlight)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="16" cy="93" r="8" fill="var(--water-highlight)" stroke="var(--water-blue)" strokeWidth="4" />
            <path d="M681 131l38 15-35 18" fill="var(--water-blue-soft)" opacity=".72" />
          </>
        )}
      </svg>
      <span className="visual-caption">Symbolbild · {lake ? 'kein realer Seeumriss' : 'kein realer Flusslauf'}</span>
      <span className="water-atlas-name">{entity.names.de}</span>
    </div>
  )
}

export function hasSideVisualization(question: Question) {
  return question.type === 'river_to_country' || question.type === 'lake_to_country'
}

export function usesVisualOptions(question: Question) {
  return question.question_type === 'image_choice' || ['mountain_higher', 'river_longer', 'lake_larger', 'city_to_plate'].includes(question.type)
}

export function ChoiceVisualization({ question, entity }: { question: Question; entity?: Entity }) {
  if (!entity) return null
  if (question.type === 'mountain_higher') return <MountainProfile entity={entity} compact />
  if (question.type === 'river_longer' || question.type === 'lake_larger') return <WaterAtlas entity={entity} compact />
  if (question.type === 'city_to_plate') return <LicensePlate code={String(entity.attributes.code ?? '')} country={String(entity.attributes.country ?? 'country:DE').replace('country:', '')} compact />
  return null
}

export function QuestionVisualization({ question, entities, side = false }: { question: Question; entities: Entity[]; side?: boolean }) {
  const primary = entities[0]
  if (question.category === 'license_plates' && primary && !['city_to_plate', 'city_to_plate_input'].includes(question.type)) {
    return <div className="plate-stage"><LicensePlate code={String(primary.attributes.code ?? question.prompt.params?.code ?? '')} country={String(primary.attributes.country ?? 'country:DE').replace('country:', '')} /></div>
  }
  if (question.category === 'nature' && !question.map && primary && question.type !== 'mountain_higher') {
    return <MountainProfile entity={primary} />
  }
  if (question.category === 'water' && !question.map && primary && !['river_longer', 'lake_larger'].includes(question.type)) {
    return <WaterAtlas entity={primary} compact={!side} />
  }
  return null
}
