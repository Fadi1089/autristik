import { boardTiles, isOccupied } from './board'
import type { Board } from './board'
import { Direction, directionOffset, neighbour, oppositeDirection } from './coords'
import type { Coord } from './coords'
import { createGame, isGameOver, placeCurrent } from './game'
import type { GameState } from './game'

export const FALL_DISTANCE = 10
export const FALL_INTERVAL = 1.5

export interface FallingGameState extends GameState {
  readonly falling: Coord | null
  /** World direction towards the stack, independent of camera orientation. */
  readonly fallDirection: Direction
  readonly fallElapsed: number
}

/** The axis perpendicular to gravity is the only axis for lateral movement. */
export function laneAxis(direction: Direction): 'q' | 'r' {
  return direction === Direction.North || direction === Direction.South ? 'q' : 'r'
}

export function fallingColumns(board: Board, direction: Direction = Direction.South): number[] {
  const axis = laneAxis(direction)
  return [...new Set(boardTiles(board).map((tile) => tile.coord[axis]))].sort((a, b) => a - b)
}

/** Position outside the entire lane's silhouette, at a fixed distance from its first tile. */
function positionAboveLane(
  board: Board,
  direction: Direction,
  lane: number,
  distance: number,
): Coord | null {
  const axis = laneAxis(direction)
  const forward = axis === 'q' ? 'r' : 'q'
  const sign = directionOffset(direction)[forward]
  const positions = boardTiles(board)
    .filter((tile) => tile.coord[axis] === lane)
    .map((tile) => tile.coord[forward])
  if (positions.length === 0) return null
  const edge = sign > 0 ? Math.min(...positions) : Math.max(...positions)
  const start = edge - sign * distance
  return axis === 'q' ? { q: lane, r: start } : { q: start, r: lane }
}

export function spawnFalling(
  board: Board,
  direction: Direction = Direction.South,
  preferredLane?: number,
): Coord {
  const columns = fallingColumns(board, direction)
  const lane =
    preferredLane !== undefined && columns.includes(preferredLane)
      ? preferredLane
      : (columns[Math.floor(columns.length / 2)] ?? 0)
  return positionAboveLane(board, direction, lane, FALL_DISTANCE) ?? { q: 0, r: 0 }
}

export function createFallingGame(seed: number, tiles?: number): FallingGameState {
  const game = createGame(seed, tiles)
  return {
    ...game,
    falling: isGameOver(game) ? null : spawnFalling(game.board),
    fallDirection: Direction.South,
    fallElapsed: 0,
  }
}

/** First reachable landing square in the chosen lane; never passes through a tile. */
export function landingPosition(
  state: Pick<FallingGameState, 'board' | 'falling' | 'fallDirection' | 'current'>,
): Coord | null {
  if (!state.falling || isGameOver(state)) return null
  const axis = laneAxis(state.fallDirection)
  const forward = axis === 'q' ? 'r' : 'q'
  const delta = directionOffset(state.fallDirection)
  const distances = boardTiles(state.board)
    .filter((tile) => tile.coord[axis] === state.falling![axis])
    .map((tile) => (tile.coord[forward] - state.falling![forward]) * delta[forward])
    .filter((distance) => distance > 0)
  if (distances.length === 0) return null
  const steps = Math.min(...distances) - 1
  return { q: state.falling.q + delta.q * steps, r: state.falling.r + delta.r * steps }
}

/** Round a corner when the lateral destination has no obstacle in the current fall direction.
 * Keep the remaining distance and cadence instead of restarting the fall.
 */
function turnAtEdge(state: FallingGameState, outward: Direction): FallingGameState {
  const target = landingPosition(state)
  if (!target || !state.falling) return state
  const anchor = neighbour(target, state.fallDirection)
  const direction = oppositeDirection(outward)
  const axis = laneAxis(direction)
  const distance = Math.abs(anchor.q - state.falling.q) + Math.abs(anchor.r - state.falling.r)
  const falling = positionAboveLane(state.board, direction, anchor[axis], distance)
  return { ...state, falling, fallDirection: direction }
}

