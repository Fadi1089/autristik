import { useEffect, useState } from 'react'
import { DROP_SECONDS } from './Board'

/**
 * `value`, held back while a piece just placed is still easing down, so what it brings (a road,
 * a city's houses) appears as it lands rather than floating where it will be. Anything else,
 * such as loading a game or resetting the grid, comes through at once.
 */
export function useAfterDrop<T>(value: T, dropping: boolean): T {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setShown(value), dropping ? DROP_SECONDS * 1000 : 0)
    return () => clearTimeout(id)
  }, [value, dropping])
  return shown
}
