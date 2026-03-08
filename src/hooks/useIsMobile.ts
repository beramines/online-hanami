import { useState, useEffect } from 'react'

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0
  )

  useEffect(() => {
    const check = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return isMobile
}
