import { useMemo } from 'react'

export function Ground() {
  // Random grass tufts
  const grassPatches = useMemo(() => {
    const patches: Array<{ pos: [number, number, number]; size: number; color: string }> = []
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 5 + Math.random() * 30
      patches.push({
        pos: [Math.cos(angle) * r, 0.01, Math.sin(angle) * r],
        size: 0.5 + Math.random() * 1.5,
        color: `hsl(${118 + Math.random() * 15}, ${28 + Math.random() * 10}%, ${50 + Math.random() * 8}%)`,
      })
    }
    return patches
  }, [])

  return (
    <group>
      {/* Main grass ground */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <circleGeometry args={[50, 64]} />
        <meshStandardMaterial color="#6aad6a" roughness={0.92} />
      </mesh>

      {/* Lighter center area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial color="#7ec87e" roughness={0.88} />
      </mesh>

      {/* Stone path */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, Math.random() * 0.5, 0]}
          position={[
            (Math.random() - 0.5) * 0.6,
            0.02,
            3 + i * 1.5 + (Math.random() - 0.5) * 0.3,
          ]}
          receiveShadow
        >
          <circleGeometry args={[0.3 + Math.random() * 0.15, 6]} />
          <meshStandardMaterial color={`hsl(30, 15%, ${65 + Math.random() * 10}%)`} roughness={0.95} />
        </mesh>
      ))}

      {/* Grass variation patches */}
      {grassPatches.map((patch, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={patch.pos} receiveShadow>
          <circleGeometry args={[patch.size, 8]} />
          <meshStandardMaterial color={patch.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}
