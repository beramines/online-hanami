import { create } from 'zustand'
import type { VoicePeer } from '../types'

interface VoiceState {
  isListening: boolean
  isMicEnabled: boolean
  localStream: MediaStream | null
  peers: Record<string, VoicePeer>

  setListening: (enabled: boolean) => void
  setMicEnabled: (enabled: boolean) => void
  setLocalStream: (stream: MediaStream | null) => void
  addPeer: (playerId: string, peer: VoicePeer) => void
  removePeer: (playerId: string) => void
  updatePeer: (playerId: string, update: Partial<VoicePeer>) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isListening: false,
  isMicEnabled: false,
  localStream: null,
  peers: {},

  setListening: (enabled) => set({ isListening: enabled }),
  setMicEnabled: (enabled) => set({ isMicEnabled: enabled }),
  setLocalStream: (stream) => set({ localStream: stream }),
  addPeer: (playerId, peer) =>
    set((state) => ({
      peers: { ...state.peers, [playerId]: peer },
    })),
  removePeer: (playerId) =>
    set((state) => {
      const { [playerId]: _, ...rest } = state.peers
      return { peers: rest }
    }),
  updatePeer: (playerId, update) =>
    set((state) => ({
      peers: {
        ...state.peers,
        [playerId]: { ...state.peers[playerId], ...update } as VoicePeer,
      },
    })),
}))
