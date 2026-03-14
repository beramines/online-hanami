import { describe, it, expect } from 'vitest'
import { resolveCollisions, WORLD_COLLIDERS } from './colliders'

describe('resolveCollisions', () => {
  it('does not move a player that is far from all colliders', () => {
    const result = resolveCollisions(100, 100)
    expect(result).toEqual({ x: 100, z: 100 })
  })

  it('pushes a player out of a collider', () => {
    // Picnic set at (0, 0) with radius 1.3, player radius 0.3
    // Place player at center of picnic set
    const result = resolveCollisions(0.1, 0.1)
    const dist = Math.sqrt(result.x ** 2 + result.z ** 2)
    // Should be pushed out to at least minDist (1.3 + 0.3 = 1.6)
    expect(dist).toBeGreaterThanOrEqual(1.6 - 0.001)
  })

  it('preserves direction when pushing out', () => {
    // Place player slightly to the right of picnic set center
    const result = resolveCollisions(0.5, 0)
    // Should be pushed along +x direction
    expect(result.x).toBeGreaterThan(0)
    expect(result.z).toBeCloseTo(0, 5)
  })

  it('handles player exactly on collider edge (no push needed)', () => {
    // Picnic set: center (0,0), radius 1.3, player radius 0.3
    // minDist = 1.6, place player exactly at that distance along +x
    const result = resolveCollisions(1.6, 0)
    expect(result.x).toBeCloseTo(1.6, 5)
    expect(result.z).toBeCloseTo(0, 5)
  })

  it('handles multiple overlapping colliders', () => {
    // Find two colliders that are close together
    const bench1 = WORLD_COLLIDERS.find(c => c.x === -3 && c.z === -3)!
    // Place player between bench1 and picnic set
    const result = resolveCollisions(-1, -1)
    // Should end up outside both colliders
    const distToPicnic = Math.sqrt(result.x ** 2 + result.z ** 2)
    const distToBench = Math.sqrt((result.x - bench1.x) ** 2 + (result.z - bench1.z) ** 2)
    expect(distToPicnic).toBeGreaterThanOrEqual(1.6 - 0.01)
    expect(distToBench).toBeGreaterThanOrEqual(1.0 - 0.01)
  })
})

describe('WORLD_COLLIDERS', () => {
  it('has colliders defined', () => {
    expect(WORLD_COLLIDERS.length).toBeGreaterThan(0)
  })

  it('all colliders have positive radius', () => {
    for (const col of WORLD_COLLIDERS) {
      expect(col.radius).toBeGreaterThan(0)
    }
  })
})
