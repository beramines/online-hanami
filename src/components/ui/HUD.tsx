import { useCallback } from 'react'
import { ChatPanel } from './ChatPanel'
import { VoiceControls } from './VoiceControls'
import { CameraToggle } from './CameraToggle'
import { PlayerList } from './PlayerList'
import { MobileControls } from './VirtualJoystick'
import { useInputStore } from '../../stores/inputStore'

interface HUDProps {
  onLeave?: () => void
}

export function HUD({ onLeave }: HUDProps) {
  const setMove = useInputStore((s) => s.setMove)
  const setLook = useInputStore((s) => s.setLook)

  const handleMoveJoystick = useCallback((x: number, y: number) => {
    setMove(x, y)
  }, [setMove])

  const handleLookJoystick = useCallback((x: number, y: number) => {
    setLook(x, y)
  }, [setLook])

  return (
    <div style={styles.hud}>
      <div style={styles.topBar}>
        <div style={styles.logo}>🌸 お花見</div>
        <div style={styles.topRight}>
          <CameraToggle />
          <VoiceControls />
          {onLeave && (
            <button style={styles.leaveBtn} onClick={onLeave}>
              退出
            </button>
          )}
        </div>
      </div>
      <div style={styles.sidebar}>
        <PlayerList />
      </div>
      <ChatPanel />
      <MobileControls
        onMoveJoystick={handleMoveJoystick}
        onLookJoystick={handleLookJoystick}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  hud: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 10,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    pointerEvents: 'auto',
  },
  topRight: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  logo: {
    fontFamily: "'Zen Maru Gothic', sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    background: 'rgba(232,93,122,0.8)',
    padding: '6px 14px',
    borderRadius: '20px',
    backdropFilter: 'blur(10px)',
  },
  leaveBtn: {
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  },
  sidebar: {
    position: 'absolute',
    top: '60px',
    right: '16px',
    pointerEvents: 'auto',
  },
}
