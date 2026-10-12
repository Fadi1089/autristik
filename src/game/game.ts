import { createStartingBoard, destructionTargets, tileCount, withTile, withoutTiles } from './board'
import type { Board } from './board'
import type { Coord } from './coords'
import { LEVEL_UP_TILES, levelGoal } from './levels'
import { canPlace, evaluatePlacement } from './matching'
import type { PlacementEvaluation } from './matching'
import { createRng } from './random'
import { scoreWithCombo } from './scoring'
import type { ComboPlacementScore } from './scoring'
import { normalizeRotation, randomQuadrants, randomTile, rotateQuadrants, tileKind } from './tiles'
import type { Quadrants, Rotation, TileDraw, TileMultiplier } from './tiles'

export const STARTING_TILES = 30

export type PlacementPreview = PlacementEvaluation &
  ComboPlacementScore & {
    readonly tileMultiplier: TileMultiplier
    readonly destroyed: readonly Coord[]
  }

export interface PlacementResult extends PlacementPreview {
  readonly coord: Coord
  readonly quadrants: Quadrants
  /** This placement cleared the level's goal. */
  readonly leveledUp: boolean
}

/** A game ends only when the tile supply is empty. */
export type EndReason = 'tiles'

export interface GameState {
  readonly board: Board
  /** Tile in hand, unrotated. Null once the stack is empty. */
  readonly current: Quadrants | null
  readonly currentMultiplier: TileMultiplier
  /** Successful player placements, including special tiles; deletion never reduces this count. */
  readonly placements: number
  readonly rotation: Rotation
  /** Tiles left to place, including the one in hand. */
  readonly remaining: number
  /** Total points across all levels. */
  readonly score: number
  /** Consecutive successful placements; the score multiplier caps at ×3. */
  readonly combo: number
  /** Current level, starting at 1. */
  readonly level: number
  /** Points earned since the current level began, counted towards its goal. */
  readonly levelScore: number
  /** PRNG state used for the next draw. */
  readonly seed: number
  readonly lastPlacement: PlacementResult | null
}

export function createGame(seed: number, tiles: number = STARTING_TILES): GameState {
  const rng = createRng(seed)
  const board = createStartingBoard(rng)
  const draw = tiles > 0 ? randomTile(rng) : null
  return {
    board,
    current: draw?.quadrants ?? null,
    currentMultiplier: draw?.multiplier ?? 1,
    placements: 0,
    rotation: 0,
    remaining: Math.max(0, tiles),
    score: 0,
    combo: 0,
    level: 1,
    levelScore: 0,
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

/** Peek at the queued draw without consuming the saved RNG state. */
export function nextTileQuadrants(
  state: Pick<GameState, 'seed' | 'remaining' | 'current'> & Partial<Pick<GameState, 'placements'>>,
): Quadrants | null {
  return nextTilePreview(state)?.quadrants ?? null
}

/** Preview the bonus as well as the terrain, without consuming the queued draw. */
export function nextTilePreview(
  state: Pick<GameState, 'seed' | 'remaining' | 'current'> & Partial<Pick<GameState, 'placements'>>,
): TileDraw | null {
  return state.current && state.remaining > 1
    ? randomTile(createRng(state.seed), (state.placements ?? 0) + 1)
    : null
}

export function rotateCurrent(state: GameState, turns: number): GameState {
  return { ...state, rotation: normalizeRotation(state.rotation + turns) }
}

export function previewPlacement(
  state: HandState & Pick<GameState, 'combo'> & Partial<Pick<GameState, 'currentMultiplier'>>,
  c: Coord,
): PlacementPreview | null {
  const quadrants = currentQuadrants(state)
  if (!quadrants || !canPlace(state.board, c)) return null
  const evaluation = evaluatePlacement(state.board, c, quadrants)
  const kind = tileKind(quadrants)
  if (kind === 'void') {
    return {
      ...evaluation,
      basePoints: 0,
      points: 0,
      bonusTiles: 0,
      combo: 0,
      multiplier: 1,
      tileMultiplier: 1,
      destroyed: destructionTargets(state.board, c),
    }
  }
  const score = scoreWithCombo(evaluation, state.combo)
  const tileMultiplier = kind === 'normal' ? (state.currentMultiplier ?? 1) : 1
  return {
    ...evaluation,
    ...score,
    points: score.points * tileMultiplier,
    tileMultiplier,
    destroyed: [],
  }
}

/** True when placing a tile worth `points` would clear the current level. */
export function wouldLevelUp(state: Pick<GameState, 'level' | 'levelScore'>, points: number) {
  return state.levelScore + points >= levelGoal(state.level)
}

/**
 * Places the tile in hand at `c`. Reaching the level's goal starts the next level
 * straight away: a higher goal and a few extra tiles.
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
  const placements = state.placements + 1
  const draw = remaining > 0 ? randomTile(rng, placements) : null
  let board =
    tileKind(quadrants) === 'void'
      ? withoutTiles(state.board, preview.destroyed)
      : withTile(state.board, { coord: c, quadrants, multiplier: preview.tileMultiplier })
  // Keep an anchor at the blast's own cell if the last occupied tiles were consumed.
  // Generate it after the queued draw so the next-tile preview stays exact.
  if (tileKind(quadrants) === 'void' && tileCount(board) === 0)
    board = withTile(board, { coord: c, quadrants: randomQuadrants(rng), multiplier: 1 })

  return {
    board,
    current: draw?.quadrants ?? null,
    currentMultiplier: draw?.multiplier ?? 1,
    placements,
    rotation: 0,
    remaining,
    score: state.score + preview.points,
    combo: preview.combo,
    level,
    levelScore: leveledUp ? 0 : state.levelScore + preview.points,
    seed: rng.state,
    lastPlacement: { ...preview, coord: c, quadrants, leveledUp },
  }
}

export function endReason(state: Pick<GameState, 'current'>): EndReason | null {
  if (state.current === null) return 'tiles'
  return null
}

export function isGameOver(state: Pick<GameState, 'current'>): boolean {
  return endReason(state) !== null
}
