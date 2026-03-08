import { useEffect, useRef } from 'react'
import { useCameraStore } from '../stores/cameraStore'

interface KeyState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  strafeLeft: boolean
  strafeRight: boolean
}

const KEY_MAP: Record<string, keyof KeyState> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyA: 'strafeLeft',
  KeyD: 'strafeRight',
}

export function useKeyboard(): KeyState {
  const keys = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    strafeLeft: false,
    strafeRight: false,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const action = KEY_MAP[e.code]
      if (action) {
        keys.current[action] = true
        e.preventDefault()
      }
      if (e.code === 'KeyV') {
        useCameraStore.getState().toggleMode()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code]
      if (action) {
        keys.current[action] = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return keys.current
}
