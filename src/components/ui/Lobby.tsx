import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import type { AvatarType } from '../../types'

const AVATARS: { type: AvatarType; emoji: string; label: string }[] = [
  { type: 'male', emoji: '👨', label: '男性' },
  { type: 'female', emoji: '👩', label: '女性' },
  { type: 'dog', emoji: '🐕', label: '犬' },
  { type: 'cat', emoji: '🐱', label: '猫' },
  { type: 'seal', emoji: '🦭', label: 'アザラシ' },
]

interface LobbyProps {
  onJoin: () => void
}

export function Lobby({ onJoin }: LobbyProps) {
  const [name, setName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>('male')
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const setAvatar = useGameStore((s) => s.setAvatar)
  const setPlayerId = useGameStore((s) => s.setPlayerId)
  const updatePlayer = useGameStore((s) => s.updatePlayer)

  const handleJoin = () => {
    if (!name.trim()) return
    const id = crypto.randomUUID()
    const trimmedName = name.trim()
    setPlayerId(id)
    setPlayerName(trimmedName)
    setAvatar(selectedAvatar)
    updatePlayer(id, {
      id,
      name: trimmedName,
      avatar: selectedAvatar,
      position: [0, 0, 5],
      rotation: 0,
      isSpeaking: false,
    })
    onJoin()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Floating petals background */}
        <div style={styles.petalsBg}>
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              style={{
                ...styles.petal,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            >
              🌸
            </span>
          ))}
        </div>

        <h1 style={styles.title}>🌸 オンラインお花見 🌸</h1>
        <p style={styles.subtitle}>みんなで桜を楽しもう</p>

        <div style={styles.inputGroup}>
          <label style={styles.label}>名前</label>
          <input
            style={styles.input}
            type="text"
            placeholder="あなたの名前を入力..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={12}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>アバターを選択</label>
          <div style={styles.avatarGrid}>
            {AVATARS.map((av) => (
              <button
                key={av.type}
                onClick={() => setSelectedAvatar(av.type)}
                style={{
                  ...styles.avatarBtn,
                  ...(selectedAvatar === av.type ? styles.avatarBtnActive : {}),
                }}
              >
                <span style={styles.avatarEmoji}>{av.emoji}</span>
                <span style={styles.avatarLabel}>{av.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          style={{
            ...styles.joinBtn,
            ...(name.trim() ? {} : styles.joinBtnDisabled),
          }}
          onClick={handleJoin}
          disabled={!name.trim()}
        >
          お花見に参加する
        </button>

        <div style={styles.controls}>
          <p style={styles.controlsTitle}>操作方法</p>
          {'ontouchstart' in globalThis ? (
            <>
              <p style={styles.controlText}>左スティック: 移動</p>
              <p style={styles.controlText}>右スティック: 回転</p>
            </>
          ) : (
            <>
              <p style={styles.controlText}>W/↑ 前進　S/↓ 後退</p>
              <p style={styles.controlText}>A 左移動　D 右移動　←→ 回転</p>
              <p style={styles.controlText}>Enter チャット送信</p>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes petalFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #ffe4e8 0%, #ffd1dc 30%, #ffb7c5 70%, #e85d7a 100%)',
    zIndex: 100,
    overflow: 'hidden',
  },
  container: {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '480px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    position: 'relative',
    zIndex: 1,
    backdropFilter: 'blur(10px)',
  },
  petalsBg: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  petal: {
    position: 'absolute',
    top: '-20px',
    fontSize: '20px',
    animation: 'petalFall linear infinite',
    pointerEvents: 'none',
  },
  title: {
    fontFamily: "'Zen Maru Gothic', sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    color: '#b22d4a',
    textAlign: 'center',
    marginBottom: '4px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b5a5a',
    fontSize: '14px',
    marginBottom: '28px',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#3a2a2a',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '2px solid #fbd5dc',
    fontSize: '16px',
    background: '#fef7f8',
    color: '#3a2a2a',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  avatarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  avatarBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 4px',
    borderRadius: '12px',
    border: '2px solid #fbd5dc',
    background: '#fef7f8',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  avatarBtnActive: {
    border: '2px solid #e85d7a',
    background: '#fdeef0',
    boxShadow: '0 0 0 3px rgba(232,93,122,0.2)',
  },
  avatarEmoji: {
    fontSize: '32px',
    marginBottom: '4px',
  },
  avatarLabel: {
    fontSize: '11px',
    color: '#6b5a5a',
    fontWeight: 500,
  },
  joinBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #e85d7a, #d43d5e)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
  joinBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  controls: {
    marginTop: '20px',
    padding: '12px',
    background: '#fef7f8',
    borderRadius: '10px',
    textAlign: 'center',
  },
  controlsTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#b22d4a',
    marginBottom: '4px',
  },
  controlText: {
    fontSize: '12px',
    color: '#6b5a5a',
    lineHeight: 1.6,
  },
}
