import { useCallback, useState } from 'react'
import { ChatPanel } from './ChatPanel'
import { VoiceControls } from './VoiceControls'
import { CameraToggle } from './CameraToggle'
import { PlayerList } from './PlayerList'
import { MobileControls } from './VirtualJoystick'
import { useInputStore } from '../../stores/inputStore'
import { useGameStore } from '../../stores/gameStore'

interface HUDProps {
  onLeave?: () => void
}

export function HUD({ onLeave }: HUDProps) {
  const setMove = useInputStore((s) => s.setMove)
  const setLook = useInputStore((s) => s.setLook)
  const roomId = useGameStore((s) => s.roomId)
  const [copied, setCopied] = useState(false)

  const handleMoveJoystick = useCallback((x: number, y: number) => {
    setMove(x, y)
  }, [setMove])

  const handleLookJoystick = useCallback((x: number, y: number) => {
    setLook(x, y)
  }, [setLook])

  const handleShare = useCallback(async () => {
    if (!roomId) return
    const url = new URL(window.location.href)
    url.searchParams.set('room', roomId)
    url.hash = ''
    const text = url.toString()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback: use deprecated execCommand for environments where clipboard API is blocked
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [roomId])

  return (
    <div style={styles.hud}>
      <div style={styles.topBar}>
        <div style={styles.logo}>🌸 お花見</div>
        <div style={styles.topRight}>
          <button style={copied ? { ...styles.shareBtn, ...styles.shareBtnCopied } : styles.shareBtn} onClick={handleShare}>
            {copied ? 'コピー済み!' : '招待URL'}
          </button>
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
  shareBtn: {
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(232,93,122,0.8)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    transition: 'background 0.2s',
  },
  shareBtnCopied: {
    background: 'rgba(34,197,94,0.9)',
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
