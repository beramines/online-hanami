import { create } from 'zustand'

interface InputState {
  // Joystick values (-1 to 1)
  moveX: number
  moveY: number
  lookX: number
  lookY: number
  // Whether we're using touch
  isTouchActive: boolean

  setMove: (x: number, y: number) => void
  setLook: (x: number, y: number) => void
  setTouchActive: (active: boolean) => void
}

export const useInputStore = create<InputState>((set) => ({
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  isTouchActive: false,

  setMove: (x, y) => set({ moveX: x, moveY: y, isTouchActive: true }),
  setLook: (x, y) => set({ lookX: x, lookY: y, isTouchActive: true }),
  setTouchActive: (active) => set({ isTouchActive: active }),
}))
