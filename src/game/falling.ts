import { boardIsland, boardIslands, boardTiles, isOccupied } from './board'
import type { Board } from './board'
import { Direction, directionOffset, neighbour, oppositeDirection } from './coords'
import type { Coord } from './coords'
import { createGame, isGameOver, placeCurrent } from './game'
import type { GameState } from './game'
import { BASE_FALL_INTERVAL, fallInterval } from './levels'
import type { Difficulty } from './levels'

export const FALL_DISTANCE = 10
/** Level-one cadence, retained for callers that need the initial timing. */
export const FALL_INTERVAL = BASE_FALL_INTERVAL

export interface FallingGameState extends GameState {
  readonly difficulty: Difficulty
  /** Active play time, never used as a countdown or end condition. */
  readonly playedSeconds: number
  readonly falling: Coord | null
  /** World direction towards the stack, independent of camera orientation. */
  readonly fallDirection: Direction
  readonly fallElapsed: number
  /** A selected island can be approached across other islands without retargeting it. */
  readonly fallAnchor?: Coord
}

function activeBoard(
  state: Pick<FallingGameState, 'board'> & { readonly fallAnchor?: Coord },
): Board {
  return state.fallAnchor ? boardIsland(state.board, state.fallAnchor) : state.board
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
  // An emptied island can be rebuilt at the origin, with a virtual blocker one cell beyond it.
  if (positions.length === 0 && boardTiles(board).length === 0 && lane === 0) positions.push(sign)
  if (positions.length === 0) return null
  const edge = sign > 0 ? Math.min(...positions) : Math.max(...positions)
  const start = edge - sign * distance
  return axis === 'q' ? { q: lane, r: start } : { q: start, r: lane }
}

export function spawnFalling(
  board: Board,
  direction: Direction = Direction.South,
  preferredLane?: number,
  anchor?: Coord,
): Coord {
  if (anchor) board = boardIsland(board, anchor)
  const columns = fallingColumns(board, direction)
  const lane =
    preferredLane !== undefined && columns.includes(preferredLane)
      ? preferredLane
      : (columns[Math.floor(columns.length / 2)] ?? 0)
  return positionAboveLane(board, direction, lane, FALL_DISTANCE) ?? { q: 0, r: 0 }
}

export function createFallingGame(
  seed: number,
  tiles?: number,
  difficulty: Difficulty = 'easy',
): FallingGameState {
  const game = createGame(seed, tiles)
  return {
    ...game,
    difficulty,
    playedSeconds: 0,
    falling: isGameOver(game) ? null : spawnFalling(game.board),
    fallDirection: Direction.South,
    fallElapsed: 0,
    fallAnchor: undefined,
  }
}

/** First reachable landing square in the chosen lane; never passes through a tile. */
export function landingPosition(
  state: Pick<FallingGameState, 'board' | 'falling' | 'fallDirection' | 'current'> & {
    readonly fallAnchor?: Coord
  },
): Coord | null {
  if (!state.falling || isGameOver(state)) return null
  if (boardTiles(state.board).length === 0) return { q: 0, r: 0 }
  const axis = laneAxis(state.fallDirection)
  const forward = axis === 'q' ? 'r' : 'q'
  const delta = directionOffset(state.fallDirection)
  const distances = boardTiles(activeBoard(state))
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
  const falling = positionAboveLane(activeBoard(state), direction, anchor[axis], distance)
  return { ...state, falling, fallDirection: direction, fallAnchor: anchor }
}

/** Follow the lane's relief without adding fall time; empty lanes turn around the board's edge. */
export function moveFalling(state: FallingGameState, lane: number): FallingGameState {
  if (!state.falling || isGameOver(state) || !Number.isInteger(lane)) return state
  if (boardTiles(state.board).length === 0) return state
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
    const falling = positionAboveLane(activeBoard(state), state.fallDirection, value, distance)
    if (!falling) return turnAtEdge(next, outward)
    next = { ...next, falling }
  }
  return next
}

