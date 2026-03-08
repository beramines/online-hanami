import { useGameStore } from '../../stores/gameStore'
import { Avatar } from './Avatar'

export function OtherPlayers() {
  const players = useGameStore((s) => s.players)
  const playerId = useGameStore((s) => s.playerId)

  return (
    <>
      {Object.values(players)
        .filter((p) => p.id !== playerId && p.avatar && p.position)
        .map((player) => (
          <Avatar
            key={player.id}
            type={player.avatar}
            position={player.position}
            rotation={player.rotation}
            name={player.name}
            isSpeaking={player.isSpeaking}
          />
        ))}
    </>
  )
}
