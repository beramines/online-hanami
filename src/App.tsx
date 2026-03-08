import { useState } from 'react'
import { Scene } from './components/three/Scene'
import { Lobby } from './components/ui/Lobby'
import { HUD } from './components/ui/HUD'
import { useGameStore } from './stores/gameStore'
import { useRealtimeChat } from './hooks/useRealtimeChat'
import './index.css'

type AppPhase = 'lobby' | 'game'

function GameView() {
  // Activate realtime connection when in game
  useRealtimeChat()

  return (
    <>
      <Scene />
      <HUD />
    </>
  )
}

function App() {
  const [phase, setPhase] = useState<AppPhase>('lobby')
  const playerId = useGameStore((s) => s.playerId)

  const handleJoin = () => {
    setPhase('game')
  }

  return (
    <>
      {phase === 'lobby' && <Lobby onJoin={handleJoin} />}
      {phase === 'game' && playerId && <GameView />}
    </>
  )
}

export default App
