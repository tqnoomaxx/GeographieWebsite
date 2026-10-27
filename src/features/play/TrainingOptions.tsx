import { useState } from 'react'
export interface TrainingSettings {
  length: number | 'all'
  repeat: boolean
  hideFlagHints: boolean
}
const KEY = 'gk.training.v1'
const defaults: TrainingSettings = { length: 10, repeat: true, hideFlagHints: false }
export function loadTrainingSettings(): TrainingSettings {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return value
      ? {
          length: [10, 20, 50, 'all'].includes(value.length) ? value.length : 10,
          repeat: value.repeat !== false,
          hideFlagHints: value.hideFlagHints === true,
        }
      : defaults
  } catch {
    return defaults
  }
}
export function useTrainingSettings() {
  const [settings, setSettings] = useState(loadTrainingSettings)
  return [
    settings,
    (patch: Partial<TrainingSettings>) =>
      setSettings((previous) => {
        const next = { ...previous, ...patch }
        localStorage.setItem(KEY, JSON.stringify(next))
        return next
      }),
  ] as const
}
export function TrainingOptions({
  settings,
  onChange,
  flags = false,
}: {
  settings: TrainingSettings
  onChange: (patch: Partial<TrainingSettings>) => void
  flags?: boolean
}) {
  return (
    <details className="training-options" id="lernoptionen">
      <summary>
        Lernoptionen <span>gelten auch für die nächsten Quizze</span>
      </summary>
      <div className="training-options-body">
        <label>
          Rundenlänge
          <select
            aria-label="Rundenlänge"
            value={settings.length}
            onChange={(e) => onChange({ length: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
          >
            <option value="10">10 Fragen</option>
            <option value="20">20 Fragen</option>
            <option value="50">50 Fragen</option>
            <option value="all">Alle</option>
          </select>
        </label>
        <label className="training-check">
          <input
            type="checkbox"
            checked={settings.repeat}
            onChange={(e) => onChange({ repeat: e.target.checked })}
          />
          Fehler in der Runde erneut üben
        </label>
        {flags && (
          <label className="training-check">
            <input
              type="checkbox"
              checked={settings.hideFlagHints}
              onChange={(e) => onChange({ hideFlagHints: e.target.checked })}
            />
            Verräterische Flaggenhinweise verdecken
          </label>
        )}
      </div>
    </details>
  )
}
