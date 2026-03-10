import { create } from 'zustand'
import type { Player, AvatarType } from '../types'

type BroadcastPositionFn = (position: [number, number, number], rotation: number) => void

interface GameState {
  playerId: string | null
  playerName: string
  avatar: AvatarType
  players: Record<string, Player>
  roomId: string | null
  roomName: string
  isConnected: boolean
  broadcastPosition: BroadcastPositionFn | null

  setPlayerId: (id: string) => void
  setPlayerName: (name: string) => void
  setAvatar: (avatar: AvatarType) => void
  setRoomId: (roomId: string) => void
  setRoomName: (roomName: string) => void
  setConnected: (connected: boolean) => void
  updatePlayer: (id: string, player: Partial<Player>) => void
  removePlayer: (id: string) => void
  setPlayers: (players: Record<string, Player>) => void
  setBroadcastPosition: (fn: BroadcastPositionFn | null) => void
  clearRoom: () => void
}

export const useGameStore = create<GameState>((set) => ({
  playerId: null,
  playerName: '',
  avatar: 'male',
  players: {},
  roomId: null,
  roomName: '',
  isConnected: false,
  broadcastPosition: null,

  setPlayerId: (id) => set({ playerId: id }),
  setPlayerName: (name) => set({ playerName: name }),
  setAvatar: (avatar) => set({ avatar }),
  setRoomId: (roomId) => set({ roomId }),
  setRoomName: (roomName) => set({ roomName }),
  setConnected: (connected) => set({ isConnected: connected }),
  updatePlayer: (id, player) =>
    set((state) => ({
      players: {
        ...state.players,
        [id]: { ...state.players[id], ...player } as Player,
      },
    })),
  removePlayer: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.players
      return { players: rest }
    }),
  setPlayers: (players) => set({ players }),
  setBroadcastPosition: (fn) => set({ broadcastPosition: fn }),
  clearRoom: () => set({ roomId: null, roomName: '', players: {}, isConnected: false, broadcastPosition: null }),
}))
