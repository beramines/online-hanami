import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

interface SakuraTreeProps {
  position?: [number, number, number]
  scale?: number
}

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

interface BlossomPoint {
  pos: [number, number, number]
  normal: [number, number, number]
  radius: number
}

const pinkPalette = [
  new THREE.Color('#ffb7c5'),
  new THREE.Color('#ffc0cb'),
  new THREE.Color('#ffaabb'),
  new THREE.Color('#ffd1dc'),
  new THREE.Color('#ffcad4'),
  new THREE.Color('#f8a4b8'),
  new THREE.Color('#fbb5c0'),
  new THREE.Color('#f9c0cc'),
  new THREE.Color('#ffe8ee'),
  new THREE.Color('#ffffff'),
]

// Single sakura petal — sized to be recognizable at close range
function createPetalShape(): THREE.Shape {
  const shape = new THREE.Shape()
  const w = 0.045
  const h = 0.07

  shape.moveTo(0, 0)
  shape.bezierCurveTo(w * 1.5, h * 0.3, w * 1.3, h * 0.75, w * 0.65, h * 0.93)
  // Deep V-notch at tip — characteristic sakura feature
  shape.bezierCurveTo(w * 0.25, h * 1.1, w * 0.06, h * 0.88, 0, h * 0.72)
  shape.bezierCurveTo(-w * 0.06, h * 0.88, -w * 0.25, h * 1.1, -w * 0.65, h * 0.93)
  shape.bezierCurveTo(-w * 1.3, h * 0.75, -w * 1.5, h * 0.3, 0, 0)

  return shape
}

