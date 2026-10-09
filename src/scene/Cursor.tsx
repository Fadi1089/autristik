import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { isOccupied } from '../game/board'
import { canPlace } from '../game/matching'
import { useGameStore } from '../store/gameStore'
import { BASE_HEIGHT, coordToWorld, TILE_SIZE } from './layout'

/** Outer radius of a 4-segment ring that frames one square, corner to corner. */
const OUTER = (TILE_SIZE / 2) * Math.SQRT2
const INNER = OUTER - 0.09

/** Square outline marking the keyboard cursor: moss over an open square, clay elsewhere. */
export function Cursor() {
  const cursor = useGameStore((s) => s.cursor)
  const board = useGameStore((s) => s.board)
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.025)
  })

  if (!cursor) return null
  const [x, z] = coordToWorld(cursor)
  const open = canPlace(board, cursor)
  const y = isOccupied(board, cursor) ? BASE_HEIGHT + 0.22 : 0.01

  return (
    <mesh ref={ref} position={[x, y, z]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
      <ringGeometry args={[INNER, OUTER, 4, 1]} />
      <meshBasicMaterial color={open ? '#5f8f43' : '#c4643c'} depthTest={false} transparent />
    </mesh>
  )
}
