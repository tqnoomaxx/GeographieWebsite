import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

type Position = { x: number; y: number }
const STORAGE_KEY = 'atlasfunke.navigation.scroll.v1'
const positions = new Map<string, Position>()
let loaded = false
function loadPositions() {
  if (loaded) return
  loaded = true
  try {
    const rows: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(rows))
      for (const row of rows.slice(-100)) {
        if (!Array.isArray(row) || typeof row[0] !== 'string' || row[0].length > 128) continue
        const p = row[1]
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0)
          positions.set(row[0], { x: p.x, y: p.y })
      }
  } catch {
    /* In-memory history still works with session storage disabled. */
  }
}

/** Wait for lazy pages and their data before restoring a back/forward scroll position. */
export function NavigationRestoration() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const activeKey = useRef(location.key)
  const previous = useRef<{ key: string; path: string } | null>(null)
  const restoring = useRef(false)
  useLayoutEffect(() => {
    loadPositions()
    const before = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const remember = () => {
      if (!restoring.current) positions.set(activeKey.current, { x: window.scrollX, y: window.scrollY })
    }
    const save = () => {
      remember()
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...positions].slice(-100)))
      } catch {
        /* Optional persistence. */
      }
    }
    window.addEventListener('scroll', remember, { passive: true })
    window.addEventListener('pagehide', save)
    return () => {
      window.removeEventListener('scroll', remember)
      window.removeEventListener('pagehide', save)
      window.history.scrollRestoration = before
    }
  }, [])
  useLayoutEffect(() => {
    const old = previous.current
    activeKey.current = location.key
    previous.current = { key: location.key, path: location.pathname }
    if (navigationType === 'REPLACE' && old?.path === location.pathname) {
      positions.set(location.key, { x: window.scrollX, y: window.scrollY })
      return
    }
    const target = navigationType === 'POP' ? (positions.get(location.key) ?? { x: 0, y: 0 }) : { x: 0, y: 0 }
    let hash = ''
    try {
      hash = decodeURIComponent(location.hash.slice(1))
    } catch {
      /* A malformed fragment is not a selector. */
    }
    restoring.current = true
    let frame = 0
    let finished = false
    let timer: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(() => schedule())
    const mutation = hash ? new MutationObserver(() => schedule()) : undefined
    function stop() {
      if (finished) return
      finished = true
      restoring.current = false
      cancelAnimationFrame(frame)
      observer.disconnect()
      mutation?.disconnect()
      clearTimeout(timer)
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
      window.removeEventListener('pointerdown', cancel)
      window.removeEventListener('keydown', cancel)
    }
    function cancel() {
      stop()
      positions.set(location.key, { x: window.scrollX, y: window.scrollY })
    }
    function restore() {
      if (finished) return
      if (hash && navigationType !== 'POP') {
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ behavior: 'instant' })
          stop()
          return
        }
      }
      window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' })
      if (
        (!hash || navigationType === 'POP') &&
        document.documentElement.scrollHeight - window.innerHeight >= target.y - 2
      ) {
        stop()
        positions.set(location.key, { x: window.scrollX, y: window.scrollY })
      }
    }
    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(restore)
    }
    observer.observe(document.body)
    mutation?.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchstart', cancel, { passive: true })
    window.addEventListener('pointerdown', cancel, { passive: true })
    window.addEventListener('keydown', cancel)
    timer = setTimeout(stop, 5000)
    schedule()
    return stop
  }, [location.key, location.pathname, location.hash, navigationType])
  return null
}
