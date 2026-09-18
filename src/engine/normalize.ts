/** Normalisiert Nutzereingaben für Eintipp-Fragen: Groß/Klein, Diakritika, Umlaut-Umschreibungen, Satzzeichen. */
export function normalizeAnswer(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’'`´-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

/** Prüft eine Eingabe gegen Name und Aliasse mit Tippfehler-Toleranz bei längeren Namen. */
export function matchesAnswer(input: string, accepted: string[]): boolean {
  const norm = normalizeAnswer(input)
  if (!norm) return false
  for (const a of accepted) {
    const target = normalizeAnswer(a)
    if (!target) continue
    if (norm === target) return true
    const tolerance = target.length >= 9 ? 2 : target.length >= 5 ? 1 : 0
    if (tolerance && levenshtein(norm, target) <= tolerance) return true
  }
  return false
}