// Add vertex colors to a geometry (all vertices same color)
function setVertexColors(geo: THREE.BufferGeometry, color: THREE.Color) {
  const count = geo.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

// 5 petals radially arranged + visible yellow center = one sakura flower
function createFlowerGeometry(): THREE.BufferGeometry {
  const petalShape = createPetalShape()
  const petals: THREE.BufferGeometry[] = []
  const petalColor = new THREE.Color('#ffeef2') // light pink — will be tinted by instanceColor
  const centerColor = new THREE.Color('#f5e06b') // yellow pistil

  for (let i = 0; i < 5; i++) {
    const geo = new THREE.ShapeGeometry(petalShape, 3)
    const angle = (i / 5) * Math.PI * 2

    const mat = new THREE.Matrix4()
    // Wider tilt (~45deg) so petals open more, gaps between them are visible
    const tilt = new THREE.Matrix4().makeRotationX(-0.78)
    const rot = new THREE.Matrix4().makeRotationY(angle)
    mat.multiply(rot).multiply(tilt)
    geo.applyMatrix4(mat)

    setVertexColors(geo, petalColor)
    petals.push(geo)
  }

  // Larger yellow center so it's visible and helps identify each flower
  const centerGeo = new THREE.CircleGeometry(0.012, 6)
  centerGeo.rotateX(-Math.PI / 2)
  centerGeo.translate(0, 0.003, 0)
  setVertexColors(centerGeo, centerColor)
  petals.push(centerGeo)

  const merged = mergeGeometries(petals, false)!
  for (const g of petals) g.dispose()
  return merged
}

let _flowerGeo: THREE.BufferGeometry | null = null
function getFlowerGeometry() {
  if (!_flowerGeo) _flowerGeo = createFlowerGeometry()
  return _flowerGeo
}

function generateTree(seed: number, flowerCount: number) {
  const rand = seededRandom(seed)
  const branches: Branch[] = []
  const blossomPoints: BlossomPoint[] = []

  const trunkHeight = 2.0 + rand() * 0.5
  branches.push({
    start: [0, 0, 0],
    end: [0, trunkHeight, 0],
    radiusStart: 0.16,
    radiusEnd: 0.1,
  })

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

    branches.push({ start: origin, end, radiusStart: radius, radiusEnd: radius * 0.65 })

    // Flowers only on thin outer branches (depth >= 3)
    if (depth >= 3) {
      const segments = depth >= 4 ? 6 : 4
      for (let s = 0; s < segments; s++) {
        const t = 0.2 + (s / segments) * 0.8

        // Perpendicular direction for outward-facing normal
        const perp = new THREE.Vector3(-direction.z, 0, direction.x)
        if (perp.lengthSq() < 0.001) perp.set(1, 0, 0)
        perp.normalize()
        // Rotate around branch for variety
        perp.applyAxisAngle(direction, rand() * Math.PI * 2)
        // Upward bias — flowers face up/outward
        perp.y += 0.5
        perp.normalize()

        blossomPoints.push({
          pos: [
            origin[0] + direction.x * length * t,
            origin[1] + direction.y * length * t,
            origin[2] + direction.z * length * t,
          ],
          normal: [perp.x, perp.y, perp.z],
          // Scatter around branch — wide enough so flowers don't pile up
          radius: depth >= 4 ? 0.07 + rand() * 0.05 : 0.10 + rand() * 0.06,
        })
      }
    }

    // depth 2: only a few flowers near the tip (transition zone)
    if (depth === 2) {
      for (let s = 0; s < 2; s++) {
        const t = 0.7 + s * 0.15
        const perp = new THREE.Vector3(-direction.z, 0, direction.x)
        if (perp.lengthSq() < 0.001) perp.set(1, 0, 0)
        perp.normalize()
        perp.applyAxisAngle(direction, rand() * Math.PI * 2)
        perp.y += 0.5
        perp.normalize()

        blossomPoints.push({
          pos: [
            origin[0] + direction.x * length * t,
            origin[1] + direction.y * length * t,
            origin[2] + direction.z * length * t,
          ],
          normal: [perp.x, perp.y, perp.z],
          radius: 0.06 + rand() * 0.04,
        })
      }
    }

    const childCount = depth === 0 ? 3 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2)
    for (let i = 0; i < childCount; i++) {
      const spreadAngle = depth === 0 ? 0.4 + rand() * 0.5 : 0.3 + rand() * 0.6
      const rotAngle = (i / childCount) * Math.PI * 2 + (rand() - 0.5) * 0.8

      const newDir = direction.clone()
      const tiltAxis = new THREE.Vector3(Math.cos(rotAngle), 0, Math.sin(rotAngle)).normalize()
      newDir.applyAxisAngle(tiltAxis, spreadAngle)
      if (depth >= 2) newDir.y -= 0.15 + rand() * 0.15
      newDir.normalize()

      addBranch(end, newDir, length * (0.55 + rand() * 0.25), radius * (0.5 + rand() * 0.2), depth + 1)
    }
  }

  // More main branches for denser canopy
  const mainBranchCount = 5 + Math.floor(rand() * 2)
  for (let i = 0; i < mainBranchCount; i++) {
    const angle = (i / mainBranchCount) * Math.PI * 2 + (rand() - 0.5) * 0.4
    const upTilt = 0.5 + rand() * 0.4
    const dir = new THREE.Vector3(
      Math.cos(angle) * (1 - upTilt),
      upTilt,
      Math.sin(angle) * (1 - upTilt),
    ).normalize()
    addBranch([0, trunkHeight, 0], dir, 1.0 + rand() * 0.5, 0.06 + rand() * 0.03, 1)
  }

  const flowerData = generateFlowers(rand, blossomPoints, flowerCount)
  return { branches, flowerData }
}

interface FlowerData {
  matrices: Float32Array
  colors: Float32Array
  count: number
}

