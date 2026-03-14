import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

describe('gameStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useGameStore.setState({
      playerId: null,
      playerName: '',
      avatar: 'male',
      players: {},
      roomId: null,
      roomName: '',
      isConnected: false,
      broadcastPosition: null,
    })
  })

  it('sets player name', () => {
    useGameStore.getState().setPlayerName('Alice')
    expect(useGameStore.getState().playerName).toBe('Alice')
  })

  it('sets avatar', () => {
    useGameStore.getState().setAvatar('cat')
    expect(useGameStore.getState().avatar).toBe('cat')
  })

  it('updates a player', () => {
    useGameStore.getState().updatePlayer('p1', {
      name: 'Bob',
      avatar: 'dog',
      position: [1, 0, 2],
      rotation: 0,
    })
    const player = useGameStore.getState().players['p1']
    expect(player.name).toBe('Bob')
    expect(player.avatar).toBe('dog')
  })

  it('removes a player', () => {
    useGameStore.getState().updatePlayer('p1', {
      name: 'Bob',
      avatar: 'dog',
      position: [0, 0, 0],
      rotation: 0,
    })
    useGameStore.getState().removePlayer('p1')
    expect(useGameStore.getState().players['p1']).toBeUndefined()
  })

  it('clears room state', () => {
    useGameStore.getState().setRoomId('room-1')
    useGameStore.getState().setRoomName('Test Room')
    useGameStore.getState().setConnected(true)
    useGameStore.getState().clearRoom()

    const state = useGameStore.getState()
    expect(state.roomId).toBeNull()
    expect(state.roomName).toBe('')
    expect(state.isConnected).toBe(false)
    expect(state.players).toEqual({})
  })
})
