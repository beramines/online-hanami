// Simple circular colliders for world objects
// Each collider is defined as { x, z, radius }

export interface CircleCollider {
  x: number
  z: number
  radius: number
}

// Build the collision list from Scene.tsx object placements
export const WORLD_COLLIDERS: CircleCollider[] = [
  // Sakura trees (trunk collision)
  { x: -6, z: -6, radius: 0.6 },
  { x: 7, z: -7, radius: 0.6 },
  { x: -5, z: 7, radius: 0.6 },
  { x: 9, z: 4, radius: 0.6 },
  { x: -10, z: -12, radius: 0.6 },
  { x: 2, z: -12, radius: 0.6 },
  { x: 14, z: -4, radius: 0.6 },
  { x: -13, z: 3, radius: 0.6 },
  { x: 5, z: 12, radius: 0.6 },
  { x: -8, z: 14, radius: 0.6 },

  // Torii pillars
  { x: -1.0, z: 12, radius: 0.2 },
  { x: 1.0, z: 12, radius: 0.2 },

  // Picnic set (blanket area)
  { x: 0, z: 0, radius: 1.3 },

  // Pond
  { x: 12, z: -10, radius: 2.7 },

  // Benches (approximate as circles)
  { x: -3, z: -3, radius: 0.7 },
  { x: 4, z: -2, radius: 0.7 },
  { x: -2, z: 4, radius: 0.7 },

  // Lanterns (thin poles)
  { x: 1.2, z: 6, radius: 0.2 },
  { x: -1.2, z: 9, radius: 0.2 },
  { x: 1.2, z: 15, radius: 0.2 },

  // Stone lanterns
  { x: -4, z: -1, radius: 0.3 },
  { x: 6, z: 1, radius: 0.3 },
  { x: 10, z: -7, radius: 0.3 },
]

const PLAYER_RADIUS = 0.3

/**
 * Resolves collisions by pushing the player position out of any overlapping colliders.
 * Mutates the position values and returns them.
 */
export function resolveCollisions(x: number, z: number): { x: number; z: number } {
  for (const col of WORLD_COLLIDERS) {
    const dx = x - col.x
    const dz = z - col.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const minDist = col.radius + PLAYER_RADIUS

    if (dist < minDist && dist > 0.001) {
      // Push player out along the collision normal
      const nx = dx / dist
      const nz = dz / dist
      x = col.x + nx * minDist
      z = col.z + nz * minDist
    }
  }

  return { x, z }
}
