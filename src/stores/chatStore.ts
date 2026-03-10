import { create } from 'zustand'
import type { ChatMessage } from '../types'

interface ChatState {
  messages: ChatMessage[]
  isOpen: boolean

  addMessage: (message: ChatMessage) => void
  setOpen: (open: boolean) => void
  toggleOpen: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isOpen: !('ontouchstart' in globalThis),

  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state
      return { messages: [...state.messages.slice(-99), message] }
    }),
  setOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
}))
