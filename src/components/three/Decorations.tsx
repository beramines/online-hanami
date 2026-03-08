
export function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 6]} />
        <meshStandardMaterial color="#4a3520" roughness={0.9} />
      </mesh>
      {/* Lantern body */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.5, 8]} />
        <meshStandardMaterial
          color="#ff6b6b"
          emissive="#ff4444"
          emissiveIntensity={0.3}
          roughness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 2.8, 0]}>
        <coneGeometry args={[0.22, 0.15, 8]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.8} />
      </mesh>
      {/* Bottom cap */}
      <mesh position={[0, 2.22, 0]}>
        <cylinderGeometry args={[0.18, 0.12, 0.06, 8]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.8} />
      </mesh>
      {/* Glow light */}
      <pointLight position={[0, 2.5, 0]} color="#ff8866" intensity={0.8} distance={6} decay={2} />
    </group>
  )
}

export function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.2, 0.06, 0.4]} />
        <meshStandardMaterial color="#a0714f" roughness={0.85} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.6, -0.17]} castShadow>
        <boxGeometry args={[1.2, 0.45, 0.04]} />
        <meshStandardMaterial color="#a0714f" roughness={0.85} />
      </mesh>
      {/* Legs */}
      {[-0.5, 0.5].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.17, 0.12]} castShadow>
            <boxGeometry args={[0.05, 0.34, 0.05]} />
            <meshStandardMaterial color="#5a3a20" roughness={0.9} />
          </mesh>
          <mesh position={[x, 0.17, -0.12]} castShadow>
            <boxGeometry args={[0.05, 0.34, 0.05]} />
            <meshStandardMaterial color="#5a3a20" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function StoneLantern({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 0.2, 6]} />
        <meshStandardMaterial color="#888888" roughness={0.95} />
      </mesh>
      {/* Pillar */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 6]} />
        <meshStandardMaterial color="#999999" roughness={0.9} />
      </mesh>
      {/* Light chamber */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.3, 0.25, 0.3]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.85} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <coneGeometry args={[0.25, 0.2, 4]} />
        <meshStandardMaterial color="#777777" roughness={0.9} />
      </mesh>
      {/* Inner glow */}
      <pointLight position={[0, 0.9, 0]} color="#ffcc88" intensity={0.4} distance={4} decay={2} />
    </group>
  )
}

export function Pond({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Water surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial
          color="#5599bb"
          roughness={0.1}
          metalness={0.3}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Pond edge - stones */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2
        const r = 2.5 + (Math.random() - 0.5) * 0.3
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, 0.08, Math.sin(angle) * r]}
            rotation={[Math.random() * 0.3, Math.random() * Math.PI, 0]}
            castShadow
          >
            <sphereGeometry args={[0.15 + Math.random() * 0.1, 6, 6]} />
            <meshStandardMaterial color={`hsl(0, 0%, ${55 + Math.random() * 20}%)`} roughness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

export function PicnicSet({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Blanket (goza mat) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial color="#c44569" roughness={0.8} opacity={0.85} transparent />
      </mesh>
      {/* Bento boxes */}
      <mesh position={[-0.4, 0.08, 0.2]} castShadow>
        <boxGeometry args={[0.25, 0.1, 0.18]} />
        <meshStandardMaterial color="#dd4444" roughness={0.6} />
      </mesh>
      <mesh position={[0.3, 0.08, -0.1]} castShadow>
        <boxGeometry args={[0.2, 0.08, 0.2]} />
        <meshStandardMaterial color="#2266aa" roughness={0.6} />
      </mesh>
      {/* Sake bottle */}
      <mesh position={[0.0, 0.15, 0.0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.25, 8]} />
        <meshStandardMaterial color="#eeeedd" roughness={0.3} />
      </mesh>
      {/* Cups */}
      {[[-0.2, 0.04, -0.3], [0.15, 0.04, 0.35], [-0.5, 0.04, -0.05]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.03, 0.06, 8]} />
          <meshStandardMaterial color="#eeddcc" roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function Torii({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const color = '#cc3333'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Left pillar */}
      <mesh position={[-1.0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 3, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Right pillar */}
      <mesh position={[1.0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 3, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Top beam (kasagi) */}
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[2.6, 0.15, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Lower beam (nuki) */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.1, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  )
}
