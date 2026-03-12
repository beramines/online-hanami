import { useState } from 'react'
import { useGameStore } from '../../stores/gameStore'
import type { RoomSummary } from '../../hooks/useRoomList'
import type { AvatarType } from '../../types'

const AVATARS: { type: AvatarType; emoji: string; label: string }[] = [
  { type: 'male', emoji: '👨', label: '男性' },
  { type: 'female', emoji: '👩', label: '女性' },
  { type: 'dog', emoji: '🐕', label: '犬' },
  { type: 'cat', emoji: '🐱', label: '猫' },
  { type: 'seal', emoji: '🦭', label: 'アザラシ' },
]

const MAX_PLAYERS = 8

interface LobbyProps {
  onJoin: () => void
  rooms: RoomSummary[]
  isLoading: boolean
  createRoom: (roomName: string) => Promise<string>
  joinRoom: (roomId: string, roomName: string) => Promise<void>
  inviteRoomId: string | null
}

type LobbyStep = 'profile' | 'room-select'

export function Lobby({ onJoin, rooms, isLoading, createRoom, joinRoom, inviteRoomId }: LobbyProps) {
  const [step, setStep] = useState<LobbyStep>('profile')
  const [name, setName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>('male')
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const setAvatar = useGameStore((s) => s.setAvatar)
  const setPlayerId = useGameStore((s) => s.setPlayerId)
  const updatePlayer = useGameStore((s) => s.updatePlayer)

  const handleNext = async () => {
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

    // If invited via URL, auto-join that room
    if (inviteRoomId) {
      setJoining(true)
      setError('')
      try {
        // Find room name from room list, or use a default
        const existingRoom = rooms.find((r) => r.roomId === inviteRoomId)
        const roomName = existingRoom?.roomName || 'お花見ルーム'
        await joinRoom(inviteRoomId, roomName)
        onJoin()
        return
      } catch {
        setError('招待リンクのルームに参加できませんでした。ルームを選択してください。')
        setJoining(false)
      }
    }

    setStep('room-select')
  }

  const handleCreateRoom = async () => {
    if (joining) return
    setJoining(true)
    setError('')
    try {
      const roomName = newRoomName.trim() || `${name}のお花見`
      await createRoom(roomName)
      onJoin()
    } catch {
      setError('ルームの作成に失敗しました。もう一度お試しください。')
      setJoining(false)
    }
  }

  const handleJoinRoom = async (roomId: string, roomName: string) => {
    if (joining) return
    setJoining(true)
    setError('')
    try {
      await joinRoom(roomId, roomName)
      onJoin()
    } catch {
      setError('ルームへの参加に失敗しました。もう一度お試しください。')
      setJoining(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <h1 style={styles.title}>🌸 オンラインお花見 🌸</h1>
        <p style={styles.subtitle}>みんなで桜を楽しもう</p>

        {step === 'profile' && (
          <>
            {inviteRoomId && (
              <div style={styles.inviteBanner}>
                招待リンクからのアクセスです。名前を入力して参加しましょう！
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>名前</label>
              <input
                style={styles.input}
                type="text"
                placeholder="あなたの名前を入力..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleNext()}
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
                ...(!name.trim() || joining ? styles.joinBtnDisabled : {}),
              }}
              onClick={handleNext}
              disabled={!name.trim() || joining}
            >
              {joining ? '参加中...' : inviteRoomId ? 'ルームに参加' : '次へ'}
            </button>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.controls}>
              <p style={styles.controlsTitle}>操作方法</p>
              {'ontouchstart' in globalThis ? (
                <>
                  <p style={styles.controlText}>左スティック: 移動</p>
                  <p style={styles.controlText}>右スティック: 回転</p>
                </>
              ) : (
                <>
                  <p style={styles.controlText}>W 前進　S 後退　A 左移動　D 右移動</p>
                  <p style={styles.controlText}>←→ 回転　↑↓ 視点上下</p>
                  <p style={styles.controlText}>V 視点切替　Enter チャット送信</p>
                </>
              )}
            </div>
          </>
        )}

        {step === 'room-select' && (
          <>
            <button
              style={styles.backBtn}
              onClick={() => setStep('profile')}
            >
              ← 戻る
            </button>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.inputGroup}>
              <label style={styles.label}>ルームを選択</label>

              {isLoading ? (
                <p style={styles.loadingText}>ルームを読み込み中...</p>
              ) : rooms.length === 0 ? (
                <p style={styles.emptyText}>現在ルームがありません。新しく作成しましょう！</p>
              ) : (
                <div style={styles.roomList}>
                  {rooms.map((room) => (
                    <button
                      key={room.roomId}
                      style={{
                        ...styles.roomItem,
                        ...(room.playerCount >= MAX_PLAYERS ? styles.roomItemFull : {}),
                      }}
                      onClick={() => handleJoinRoom(room.roomId, room.roomName)}
                      disabled={room.playerCount >= MAX_PLAYERS || joining}
                    >
                      <div style={styles.roomInfo}>
                        <span style={styles.roomName}>{room.roomName}</span>
                        <span style={styles.roomCount}>
                          {room.playerCount}/{MAX_PLAYERS}人
                        </span>
                      </div>
                      <span style={styles.roomJoinLabel}>
                        {room.playerCount >= MAX_PLAYERS ? '満員' : '参加'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!showCreateRoom ? (
              <button
                style={styles.createRoomBtn}
                onClick={() => setShowCreateRoom(true)}
              >
                + 新しいルームを作成
              </button>
            ) : (
              <div style={styles.createRoomForm}>
                <input
                  style={styles.input}
                  type="text"
                  placeholder={`${name}のお花見`}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={20}
                  onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleCreateRoom()}
                  autoFocus
                />
                <div style={styles.createRoomActions}>
                  <button
                    style={styles.cancelBtn}
                    onClick={() => setShowCreateRoom(false)}
                  >
                    キャンセル
                  </button>
                  <button
                    style={{
                      ...styles.joinBtn,
                      ...(joining ? styles.joinBtnDisabled : {}),
                    }}
                    onClick={handleCreateRoom}
                    disabled={joining}
                  >
                    {joining ? '参加中...' : 'ルームを作成'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    position: 'relative',
    zIndex: 1,
    backdropFilter: 'blur(10px)',
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
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#b22d4a',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '4px 0',
    marginBottom: '16px',
    fontWeight: 500,
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  roomItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '2px solid #fbd5dc',
    background: '#fef7f8',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    textAlign: 'left',
  },
  roomItemFull: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  roomInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  roomName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#3a2a2a',
  },
  roomCount: {
    fontSize: '12px',
    color: '#6b5a5a',
  },
  roomJoinLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e85d7a',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6b5a5a',
    fontSize: '14px',
    padding: '20px',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b5a5a',
    fontSize: '14px',
    padding: '20px',
  },
  createRoomBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: '#fef7f8',
    color: '#b22d4a',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    border: '2px dashed #fbd5dc',
    transition: 'all 0.2s',
  },
  createRoomForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  createRoomActions: {
    display: 'flex',
    gap: '8px',
  },
  errorText: {
    textAlign: 'center',
    color: '#d43d5e',
    fontSize: '13px',
    marginBottom: '12px',
  },
  inviteBanner: {
    background: 'linear-gradient(135deg, #fff0f3, #ffe0e6)',
    border: '2px solid #e85d7a',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#b22d4a',
    textAlign: 'center',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '12px',
    background: '#f5f0f0',
    color: '#6b5a5a',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  },
}
