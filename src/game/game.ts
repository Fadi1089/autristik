import {
  createStartingBoard,
  destructionTargets,
  getTile,
  tileCount,
  withTile,
  withoutTiles,
} from './board'
import type { Board } from './board'
import { DIRECTIONS, neighbour } from './coords'
import type { Coord } from './coords'
import { LEVEL_UP_TILES, levelGoal } from './levels'
import { canPlace, evaluatePlacement } from './matching'
import type { PlacementEvaluation } from './matching'
import { createRng } from './random'
import { comboMultiplier, scoreWithCombo } from './scoring'
import type { ComboPlacementScore } from './scoring'
import { DEFAULT_GAME_MODE } from './modes'
import type { GameMode } from './modes'
import { ATTACK_TILE_LIMIT, INITIAL_ATTACK_TIME, LEVEL_ATTACK_TIME } from './variants'
import type { GameVariant } from './variants'
import { normalizeRotation, randomQuadrants, randomTile, rotateQuadrants, tileKind } from './tiles'
import type { HeldTile, Quadrants, Rotation, TileDraw, TileMultiplier } from './tiles'

export const STARTING_TILES = 30

export type PlacementPreview = PlacementEvaluation &
  ComboPlacementScore & {
    readonly tileMultiplier: TileMultiplier
    readonly destroyed: readonly Coord[]
  }

export interface PlacementResult extends PlacementPreview {
  /** Own bonus, independent of neighbouring bonuses applied to this placement's score. */
  readonly intrinsicMultiplier: TileMultiplier
  readonly coord: Coord
  readonly quadrants: Quadrants
  /** This placement cleared the level's goal. */
  readonly leveledUp: boolean
}

export type EndReason = 'tiles' | 'time'

