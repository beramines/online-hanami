import { create } from 'zustand'
import type { VoicePeer } from '../types'

interface VoiceState {
  isVoiceEnabled: boolean
  isMuted: boolean
  localStream: MediaStream | null
  peers: Record<string, VoicePeer>

  setVoiceEnabled: (enabled: boolean) => void
  setMuted: (muted: boolean) => void
  setLocalStream: (stream: MediaStream | null) => void
  addPeer: (playerId: string, peer: VoicePeer) => void
  removePeer: (playerId: string) => void
  updatePeer: (playerId: string, update: Partial<VoicePeer>) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  isVoiceEnabled: false,
  isMuted: false,
  localStream: null,
  peers: {},

  setVoiceEnabled: (enabled) => set({ isVoiceEnabled: enabled }),
  setMuted: (muted) => set({ isMuted: muted }),
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
