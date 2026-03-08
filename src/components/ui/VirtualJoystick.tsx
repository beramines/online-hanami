import { useRef, useCallback, useEffect, useState } from 'react'

interface JoystickState {
  x: number // -1 to 1
  y: number // -1 to 1
  active: boolean
}

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void
  side: 'left' | 'right'
}

const JOYSTICK_SIZE = 120
const KNOB_SIZE = 50
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2

export function VirtualJoystick({ onMove, side }: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<JoystickState>({ x: 0, y: 0, active: false })
  const touchIdRef = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0 })

  const getCenter = useCallback(() => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return
    const touch = e.changedTouches[0]
    touchIdRef.current = touch.identifier
    centerRef.current = getCenter()
    setState({ x: 0, y: 0, active: true })
    e.preventDefault()
  }, [getCenter])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current === null) return
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === touchIdRef.current
    )
    if (!touch) return

    const dx = touch.clientX - centerRef.current.x
    const dy = touch.clientY - centerRef.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const clampedDist = Math.min(distance, MAX_DISTANCE)
    const angle = Math.atan2(dy, dx)

    const nx = (Math.cos(angle) * clampedDist) / MAX_DISTANCE
    const ny = (Math.sin(angle) * clampedDist) / MAX_DISTANCE

    setState({ x: nx, y: ny, active: true })
    onMove(nx, ny)
    e.preventDefault()
  }, [onMove])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === touchIdRef.current
    )
    if (!touch) return
    touchIdRef.current = null
    setState({ x: 0, y: 0, active: false })
    onMove(0, 0)
    e.preventDefault()
  }, [onMove])

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        ...styles.container,
        [side]: '20px',
      }}
    >
      {/* Base circle */}
      <div style={styles.base}>
        {/* Direction indicators */}
        <div style={styles.indicator}>
          {side === 'left' ? '↕' : '↔'}
        </div>
      </div>
      {/* Knob */}
      <div
        style={{
          ...styles.knob,
          transform: `translate(${state.x * MAX_DISTANCE}px, ${state.y * MAX_DISTANCE}px)`,
          opacity: state.active ? 1 : 0.6,
          scale: state.active ? '1.1' : '1',
        }}
      />
    </div>
  )
}

export function MobileControls({ onMoveJoystick, onLookJoystick }: {
  onMoveJoystick: (x: number, y: number) => void
  onLookJoystick: (x: number, y: number) => void
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isMobile) return null

  return (
    <>
      <VirtualJoystick side="left" onMove={onMoveJoystick} />
      <VirtualJoystick side="right" onMove={onLookJoystick} />
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '30px',
    width: `${JOYSTICK_SIZE}px`,
    height: `${JOYSTICK_SIZE}px`,
    zIndex: 20,
    touchAction: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },
  base: {
    width: `${JOYSTICK_SIZE}px`,
    height: `${JOYSTICK_SIZE}px`,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    border: '2px solid rgba(255,255,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  indicator: {
    fontSize: '20px',
    color: 'rgba(255,255,255,0.4)',
    userSelect: 'none',
  },
  knob: {
    position: 'absolute',
    width: `${KNOB_SIZE}px`,
    height: `${KNOB_SIZE}px`,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.7)',
    border: '2px solid rgba(255,255,255,0.9)',
    transition: 'opacity 0.15s, scale 0.15s',
    pointerEvents: 'none',
  },
}
