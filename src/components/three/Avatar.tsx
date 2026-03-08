import { useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { AvatarType } from '../../types'

interface AvatarProps {
  type: AvatarType
  position: [number, number, number]
  rotation?: number
  name?: string
  isSpeaking?: boolean
  hideNameTag?: boolean
}

const AVATAR_CONFIGS: Record<AvatarType, {
  bodyColor: string
  headColor: string
  bodyScale: [number, number, number]
  headScale: number
  headOffset: number
  emoji: string
  extraParts?: Array<{
    type: 'ears' | 'tail' | 'whiskers'
    color: string
  }>
}> = {
  male: {
    bodyColor: '#4a90d9',
    headColor: '#ffcc99',
    bodyScale: [0.35, 0.5, 0.25],
    headScale: 0.25,
    headOffset: 1.0,
    emoji: '👨',
  },
  female: {
    bodyColor: '#e85d7a',
    headColor: '#ffcc99',
    bodyScale: [0.3, 0.5, 0.25],
    headScale: 0.25,
    headOffset: 1.0,
    emoji: '👩',
  },
  dog: {
    bodyColor: '#d4a574',
    headColor: '#d4a574',
    bodyScale: [0.3, 0.3, 0.45],
    headScale: 0.22,
    headOffset: 0.65,
    emoji: '🐕',
  },
  cat: {
    bodyColor: '#ff9944',
    headColor: '#ff9944',
    bodyScale: [0.25, 0.25, 0.4],
    headScale: 0.2,
    headOffset: 0.55,
    emoji: '🐱',
  },
  seal: {
    bodyColor: '#8899aa',
    headColor: '#99aabb',
    bodyScale: [0.35, 0.25, 0.5],
    headScale: 0.25,
    headOffset: 0.5,
    emoji: '🦭',
  },
}

export function Avatar({ type, position, rotation = 0, name, isSpeaking, hideNameTag }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null)
  const config = AVATAR_CONFIGS[type]
  const isAnimal = type === 'dog' || type === 'cat' || type === 'seal'

  return (
    <group ref={groupRef} position={position} rotation={[0, rotation, 0]}>
      {/* Name tag */}
      {name && !hideNameTag && (
        <Html
          position={[0, isAnimal ? 1.2 : 1.6, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.9)',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#3a2a2a',
            whiteSpace: 'nowrap',
            border: isSpeaking ? '2px solid #4ade80' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: isSpeaking ? '0 0 10px rgba(74,222,128,0.5)' : 'none',
          }}>
            {config.emoji} {name}
          </div>
        </Html>
      )}

      {/* Speaking indicator */}
      {isSpeaking && (
        <mesh position={[0, isAnimal ? 1.0 : 1.4, 0]}>
          <ringGeometry args={[0.35, 0.4, 16]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Body */}
      <mesh position={[0, isAnimal ? 0.3 : 0.5, 0]} castShadow>
        <boxGeometry args={config.bodyScale} />
        <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, config.headOffset, isAnimal ? 0.15 : 0]} castShadow>
        <sphereGeometry args={[config.headScale, 12, 12]} />
        <meshStandardMaterial color={config.headColor} roughness={0.6} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.08, config.headOffset + 0.03, isAnimal ? 0.3 : 0.2]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#222222" />
      </mesh>
      <mesh position={[0.08, config.headOffset + 0.03, isAnimal ? 0.3 : 0.2]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#222222" />
      </mesh>

      {/* Human legs */}
      {!isAnimal && (
        <>
          <mesh position={[-0.1, 0.0, 0]} castShadow>
            <boxGeometry args={[0.12, 0.4, 0.12]} />
            <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
          </mesh>
          <mesh position={[0.1, 0.0, 0]} castShadow>
            <boxGeometry args={[0.12, 0.4, 0.12]} />
            <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Animal legs (4 legs) */}
      {isAnimal && type !== 'seal' && (
        <>
          <mesh position={[-0.12, 0.05, 0.12]} castShadow>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
          </mesh>
          <mesh position={[0.12, 0.05, 0.12]} castShadow>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
          </mesh>
          <mesh position={[-0.12, 0.05, -0.12]} castShadow>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
          </mesh>
          <mesh position={[0.12, 0.05, -0.12]} castShadow>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Cat ears */}
      {type === 'cat' && (
        <>
          <mesh position={[-0.12, config.headOffset + 0.2, 0.15]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.06, 0.15, 4]} />
            <meshStandardMaterial color="#ff8833" roughness={0.6} />
          </mesh>
          <mesh position={[0.12, config.headOffset + 0.2, 0.15]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.06, 0.15, 4]} />
            <meshStandardMaterial color="#ff8833" roughness={0.6} />
          </mesh>
        </>
      )}

      {/* Dog ears (floppy) */}
      {type === 'dog' && (
        <>
          <mesh position={[-0.18, config.headOffset + 0.05, 0.15]} rotation={[0, 0, -0.8]}>
            <boxGeometry args={[0.08, 0.15, 0.04]} />
            <meshStandardMaterial color="#b8885a" roughness={0.7} />
          </mesh>
          <mesh position={[0.18, config.headOffset + 0.05, 0.15]} rotation={[0, 0, 0.8]}>
            <boxGeometry args={[0.08, 0.15, 0.04]} />
            <meshStandardMaterial color="#b8885a" roughness={0.7} />
          </mesh>
        </>
      )}

      {/* Seal flippers */}
      {type === 'seal' && (
        <>
          <mesh position={[-0.25, 0.2, 0.1]} rotation={[0.3, 0, -0.8]}>
            <boxGeometry args={[0.2, 0.06, 0.1]} />
            <meshStandardMaterial color="#778899" roughness={0.6} />
          </mesh>
          <mesh position={[0.25, 0.2, 0.1]} rotation={[0.3, 0, 0.8]}>
            <boxGeometry args={[0.2, 0.06, 0.1]} />
            <meshStandardMaterial color="#778899" roughness={0.6} />
          </mesh>
          {/* Tail */}
          <mesh position={[0, 0.15, -0.35]} rotation={[0.5, 0, 0]}>
            <boxGeometry args={[0.2, 0.04, 0.15]} />
            <meshStandardMaterial color="#778899" roughness={0.6} />
          </mesh>
        </>
      )}

      {/* Shadow circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  )
}