export function changeFallDirection(
  state: FallingGameState,
  direction: Direction,
): FallingGameState {
  if (isGameOver(state)) return state
  const target = landingPosition(state)
  if (!target || !state.falling) return state
  const distance = Math.abs(target.q - state.falling.q) + Math.abs(target.r - state.falling.r) + 1
  const anchor = neighbour(target, state.fallDirection)
  const axis = laneAxis(direction)
  const island = boardIsland(state.board, anchor)
  if (direction === state.fallDirection) {
    // Repeating Shift + the same arrival side crosses the gap to the next island's near edge.
    const outward = directionOffset(oppositeDirection(direction))
    const candidates = boardIslands(state.board)
      .filter((other) => !isOccupied(other, anchor))
      .map((other) => {
        const lanes = fallingColumns(other, direction)
        const lane = lanes.reduce(
          (best, value) =>
            Math.abs(value - target[axis]) < Math.abs(best - target[axis]) ? value : best,
          lanes[0]!,
        )
        const nextDirection = oppositeDirection(direction)
        const falling = positionAboveLane(other, nextDirection, lane, distance)!
        const nextAnchor = {
          q: falling.q + directionOffset(nextDirection).q * distance,
          r: falling.r + directionOffset(nextDirection).r * distance,
        }
        const dx = nextAnchor.q - anchor.q,
          dz = nextAnchor.r - anchor.r
        return {
          falling,
          nextAnchor,
          nextDirection,
          ahead: dx * outward.q + dz * outward.r,
          separation: dx * dx + dz * dz,
        }
      })
      .filter((candidate) => candidate.ahead > 0)
      .sort((a, b) => a.separation - b.separation)
    const next = candidates[0]
    return next
      ? {
          ...state,
          falling: next.falling,
          fallDirection: next.nextDirection,
          fallAnchor: next.nextAnchor,
        }
      : state
  }
  // Turn around the projected placement, not the occupied tile it was aimed at.
  // If that row/column has no obstacle, use the adjacent supported lane.
  const falling =
    positionAboveLane(island, direction, target[axis], distance) ??
    positionAboveLane(island, direction, anchor[axis], distance)
  return {
    ...state,
    fallDirection: direction,
    falling,
    fallAnchor: isOccupied(island, anchor) ? anchor : undefined,
  }
}

function lockFalling(state: FallingGameState, position: Coord): FallingGameState {
  const placed = placeCurrent(state, position)
  if (placed === state) return state
  const fallAnchor = isOccupied(placed.board, position)
    ? position
    : boardTiles(placed.board).sort(
        (a, b) =>
          (a.coord.q - position.q) ** 2 +
          (a.coord.r - position.r) ** 2 -
          ((b.coord.q - position.q) ** 2 + (b.coord.r - position.r) ** 2),
      )[0]?.coord
  return {
    ...state,
    ...placed,
    falling: isGameOver(placed)
      ? null
      : spawnFalling(
          placed.board,
          state.fallDirection,
          position[laneAxis(state.fallDirection)],
          fallAnchor,
        ),
    fallElapsed: 0,
    fallAnchor,
  }
}

/** One step on demand or on the gravity clock; no time is consumed by manual input. */
export function advanceFalling(state: FallingGameState): FallingGameState {
  if (!state.falling || isGameOver(state)) return state
  const next = neighbour(state.falling, state.fallDirection)
  return isOccupied(activeBoard(state), next) ||
    (boardTiles(state.board).length === 0 && state.falling.q === 0 && state.falling.r === 0)
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
    // A landing may advance the level: the next tile immediately uses its new cadence.
    const interval = fallInterval(next.level, next.difficulty)
    const dt = Math.min(remaining, Math.max(0, interval - next.fallElapsed))
    next = {
      ...next,
      fallElapsed: next.fallElapsed + dt,
      playedSeconds: next.playedSeconds + dt,
    }
    remaining -= dt
    if (next.fallElapsed >= interval - 1e-9) next = advanceFalling(next)
  }
  return next
}