export interface GameState {
  readonly mode: GameMode
  readonly variant: GameVariant
  /** Null in Standard; countdown seconds in Time-attack. */
  readonly timeRemaining: number | null
  readonly board: Board
  /** Tile in hand, unrotated. Null once the stack is empty. */
  readonly current: Quadrants | null
  readonly currentMultiplier: TileMultiplier
  /** Materialized only on exchange. A held tile keeps its own rotation and bonus. */
  readonly queued: HeldTile | null
  /** Successful player placements, including special tiles; deletion never reduces this count. */
  readonly placements: number
  readonly rotation: Rotation
  /** Tiles left to place, including the one in hand. Time-attack refills at each level. */
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

export function createGame(
  seed: number,
  tiles: number = STARTING_TILES,
  mode: GameMode = DEFAULT_GAME_MODE,
  variant: GameVariant = 'standard',
): GameState {
  const rng = createRng(seed)
  const board = createStartingBoard(rng)
  const remaining = variant === 'time-attack' ? ATTACK_TILE_LIMIT : Math.max(0, tiles)
  const draw = remaining > 0 ? randomTile(rng, 0, mode) : null
  return {
    mode,
    variant,
    timeRemaining: variant === 'time-attack' ? INITIAL_ATTACK_TIME : null,
    board,
    current: draw?.quadrants ?? null,
    currentMultiplier: draw?.multiplier ?? 1,
    queued: null,
    placements: 0,
    rotation: 0,
    remaining,
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
  state: Pick<GameState, 'seed' | 'remaining' | 'current'> &
    Partial<Pick<GameState, 'placements' | 'mode' | 'queued'>>,
): Quadrants | null {
  return nextTilePreview(state)?.quadrants ?? null
}

/** Preview the bonus as well as the terrain, without consuming the queued draw. */
export function nextTilePreview(
  state: Pick<GameState, 'seed' | 'remaining' | 'current'> &
    Partial<Pick<GameState, 'placements' | 'mode' | 'queued'>>,
): (TileDraw & { readonly rotation?: Rotation }) | null {
  return state.current && state.remaining > 1
    ? (state.queued ??
        randomTile(createRng(state.seed), state.placements ?? 0, state.mode ?? DEFAULT_GAME_MODE))
    : null
}

/** Unlimited inversion, with no draw rerolls, supply cost or rotation loss. */
export function swapCurrent(state: GameState): GameState {
  if (!state.current || state.remaining < 2) return state
  const rng = createRng(state.seed)
  const incoming = state.queued ?? {
    ...randomTile(rng, state.placements, state.mode),
    rotation: 0 as const,
  }
  return {
    ...state,
    current: incoming.quadrants,
    currentMultiplier: incoming.multiplier,
    rotation: incoming.rotation,
    queued: {
      quadrants: state.current,
      multiplier: state.currentMultiplier,
      rotation: state.rotation,
    },
    seed: state.queued ? state.seed : rng.state,
  }
}

export function rotateCurrent(state: GameState, turns: number): GameState {
  return { ...state, rotation: normalizeRotation(state.rotation + turns) }
}

/** Touching bonuses affect this score only; each tile keeps its intrinsic bonus. */
export function placementMultiplier(
  state: Pick<GameState, 'board' | 'current'> &
    Partial<Pick<GameState, 'currentMultiplier' | 'mode'>>,
  c: Coord,
): TileMultiplier {
  if (!state.current || state.mode === 'classic') return 1
  const kind = tileKind(state.current)
  if (kind !== 'normal' && kind !== 'gold') return 1
  let multiplier: TileMultiplier = state.currentMultiplier ?? 1
  for (const direction of DIRECTIONS) {
    const other = getTile(state.board, neighbour(c, direction))
    if (!other) continue
    const otherKind = tileKind(other.quadrants)
    const bonus = other.multiplier ?? 1
    if ((otherKind === 'normal' || otherKind === 'gold') && bonus > multiplier) multiplier = bonus
  }
  return multiplier
}

export function previewPlacement(
  state: HandState &
    Pick<GameState, 'combo'> &
    Partial<Pick<GameState, 'currentMultiplier' | 'mode'>>,
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
  if (kind === 'bedrock' && state.mode !== 'classic')
    return {
      ...evaluation,
      basePoints: 0,
      points: 0,
      bonusTiles: 0,
      combo: state.combo,
      multiplier: comboMultiplier(state.combo),
      tileMultiplier: 1,
      destroyed: [],
    }
  // Bedrock remains a blocked side for scoring and harmony, but is neutral for the streak.
  const comboEvaluation =
    state.mode === 'classic'
      ? evaluation
      : {
          ...evaluation,
          mismatched: evaluation.mismatched.filter((direction) => {
            const other = getTile(state.board, neighbour(c, direction))
            return !other || tileKind(other.quadrants) !== 'bedrock'
          }),
        }
  let score = scoreWithCombo(comboEvaluation, state.combo)
  if (
    evaluation.neighbours > 0 &&
    comboEvaluation.matched.length === 0 &&
    comboEvaluation.mismatched.length === 0
  )
    score = {
      ...score,
      combo: state.combo,
      multiplier: comboMultiplier(state.combo),
      points: score.basePoints * comboMultiplier(state.combo),
    }
  const tileMultiplier = placementMultiplier(state, c)
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
  const remaining =
    state.variant === 'time-attack'
      ? leveledUp
        ? ATTACK_TILE_LIMIT
        : state.remaining - 1
      : state.remaining - 1 + preview.bonusTiles + (leveledUp ? LEVEL_UP_TILES : 0)
  const rng = createRng(state.seed)
  const placements = state.placements + 1
  const kind = tileKind(quadrants)
  const intrinsicMultiplier =
    state.mode === 'superblock' && (kind === 'normal' || kind === 'gold')
      ? state.currentMultiplier
      : 1
  const draw =
    remaining > 0 ? (state.queued ?? randomTile(rng, state.placements, state.mode)) : null
  let board =
    tileKind(quadrants) === 'void'
      ? withoutTiles(state.board, preview.destroyed)
      : withTile(state.board, { coord: c, quadrants, multiplier: intrinsicMultiplier })
  // Keep an anchor at the blast's own cell if the last occupied tiles were consumed.
  // Generate it after the queued draw so the next-tile preview stays exact.
  if (tileKind(quadrants) === 'void' && tileCount(board) === 0)
    board = withTile(board, { coord: c, quadrants: randomQuadrants(rng), multiplier: 1 })

  return {
    mode: state.mode,
    variant: state.variant,
    timeRemaining:
      state.timeRemaining === null
        ? null
        : state.timeRemaining + (leveledUp ? LEVEL_ATTACK_TIME : 0),
    board,
    current: draw?.quadrants ?? null,
    currentMultiplier: draw?.multiplier ?? 1,
    queued: null,
    placements,
    rotation: remaining > 0 && state.queued ? state.queued.rotation : 0,
    remaining,
    score: state.score + preview.points,
    combo: preview.combo,
    level,
    levelScore: leveledUp ? 0 : state.levelScore + preview.points,
    seed: rng.state,
    lastPlacement: { ...preview, intrinsicMultiplier, coord: c, quadrants, leveledUp },
  }
}

type EndState = Pick<GameState, 'current'> & Partial<Pick<GameState, 'variant' | 'timeRemaining'>>

export function endReason(state: EndState): EndReason | null {
  if (
    state.variant === 'time-attack' &&
    state.timeRemaining !== null &&
    state.timeRemaining !== undefined &&
    state.timeRemaining <= 0
  )
    return 'time'
  if (state.current === null) return 'tiles'
  return null
}

export function isGameOver(state: EndState): boolean {
  return endReason(state) !== null
}