function generateFlowers(
  rand: () => number,
  points: BlossomPoint[],
  totalFlowers: number,
): FlowerData {
  const matrices = new Float32Array(totalFlowers * 16)
  const colors = new Float32Array(totalFlowers * 3)

  const tmpMatrix = new THREE.Matrix4()
  const tmpPos = new THREE.Vector3()
  const tmpQuat = new THREE.Quaternion()
  const tmpScale = new THREE.Vector3()
  const tmpColor = new THREE.Color()
  const tmpUp = new THREE.Vector3(0, 1, 0)
  const tmpNormal = new THREE.Vector3()

  const totalWeight = points.reduce((sum, p) => sum + p.radius * p.radius, 0)
  let idx = 0

  for (const point of points) {
    const weight = (point.radius * point.radius) / totalWeight
    const count = Math.max(2, Math.round(totalFlowers * weight))

    for (let i = 0; i < count && idx < totalFlowers; i++) {
      // Scatter tightly around branch point
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(1 - 2 * rand())
      const r = point.radius * Math.cbrt(rand())
      const ox = r * Math.sin(phi) * Math.cos(theta)
      const oy = r * Math.sin(phi) * Math.sin(theta) * 0.5
      const oz = r * Math.cos(phi)

      tmpPos.set(point.pos[0] + ox, point.pos[1] + oy, point.pos[2] + oz)

      // Face outward from branch with small variation
      tmpNormal.set(point.normal[0], point.normal[1], point.normal[2])
      tmpNormal.x += (rand() - 0.5) * 0.2
      tmpNormal.y += (rand() - 0.5) * 0.15
      tmpNormal.z += (rand() - 0.5) * 0.2
      tmpNormal.normalize()

      // Orient flower: Y-up → facing normal direction
      tmpQuat.setFromUnitVectors(tmpUp, tmpNormal)
      // Spin around own normal so petals aren't all aligned
      const spinQuat = new THREE.Quaternion().setFromAxisAngle(tmpNormal, rand() * Math.PI * 2)
      tmpQuat.premultiply(spinQuat)

      const s = 0.8 + rand() * 0.5
      tmpScale.set(s, s, s)

      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale)
      tmpMatrix.toArray(matrices, idx * 16)

      const col = pinkPalette[Math.floor(rand() * pinkPalette.length)]
      tmpColor.copy(col)
      tmpColor.offsetHSL(0, (rand() - 0.5) * 0.06, (rand() - 0.5) * 0.08)
      colors[idx * 3] = tmpColor.r
      colors[idx * 3 + 1] = tmpColor.g
      colors[idx * 3 + 2] = tmpColor.b

      idx++
    }
  }

  return { matrices, colors, count: idx }
}

const FLOWER_COUNT = 10000

export function SakuraTree({ position = [0, 0, 0], scale = 1 }: SakuraTreeProps) {
  const windRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const seed = Math.abs(position[0] * 1000 + position[2] * 7 + scale * 13) + 1
  const { branches, flowerData } = useMemo(() => generateTree(seed, FLOWER_COUNT), [seed])

  const initialized = useRef(false)

  useFrame((state) => {
    const mesh = meshRef.current
    if (mesh && !initialized.current) {
      const dummy = new THREE.Matrix4()
      for (let i = 0; i < flowerData.count; i++) {
        dummy.fromArray(flowerData.matrices, i * 16)
        mesh.setMatrixAt(i, dummy)
      }
      mesh.instanceMatrix.needsUpdate = true

      if (mesh.instanceColor) {
        const c = new THREE.Color()
        for (let i = 0; i < flowerData.count; i++) {
          c.setRGB(
            flowerData.colors[i * 3],
            flowerData.colors[i * 3 + 1],
            flowerData.colors[i * 3 + 2],
          )
          mesh.setColorAt(i, c)
        }
        mesh.instanceColor.needsUpdate = true
      }
      initialized.current = true
    }

    if (windRef.current) {
      const t = state.clock.elapsedTime
      const s = seed % 10
      windRef.current.rotation.z = Math.sin(t * 0.5 + s) * 0.015
      windRef.current.rotation.x = Math.sin(t * 0.3 + s * 2) * 0.01
    }
  })

  const flowerGeo = getFlowerGeometry()

  return (
    <group position={position} scale={scale}>
      <group ref={windRef}>
        {branches.map((branch, i) => {
          const sx = branch.start[0], sy = branch.start[1], sz = branch.start[2]
          const ex = branch.end[0], ey = branch.end[1], ez = branch.end[2]
          const dx = ex - sx, dy = ey - sy, dz = ez - sz
          const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (length < 0.01) return null

          const dir = new THREE.Vector3(dx, dy, dz).normalize()
          const up = new THREE.Vector3(0, 1, 0)
          const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
          const euler = new THREE.Euler().setFromQuaternion(quat)

          return (
            <mesh
              key={`b${i}`}
              position={[(sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2]}
              rotation={euler}
            >
              <cylinderGeometry args={[branch.radiusEnd, branch.radiusStart, length, 6]} />
              <meshStandardMaterial color={i === 0 ? '#6b4226' : '#7a5230'} roughness={0.92} />
            </mesh>
          )
        })}

        <instancedMesh
          ref={meshRef}
          args={[flowerGeo, undefined, flowerData.count]}
        >
          <meshStandardMaterial
            vertexColors
            emissive="#ffc0cb"
            emissiveIntensity={0.35}
            roughness={0.3}
            transparent
            opacity={0.93}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </instancedMesh>
      </group>
    </group>
  )
}
