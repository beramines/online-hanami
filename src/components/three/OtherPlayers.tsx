import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import { Avatar } from './Avatar'
import type { Player } from '../../types'

const LERP_FACTOR = 10 // Higher = faster catch-up

function InterpolatedPlayer({ player }: { player: Player }) {
  const groupRef = useRef<THREE.Group>(null)
  const targetPos = useRef(new THREE.Vector3(...player.position!))
  const currentRot = useRef(player.rotation ?? 0)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Update target from latest store data
    const target = player.position!
    targetPos.current.set(target[0], target[1], target[2])

    // Exponential lerp for smooth position interpolation
    const t = 1 - Math.exp(-LERP_FACTOR * delta)
    groupRef.current.position.lerp(targetPos.current, t)

    // Shortest-path rotation interpolation
    const targetRot = player.rotation ?? 0
    let diff = targetRot - currentRot.current
    // Normalize to [-PI, PI]
    diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI
    if (diff < -Math.PI) diff += Math.PI * 2
    currentRot.current += diff * t
    groupRef.current.rotation.y = currentRot.current
  })

  return (
    <group ref={groupRef} position={player.position} rotation={[0, player.rotation ?? 0, 0]}>
      <Avatar
        type={player.avatar}
        position={[0, 0, 0]}
        rotation={0}
        name={player.name}
        isSpeaking={player.isSpeaking}
      />
    </group>
  )
}

export function OtherPlayers() {
  const players = useGameStore((s) => s.players)
  const playerId = useGameStore((s) => s.playerId)

  return (
    <>
      {Object.values(players)
        .filter((p) => p.id !== playerId && p.avatar && p.position)
        .map((player) => (
          <InterpolatedPlayer key={player.id} player={player} />
        ))}
    </>
  )
}
