import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SakuraTreeProps {
  position?: [number, number, number]
  scale?: number
}

// Seeded random for consistent tree shapes
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

interface Branch {
  start: [number, number, number]
  end: [number, number, number]
  radiusStart: number
  radiusEnd: number
}

interface BlossomCluster {
  pos: [number, number, number]
  size: number
  color: string
  emissiveIntensity: number
  opacity: number
  segments: number
}

function generateTree(seed: number) {
  const rand = seededRandom(seed)
  const branches: Branch[] = []
  const blossoms: BlossomCluster[] = []
  const pinkPalette = [
    '#ffb7c5', '#ffc0cb', '#ffaabb', '#ffd1dc', '#ffcad4',
    '#f8a4b8', '#fbb5c0', '#f9c0cc', '#ffddee', '#ffe0ea',
  ]

  // Trunk
  const trunkHeight = 2.0 + rand() * 0.5
  branches.push({
    start: [0, 0, 0],
    end: [0, trunkHeight, 0],
    radiusStart: 0.16,
    radiusEnd: 0.1,
  })

  // Generate branches recursively
  function addBranch(
    origin: [number, number, number],
    direction: THREE.Vector3,
    length: number,
    radius: number,
    depth: number,
  ) {
    if (depth > 4 || radius < 0.01) return

    const end: [number, number, number] = [
      origin[0] + direction.x * length,
      origin[1] + direction.y * length,
      origin[2] + direction.z * length,
    ]

    branches.push({
      start: origin,
      end,
      radiusStart: radius,
      radiusEnd: radius * 0.65,
    })

    // Add blossom clusters at branch tips and along branches
    if (depth >= 2) {
      const clusterCount = depth >= 3 ? 2 + Math.floor(rand() * 2) : 1
      for (let c = 0; c < clusterCount; c++) {
        const t = 0.5 + rand() * 0.5
        const offset = depth >= 3 ? 0.1 : 0.2
        blossoms.push({
          pos: [
            origin[0] + direction.x * length * t + (rand() - 0.5) * offset,
            origin[1] + direction.y * length * t + (rand() - 0.5) * offset,
            origin[2] + direction.z * length * t + (rand() - 0.5) * offset,
          ],
          size: depth >= 3 ? 0.12 + rand() * 0.1 : 0.2 + rand() * 0.15,
          color: pinkPalette[Math.floor(rand() * pinkPalette.length)],
          emissiveIntensity: 0.03 + rand() * 0.05,
          opacity: 0.85 + rand() * 0.15,
          segments: depth >= 3 ? 6 : 8,
        })
      }
    }

    // Fork into child branches
    const childCount = depth === 0 ? 3 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2)
    for (let i = 0; i < childCount; i++) {
      const spreadAngle = depth === 0 ? 0.4 + rand() * 0.5 : 0.3 + rand() * 0.6
      const rotAngle = (i / childCount) * Math.PI * 2 + (rand() - 0.5) * 0.8

      const newDir = direction.clone()
      // Tilt outward
      const tiltAxis = new THREE.Vector3(Math.cos(rotAngle), 0, Math.sin(rotAngle)).normalize()
      newDir.applyAxisAngle(tiltAxis, spreadAngle)
      // Slight droop for weeping effect at higher depths
      if (depth >= 2) {
        newDir.y -= 0.15 + rand() * 0.15
      }
      newDir.normalize()

      const childLength = length * (0.55 + rand() * 0.25)
      const childRadius = radius * (0.5 + rand() * 0.2)

      addBranch(end, newDir, childLength, childRadius, depth + 1)
    }
  }

  // Start main branches from top of trunk
  const mainBranchCount = 4 + Math.floor(rand() * 2)
  for (let i = 0; i < mainBranchCount; i++) {
    const angle = (i / mainBranchCount) * Math.PI * 2 + (rand() - 0.5) * 0.4
    const upTilt = 0.5 + rand() * 0.4
    const dir = new THREE.Vector3(
      Math.cos(angle) * (1 - upTilt),
      upTilt,
      Math.sin(angle) * (1 - upTilt),
    ).normalize()

    addBranch(
      [0, trunkHeight, 0],
      dir,
      1.0 + rand() * 0.5,
      0.06 + rand() * 0.03,
      1,
    )
  }

  // Add large canopy clusters for fullness
  const canopyBaseY = trunkHeight + 0.6
  const canopyClusters = 8 + Math.floor(rand() * 4)
  for (let i = 0; i < canopyClusters; i++) {
    const angle = (i / canopyClusters) * Math.PI * 2 + rand() * 0.5
    const r = 0.5 + rand() * 0.5
    const y = canopyBaseY + rand() * 0.8
    blossoms.push({
      pos: [Math.cos(angle) * r, y, Math.sin(angle) * r],
      size: 0.35 + rand() * 0.25,
      color: pinkPalette[Math.floor(rand() * pinkPalette.length)],
      emissiveIntensity: 0.03 + rand() * 0.04,
      opacity: 0.85 + rand() * 0.15,
      segments: 10,
    })
  }

  // Top crown clusters
  for (let i = 0; i < 4; i++) {
    blossoms.push({
      pos: [
        (rand() - 0.5) * 0.4,
        canopyBaseY + 0.7 + rand() * 0.4,
        (rand() - 0.5) * 0.4,
      ],
      size: 0.25 + rand() * 0.2,
      color: pinkPalette[Math.floor(rand() * pinkPalette.length)],
      emissiveIntensity: 0.04 + rand() * 0.04,
      opacity: 0.85 + rand() * 0.1,
      segments: 8,
    })
  }

  return { branches, blossoms }
}

