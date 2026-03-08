import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { useIsMobile } from '../../hooks/useIsMobile'

const AVATAR_EMOJIS: Record<string, string> = {
  male: '👨',
  female: '👩',
  dog: '🐕',
  cat: '🐱',
  seal: '🦭',
}

export function PlayerList() {
  const players = useGameStore((s) => s.players)
  const playerId = useGameStore((s) => s.playerId)
  const playerList = Object.values(players)
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(!isMobile)

  if (isMobile && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={styles.mobileToggle}
      >
        👥 {playerList.length}/8
      </button>
    )
  }

  return (
    <div style={styles.container}>
      <div
        style={styles.header}
        onClick={() => isMobile && setExpanded(false)}
      >
        参加者 ({playerList.length}/8)
        {isMobile && <span style={{ float: 'right' }}>✕</span>}
      </div>
      <div style={styles.list}>
        {playerList.map((p) => (
          <div key={p.id} style={styles.item}>
            <span>{AVATAR_EMOJIS[p.avatar] || '👤'}</span>
            <span style={styles.name}>
              {p.name}
              {p.id === playerId && <span style={styles.you}> (自分)</span>}
            </span>
            {p.isSpeaking && <span style={styles.speaking}>🔊</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.9)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    minWidth: '140px',
    border: '1px solid rgba(255,255,255,0.5)',
  },
  header: {
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#b22d4a',
    background: 'rgba(253,238,240,0.8)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    cursor: 'pointer',
  },
  list: {
    padding: '4px 0',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    fontSize: '13px',
  },
  name: {
    color: '#3a2a2a',
    flex: 1,
  },
  you: {
    fontSize: '11px',
    color: '#999',
  },
  speaking: {
    fontSize: '12px',
  },
  mobileToggle: {
    padding: '6px 12px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.9)',
    color: '#3a2a2a',
    fontSize: '12px',
    fontWeight: 500,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.1)',
  },
}
