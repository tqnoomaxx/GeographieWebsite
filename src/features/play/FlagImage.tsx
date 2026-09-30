type HintMask = { x: number; y: number; width: number; height: number }

/**
 * Bereiche, die den Ländernamen durch Schrift oder die Landesform direkt verraten können.
 * Die Originaldatei bleibt darunter unverändert und wird nach der Antwort vollständig gezeigt.
 */
export const FLAG_HINT_MASKS: Record<string, HintMask[]> = {
  'country:AD': [{ x: 38, y: 29, width: 24, height: 43 }],
  'country:AF': [{ x: 34, y: 24, width: 32, height: 52 }],
  'country:AS': [{ x: 55, y: 29, width: 35, height: 43 }],
  'country:BM': [{ x: 66, y: 21, width: 29, height: 58 }],
  'country:BN': [{ x: 36, y: 22, width: 28, height: 56 }],
  'country:BO': [{ x: 35, y: 27, width: 30, height: 47 }],
  'country:BR': [{ x: 31, y: 37, width: 40, height: 25 }],
  'country:BZ': [{ x: 31, y: 24, width: 38, height: 52 }],
  'country:CR': [{ x: 34, y: 26, width: 32, height: 49 }],
  'country:CY': [{ x: 30, y: 25, width: 40, height: 50 }],
  'country:DO': [{ x: 35, y: 23, width: 30, height: 55 }],
  'country:EC': [{ x: 34, y: 25, width: 32, height: 52 }],
  'country:EG': [{ x: 41, y: 28, width: 18, height: 48 }],
  'country:GQ': [{ x: 36, y: 24, width: 28, height: 52 }],
  'country:ES': [{ x: 37, y: 22, width: 26, height: 58 }],
  'country:SV': [{ x: 32, y: 23, width: 36, height: 55 }],
  'country:FJ': [{ x: 63, y: 23, width: 27, height: 55 }],
  'country:FK': [{ x: 66, y: 21, width: 29, height: 58 }],
  'country:GS': [{ x: 65, y: 20, width: 30, height: 60 }],
  'country:GT': [{ x: 35, y: 27, width: 30, height: 48 }],
  'country:GU': [{ x: 36, y: 20, width: 28, height: 60 }],
  'country:HT': [{ x: 34, y: 28, width: 32, height: 45 }],
  'country:IQ': [{ x: 29, y: 34, width: 42, height: 32 }],
  'country:IR': [{ x: 0, y: 31, width: 100, height: 38 }],
  'country:KY': [{ x: 65, y: 20, width: 30, height: 60 }],
  'country:MT': [{ x: 0, y: 0, width: 20, height: 31 }],
  'country:NI': [{ x: 34, y: 23, width: 32, height: 55 }],
  'country:PY': [{ x: 34, y: 24, width: 32, height: 53 }],
  'country:SA': [{ x: 20, y: 25, width: 60, height: 32 }],
  'country:SM': [{ x: 36, y: 23, width: 28, height: 55 }],
  'country:VG': [{ x: 65, y: 20, width: 30, height: 60 }],
  'country:VI': [{ x: 24, y: 14, width: 52, height: 72 }],
  'country:XK': [{ x: 29, y: 22, width: 42, height: 58 }],
}

export const FLAG_HINT_COUNTRY_COUNT = Object.keys(FLAG_HINT_MASKS).length

export function FlagImage({
  src,
  entityId,
  alt,
  concealed = false,
  compact = false,
  option = false,
}: {
  src?: string
  entityId?: string
  alt: string
  concealed?: boolean
  compact?: boolean
  option?: boolean
}) {
  const masks = entityId ? FLAG_HINT_MASKS[entityId] : undefined
  const hidden = concealed && !!masks?.length
  return (
    <span
      className={`flag-media-shell ${compact ? 'is-compact' : ''} ${option ? 'is-option' : ''}`}
      data-flag-hint-hidden={hidden || undefined}
    >
      <span className="flag-media-artboard">
        <img src={src} alt={hidden ? `${alt} – Hinweis verdeckt` : alt} decoding="async" />
        {hidden &&
          masks.map((mask, index) => (
            <span
              key={index}
              className="flag-hint-mask"
              style={{
                left: `${mask.x}%`,
                top: `${mask.y}%`,
                width: `${mask.width}%`,
                height: `${mask.height}%`,
              }}
              aria-hidden
            />
          ))}
      </span>
      {hidden && (
        <span className="flag-hint-badge" aria-hidden>
          Hinweis verdeckt
        </span>
      )}
    </span>
  )
}
