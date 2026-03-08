import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function createPetalGeometry(): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  // Sakura petal shape - teardrop with notch
  shape.moveTo(0, 0)
  shape.bezierCurveTo(0.3, 0.2, 0.4, 0.6, 0.15, 0.9)
  shape.bezierCurveTo(0.05, 0.75, 0, 0.7, 0, 0.65)
  shape.bezierCurveTo(0, 0.7, -0.05, 0.75, -0.15, 0.9)
  shape.bezierCurveTo(-0.4, 0.6, -0.3, 0.2, 0, 0)

  const geo = new THREE.ShapeGeometry(shape, 4)
  geo.center()
  return geo
}

interface SakuraPetalsProps {
  count?: number
}

export function SakuraPetals({ count = 500 }: SakuraPetalsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const petalGeometry = useMemo(() => createPetalGeometry(), [])

  const { offsets, speeds, phases, swayAmplitudes } = useMemo(() => {
    const offsets = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const phases = new Float32Array(count)
    const swayAmplitudes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      offsets[i * 3] = (Math.random() - 0.5) * 50
      offsets[i * 3 + 1] = Math.random() * 15 + 2
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 50
      speeds[i] = 0.2 + Math.random() * 0.4
      phases[i] = Math.random() * Math.PI * 2
      swayAmplitudes[i] = 0.5 + Math.random() * 2.0
    }
    return { offsets, speeds, phases, swayAmplitudes }
  }, [count])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  const colors = useMemo(() => {
    const palette = ['#ffb7c5', '#ffc0cb', '#ffaabb', '#ffd1dc', '#ffe0e8', '#ffffff']
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      color.set(palette[Math.floor(Math.random() * palette.length)])
      arr[i * 3] = color.r
      arr[i * 3 + 1] = color.g
      arr[i * 3 + 2] = color.b
    }
    return arr
  }, [count, color])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const x = offsets[i * 3]
      const baseY = offsets[i * 3 + 1]
      const z = offsets[i * 3 + 2]
      const speed = speeds[i]
      const phase = phases[i]
      const sway = swayAmplitudes[i]

      // Gentle falling with swaying
      const y = ((baseY - speed * t * 0.25) % 15 + 15) % 15
      const swayX = Math.sin(t * 0.4 + phase) * sway
      const swayZ = Math.cos(t * 0.25 + phase * 1.5) * sway * 0.7

      dummy.position.set(x + swayX, y, z + swayZ)
      // Tumbling rotation
      dummy.rotation.set(
        t * 0.6 + phase,
        t * 0.4 + phase * 0.7,
        Math.sin(t * 0.3 + phase) * 0.5 + phase * 1.3
      )
      const baseScale = 0.12 + Math.sin(phase) * 0.04
      dummy.scale.setScalar(baseScale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[petalGeometry, undefined, count]}>
      <meshStandardMaterial
        color="#ffb7c5"
        emissive="#ff85a1"
        emissiveIntensity={0.1}
        side={THREE.DoubleSide}
        transparent
        opacity={0.9}
        roughness={0.6}
      />
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  )
}
