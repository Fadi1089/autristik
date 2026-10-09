import { createStartingBoard, withTile } from './board'
import type { Board } from './board'
import type { Coord } from './coords'
import { LEVEL_UP_TILES, levelGoal, levelTimeLimit } from './levels'
import { canPlace, evaluatePlacement } from './matching'
import type { PlacementEvaluation } from './matching'
import { createRng } from './random'
import { scorePlacement } from './scoring'
import type { PlacementScore } from './scoring'
import { normalizeRotation, randomQuadrants, rotateQuadrants } from './tiles'
import type { Quadrants, Rotation } from './tiles'

export const STARTING_TILES = 30

export type PlacementPreview = PlacementEvaluation & PlacementScore

export interface PlacementResult extends PlacementPreview {
  readonly coord: Coord
  /** This placement cleared the level's goal. */
  readonly leveledUp: boolean
}

/** Why a game ended: the countdown ran out, or the stack did. */
export type EndReason = 'time' | 'tiles'

export interface GameState {
  readonly board: Board
  /** Tile in hand, unrotated. Null once the stack is empty. */
  readonly current: Quadrants | null
  readonly rotation: Rotation
  /** Tiles left to place, including the one in hand. */
  readonly remaining: number
  /** Total points across all levels. */
  readonly score: number
  /** Current level, starting at 1. */
  readonly level: number
  /** Points earned since the current level began, counted towards its goal. */
  readonly levelScore: number
  /** Seconds left on the current level's countdown. */
  readonly timeLeft: number
  /** PRNG state used for the next draw. */
  readonly seed: number
  readonly lastPlacement: PlacementResult | null
}

export function createGame(seed: number, tiles: number = STARTING_TILES): GameState {
  const rng = createRng(seed)
  const board = createStartingBoard(rng)
  const current = tiles > 0 ? randomQuadrants(rng) : null
  return {
    board,
    current,
    rotation: 0,
    remaining: Math.max(0, tiles),
    score: 0,
    level: 1,
    levelScore: 0,
    timeLeft: levelTimeLimit(1),
    seed: rng.state,
    lastPlacement: null,
  }
}

/** The parts of the state needed to look at the tile in hand. */
export type HandState = Pick<GameState, 'board' | 'current' | 'rotation'>

/** The tile in hand with its rotation applied. */
export function currentQuadrants(state: HandState): Quadrants | null {
  return state.current ? rotateQuadrants(state.current, state.rotation) : null
}

export function rotateCurrent(state: GameState, turns: number): GameState {
  return { ...state, rotation: normalizeRotation(state.rotation + turns) }
}

export function previewPlacement(state: HandState, c: Coord): PlacementPreview | null {
  const quadrants = currentQuadrants(state)
  if (!quadrants || !canPlace(state.board, c)) return null
  const evaluation = evaluatePlacement(state.board, c, quadrants)
  return { ...evaluation, ...scorePlacement(evaluation) }
}

/** True when placing a tile worth `points` would clear the current level. */
export function wouldLevelUp(state: Pick<GameState, 'level' | 'levelScore'>, points: number) {
  return state.levelScore + points >= levelGoal(state.level)
}

/**
 * Places the tile in hand at `c`. Reaching the level's goal starts the next level
 * straight away: a fresh countdown, a higher goal and a few extra tiles.
 * Returns `state` unchanged if the move is not allowed.
 */
export function placeCurrent(state: GameState, c: Coord): GameState {
  const quadrants = currentQuadrants(state)
  const preview = previewPlacement(state, c)
  if (!quadrants || !preview || isGameOver(state)) return state

  const leveledUp = wouldLevelUp(state, preview.points)
  const level = leveledUp ? state.level + 1 : state.level
  const remaining = state.remaining - 1 + preview.bonusTiles + (leveledUp ? LEVEL_UP_TILES : 0)
  const rng = createRng(state.seed)
  const current = remaining > 0 ? randomQuadrants(rng) : null

  return {
    board: withTile(state.board, { coord: c, quadrants }),
    current,
    rotation: 0,
    remaining,
    score: state.score + preview.points,
    level,
    levelScore: leveledUp ? 0 : state.levelScore + preview.points,
    timeLeft: leveledUp ? levelTimeLimit(level) : state.timeLeft,
    seed: rng.state,
    lastPlacement: { ...preview, coord: c, leveledUp },
  }
}

/** Runs the countdown. Once it reaches zero the game is over. */
export function tickGame(state: GameState, seconds: number): GameState {
  if (isGameOver(state) || seconds <= 0) return state
  return { ...state, timeLeft: Math.max(0, state.timeLeft - seconds) }
}

export function endReason(state: Pick<GameState, 'current' | 'timeLeft'>): EndReason | null {
  if (state.timeLeft <= 0) return 'time'
  if (state.current === null) return 'tiles'
  return null
}

export function isGameOver(state: Pick<GameState, 'current' | 'timeLeft'>): boolean {
  return endReason(state) !== null
}
