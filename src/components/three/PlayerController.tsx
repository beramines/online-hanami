import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Avatar } from './Avatar'
import { useGameStore } from '../../stores/gameStore'
import { useInputStore } from '../../stores/inputStore'
import { useCameraStore } from '../../stores/cameraStore'
import { useKeyboard } from '../../hooks/useKeyboard'
import { resolveCollisions } from '../../lib/colliders'

const MOVE_SPEED = 4
const ROTATION_SPEED = 2.5
const WORLD_BOUNDS = 35
const AVATAR_ROTATION_SPEED = 8 // How fast avatar turns to face movement direction

export function PlayerController() {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const avatarGroupRef = useRef<THREE.Group>(null)
  const positionRef = useRef(new THREE.Vector3(0, 0, 5))
  const cameraYawRef = useRef(0) // Camera/player facing direction
  const avatarYawRef = useRef(0) // Avatar's visual facing direction
  const keys = useKeyboard()
  const avatar = useGameStore((s) => s.avatar)
  const playerId = useGameStore((s) => s.playerId)
  const playerName = useGameStore((s) => s.playerName)
  const updatePlayer = useGameStore((s) => s.updatePlayer)

  useFrame((_, delta) => {
    const cameraMode = useCameraStore.getState().mode
    const moveDir = new THREE.Vector3()
    let rotDelta = 0

    // Keyboard input
    if (keys.forward) moveDir.z -= 1
    if (keys.backward) moveDir.z += 1
    if (keys.left) rotDelta += 1
    if (keys.right) rotDelta -= 1
    if (keys.strafeLeft) moveDir.x -= 1
    if (keys.strafeRight) moveDir.x += 1

    // Touch joystick input
    const { moveX, moveY, lookX } = useInputStore.getState()
    if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
      moveDir.x += moveX
      moveDir.z += moveY
    }
    if (Math.abs(lookX) > 0.1) {
      rotDelta -= lookX
    }

    // Apply camera rotation
    cameraYawRef.current += rotDelta * ROTATION_SPEED * delta

    // Apply movement in camera's forward direction
    const isMoving = moveDir.length() > 0
    if (isMoving) {
      moveDir.normalize()
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYawRef.current)
      positionRef.current.addScaledVector(moveDir, MOVE_SPEED * delta)

      // Clamp to world bounds
      positionRef.current.x = THREE.MathUtils.clamp(positionRef.current.x, -WORLD_BOUNDS, WORLD_BOUNDS)
      positionRef.current.z = THREE.MathUtils.clamp(positionRef.current.z, -WORLD_BOUNDS, WORLD_BOUNDS)

      // Resolve collisions with world objects
      const resolved = resolveCollisions(positionRef.current.x, positionRef.current.z)
      positionRef.current.x = resolved.x
      positionRef.current.z = resolved.z

      // Calculate target avatar yaw from movement direction
      const targetYaw = Math.atan2(moveDir.x, moveDir.z)
      // Smoothly interpolate avatar rotation toward movement direction
      let yawDiff = targetYaw - avatarYawRef.current
      // Normalize angle difference to [-PI, PI]
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
      avatarYawRef.current += yawDiff * Math.min(1, AVATAR_ROTATION_SPEED * delta)
    }

    // Update group position
    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current)
    }

    // Update avatar visual rotation (faces movement direction)
    if (avatarGroupRef.current) {
      avatarGroupRef.current.rotation.y = avatarYawRef.current
    }

    // Camera behavior based on mode
    if (cameraMode === 'first') {
      // First person: camera at eye level, looking in camera yaw direction
      const eyeHeight = 1.3
      camera.position.set(
        positionRef.current.x,
        positionRef.current.y + eyeHeight,
        positionRef.current.z
      )
      const lookTarget = new THREE.Vector3(
        positionRef.current.x - Math.sin(cameraYawRef.current),
        positionRef.current.y + eyeHeight,
        positionRef.current.z - Math.cos(cameraYawRef.current)
      )
      camera.lookAt(lookTarget)
    } else {
      // Third person: camera behind and above player
      const cameraOffset = new THREE.Vector3(0, 4, 7)
      cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYawRef.current)
      const targetCamPos = positionRef.current.clone().add(cameraOffset)
      camera.position.lerp(targetCamPos, 0.08)
      camera.lookAt(
        positionRef.current.x,
        positionRef.current.y + 1.2,
        positionRef.current.z
      )
    }

    // Sync position to store and broadcast
    if (playerId) {
      const pos: [number, number, number] = [positionRef.current.x, positionRef.current.y, positionRef.current.z]
      updatePlayer(playerId, {
        position: pos,
        rotation: avatarYawRef.current,
      })
      const broadcast = useGameStore.getState().broadcastPosition
      if (broadcast) {
        broadcast(pos, avatarYawRef.current)
      }
    }
  })

  const cameraMode = useCameraStore((s) => s.mode)

  return (
    <group ref={groupRef} position={[0, 0, 5]}>
      {/* Hide avatar in first-person mode */}
      <group ref={avatarGroupRef} visible={cameraMode !== 'first'}>
        <Avatar
          type={avatar}
          position={[0, 0, 0]}
          rotation={0}
          name={playerName}
          hideNameTag={cameraMode === 'first'}
        />
      </group>
    </group>
  )
}
