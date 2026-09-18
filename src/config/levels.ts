/** Level n benötigt kumulativ xpForLevel(n) XP. Level 1 = 0, 2 = 100, 3 = 250, 4 = 450 … (quadratisch wachsend). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  const n = level - 1
  return 100 * n + 25 * n * (n - 1)
}

export function levelForXp(xp: number): { level: number; current: number; next: number; progress: number } {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return { level, current, next, progress: (xp - current) / (next - current) }
}
