import { create } from 'zustand'

type CameraMode = 'third' | 'first'

interface CameraState {
  mode: CameraMode
  toggleMode: () => void
}

export const useCameraStore = create<CameraState>((set) => ({
  mode: 'third',
  toggleMode: () =>
    set((s) => ({ mode: s.mode === 'third' ? 'first' : 'third' })),
}))
