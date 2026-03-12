import { useState, useCallback, useMemo } from 'react'
import { Scene } from './components/three/Scene'
import { Lobby } from './components/ui/Lobby'
import { HUD } from './components/ui/HUD'
import { useGameStore } from './stores/gameStore'
import { useRealtimeChat } from './hooks/useRealtimeChat'
import { useRoomList } from './hooks/useRoomList'
import { useChatStore } from './stores/chatStore'
import './index.css'

type AppPhase = 'lobby' | 'game'

/** Parse ?room=xxx from URL search params */
function getInviteRoomId(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('room')
}

/** Update URL with room param (without page reload) */
function setUrlRoom(roomId: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomId)
  window.history.replaceState(null, '', url.toString())
}

/** Remove room param from URL */
function clearUrlRoom() {
  const url = new URL(window.location.href)
  url.searchParams.delete('room')
  window.history.replaceState(null, '', url.pathname)
}

function GameView({ onLeave }: { onLeave: () => void }) {
  useRealtimeChat()

  return (
    <>
      <Scene />
      <HUD onLeave={onLeave} />
    </>
  )
}

function App() {
  const [phase, setPhase] = useState<AppPhase>('lobby')
  const playerId = useGameStore((s) => s.playerId)

  const inviteRoomId = useMemo(() => getInviteRoomId(), [])

  // Keep lobby channel alive across phases
  const { rooms, isLoading, createRoom, joinRoom, leaveRoom } = useRoomList()

  const handleJoin = () => {
    // Update URL with current room ID
    const roomId = useGameStore.getState().roomId
    if (roomId) setUrlRoom(roomId)
    setPhase('game')
  }

  const handleLeave = useCallback(async () => {
    await leaveRoom()
    clearUrlRoom()
    useChatStore.setState({ messages: [] })
    setPhase('lobby')
  }, [leaveRoom])

  return (
    <>
      {phase === 'lobby' && (
        <Lobby
          onJoin={handleJoin}
          rooms={rooms}
          isLoading={isLoading}
          createRoom={createRoom}
          joinRoom={joinRoom}
          inviteRoomId={inviteRoomId}
        />
      )}
      {phase === 'game' && playerId && <GameView onLeave={handleLeave} />}
    </>
  )
}

export default App