/** Follow the lane's relief without adding fall time; empty lanes turn around the board's edge. */
export function moveFalling(state: FallingGameState, lane: number): FallingGameState {
  if (!state.falling || isGameOver(state) || !Number.isInteger(lane)) return state
  const target = landingPosition(state)
  if (!target) return state
  const distance = Math.abs(target.q - state.falling.q) + Math.abs(target.r - state.falling.r) + 1
  const axis = laneAxis(state.fallDirection)
  const step = Math.sign(lane - state.falling[axis])
  const outward =
    axis === 'q'
      ? step > 0
        ? Direction.East
        : Direction.West
      : step > 0
        ? Direction.South
        : Direction.North
  let next = state
  while (next.falling![axis] !== lane) {
    const value = next.falling![axis] + step
    const falling = positionAboveLane(state.board, state.fallDirection, value, distance)
    if (!falling) return turnAtEdge(next, outward)
    next = { ...next, falling }
  }
  return next
}

export function changeFallDirection(
  state: FallingGameState,
  direction: Direction,
): FallingGameState {
  if (isGameOver(state) || direction === state.fallDirection) return state
  const target = landingPosition(state)
  if (!target || !state.falling) return state
  const distance = Math.abs(target.q - state.falling.q) + Math.abs(target.r - state.falling.r) + 1
  const anchor = neighbour(target, state.fallDirection)
  const axis = laneAxis(direction)
  // Turn around the projected placement, not the occupied tile it was aimed at.
  // If that row/column has no obstacle, use the adjacent supported lane.
  const falling =
    positionAboveLane(state.board, direction, target[axis], distance) ??
    positionAboveLane(state.board, direction, anchor[axis], distance)
  return {
    ...state,
    fallDirection: direction,
    falling,
  }
}

function lockFalling(state: FallingGameState, position: Coord): FallingGameState {
  const placed = placeCurrent(state, position)
  if (placed === state) return state
  return {
    ...state,
    ...placed,
    falling: isGameOver(placed)
      ? null
      : spawnFalling(placed.board, state.fallDirection, position[laneAxis(state.fallDirection)]),
    fallElapsed: 0,
  }
}

/** One step on demand or on the gravity clock; no time is consumed by manual input. */
export function advanceFalling(state: FallingGameState): FallingGameState {
  if (!state.falling || isGameOver(state)) return state
  const next = neighbour(state.falling, state.fallDirection)
  return isOccupied(state.board, next)
    ? lockFalling(state, state.falling)
    : { ...state, falling: next, fallElapsed: 0 }
}

export function hardDrop(state: FallingGameState): FallingGameState {
  const target = landingPosition(state)
  return target ? lockFalling(state, target) : state
}

/** A screen-relative key is interpreted only after mapping it to the world grid. */
export function moveInDirection(state: FallingGameState, direction: Direction): FallingGameState {
  if (!state.falling || isGameOver(state)) return state
  if (direction === state.fallDirection) return advanceFalling(state)
  if (direction === oppositeDirection(state.fallDirection)) return state
  const axis = laneAxis(state.fallDirection)
  return moveFalling(state, state.falling[axis] + directionOffset(direction)[axis])
}

/** Process gravity in event order, including level-ups and long ticks. */
export function tickFallingGame(state: FallingGameState, seconds: number): FallingGameState {
  if (!Number.isFinite(seconds) || seconds <= 0 || isGameOver(state)) return state
  let next = state
  let remaining = seconds
  while (remaining > 0 && !isGameOver(next)) {
    const dt = Math.min(remaining, FALL_INTERVAL - next.fallElapsed)
    next = {
      ...next,
      fallElapsed: next.fallElapsed + dt,
    }
    remaining -= dt
    if (next.fallElapsed >= FALL_INTERVAL - 1e-9) next = advanceFalling(next)
  }
  return next
}
