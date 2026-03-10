import { useState, useCallback } from 'react'
import { Scene } from './components/three/Scene'
import { Lobby } from './components/ui/Lobby'
import { HUD } from './components/ui/HUD'
import { useGameStore } from './stores/gameStore'
import { useRealtimeChat } from './hooks/useRealtimeChat'
import { useRoomList } from './hooks/useRoomList'
import { useChatStore } from './stores/chatStore'
import './index.css'

type AppPhase = 'lobby' | 'game'

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

  // Keep lobby channel alive across phases
  const { rooms, isLoading, createRoom, joinRoom, leaveRoom } = useRoomList()

  const handleJoin = () => {
    setPhase('game')
  }

  const handleLeave = useCallback(async () => {
    await leaveRoom()
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
        />
      )}
      {phase === 'game' && playerId && <GameView onLeave={handleLeave} />}
    </>
  )
}

export default App