export function SakuraTree({ position = [0, 0, 0], scale = 1 }: SakuraTreeProps) {
  const windRef = useRef<THREE.Group>(null)

  // Generate consistent tree from position-based seed
  const seed = Math.abs(position[0] * 1000 + position[2] * 7 + scale * 13) + 1
  const { branches, blossoms } = useMemo(() => generateTree(seed), [seed])

  // Subtle wind sway
  useFrame((state) => {
    if (windRef.current) {
      const t = state.clock.elapsedTime
      const s = seed % 10
      windRef.current.rotation.z = Math.sin(t * 0.5 + s) * 0.015
      windRef.current.rotation.x = Math.sin(t * 0.3 + s * 2) * 0.01
    }
  })

  return (
    <group position={position} scale={scale}>
      <group ref={windRef}>
        {/* Branches */}
        {branches.map((branch, i) => {
          const sx = branch.start[0], sy = branch.start[1], sz = branch.start[2]
          const ex = branch.end[0], ey = branch.end[1], ez = branch.end[2]
          const dx = ex - sx, dy = ey - sy, dz = ez - sz
          const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (length < 0.01) return null

          const midX = (sx + ex) / 2
          const midY = (sy + ey) / 2
          const midZ = (sz + ez) / 2

          // Calculate rotation to align cylinder with branch direction
          const dir = new THREE.Vector3(dx, dy, dz).normalize()
          const up = new THREE.Vector3(0, 1, 0)
          const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
          const euler = new THREE.Euler().setFromQuaternion(quat)

          return (
            <mesh
              key={`b${i}`}
              position={[midX, midY, midZ]}
              rotation={euler}
              castShadow
            >
              <cylinderGeometry args={[branch.radiusEnd, branch.radiusStart, length, 6]} />
              <meshStandardMaterial
                color={i === 0 ? '#6b4226' : '#7a5230'}
                roughness={0.92}
              />
            </mesh>
          )
        })}

        {/* Blossom clusters */}
        {blossoms.map((cluster, i) => (
          <mesh key={`f${i}`} position={cluster.pos} castShadow>
            <icosahedronGeometry args={[cluster.size, 2]} />
            <meshStandardMaterial
              color={cluster.color}
              emissive={cluster.color}
              emissiveIntensity={cluster.emissiveIntensity}
              roughness={0.55}
              transparent
              opacity={cluster.opacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

        {/* Inner glow layer for depth */}
        {blossoms
          .filter((_, i) => i % 3 === 0)
          .map((cluster, i) => (
            <mesh
              key={`g${i}`}
              position={[cluster.pos[0], cluster.pos[1] - 0.05, cluster.pos[2]]}
            >
              <icosahedronGeometry args={[cluster.size * 0.7, 0]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#ffd6e0"
                emissiveIntensity={0.12}
                roughness={0.3}
                transparent
                opacity={0.25}
              />
            </mesh>
          ))}
      </group>
    </group>
  )
}
