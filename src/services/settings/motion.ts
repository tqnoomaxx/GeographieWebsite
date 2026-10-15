import { useSyncExternalStore } from 'react'

export type MotionMode = 'system' | 'quiet'
const KEY = 'gk.motion'
const EVENT = 'atlas-motion-change'
export function getMotionMode(): MotionMode {
  return localStorage.getItem(KEY) === 'quiet' ? 'quiet' : 'system'
}
function reduced() {
  return getMotionMode() === 'quiet' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
function applyMotion() {
  document.documentElement.dataset.motion = reduced() ? 'reduced' : 'system'
  window.dispatchEvent(new Event(EVENT))
}
export function setMotionMode(mode: MotionMode) {
  localStorage.setItem(KEY, mode)
  applyMotion()
}
export function applyStoredMotion() {
  applyMotion()
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyMotion)
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) applyMotion()
  })
}
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, reduced, () => true)
}
export function useMotionMode() {
  return useSyncExternalStore(subscribe, getMotionMode, () => 'system' as const)
}
