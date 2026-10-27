import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'

const MotionContext = createContext({ time: { value: 0 }, running: false, night: false })

/** One clock keeps the wind and all water surfaces in step without React updates per frame. */
export function DioramaMotion({
  running,
  night,
  children,
}: {
  running: boolean
  night: boolean
  children: ReactNode
}) {
  const clock = useRef({ time: { value: 0 }, running, night })
  clock.current.running = running
  clock.current.night = night
  useFrame((_, delta) => {
    if (clock.current.running) clock.current.time.value += Math.min(delta, 0.05)
  }, -1)
  return <MotionContext.Provider value={clock.current}>{children}</MotionContext.Provider>
}

export const useDioramaMotion = () => useContext(MotionContext)
