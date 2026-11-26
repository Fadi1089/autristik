import { createStartingBoard, withPiece } from './board'
import { growLandscape } from './landscape'
import type { Board } from './board'
import { advanceBonus, closeBonus, createBonusState, legacyPlacements } from './bonus'
import type { BonusState } from './bonus'
import type { Coord } from './coords'
import { canPlace, evaluatePlacement, hasRoom, placementAnchors } from './matching'
import type { PlacementEvaluation } from './matching'
import { modeRules } from './modes'
import type { GameMode } from './modes'
import { createRng } from './random'
import type { Rng } from './random'
import { findRoutes, routeScore } from './routes'
import type { Route } from './routes'
import { PIECE_POINTS, scorePlacement } from './score'
import type { PlacementScore } from './score'
import { normalizeRotation, pieceSquares, randomTetromino } from './tiles'
import type { BiomeProbabilities, Rotation, Square, Tetromino } from './tiles'

const ROTATIONS: readonly Rotation[] = [0, 1, 2, 3]

export type PlacementPreview = PlacementEvaluation

/** Tiles shown after the one in hand. */
export const VISIBLE_NEXT = 3

export interface PlacementResult extends PlacementPreview {
  /** The anchor square the piece was placed on. */
  readonly coord: Coord
  readonly squares: readonly Square[]
  readonly score: PlacementScore
  /** How much the road points changed: new roads add squares, a shorter road takes some away. */
  readonly roadPoints: number
  readonly bonusPoints: number
}

export interface GameState {
  readonly board: Board
  /** Tetromino in hand, unrotated. */
  readonly current: Tetromino | null
  readonly rotation: Rotation
  /** PRNG state used for the next draw. */
  readonly seed: number
  readonly lastPlacement: PlacementResult | null
  /** Placement and bonus points, plus the squares roads cross now. */
  readonly score: number
  /** The roads joining the cities on the board as it stands. */
  readonly routes: readonly Route[]
  /** Absent only in saves made before bonus objectives were introduced. */
  readonly bonus?: BonusState
  readonly biomeProbabilities?: BiomeProbabilities
  /** Absent in saves made before the modes were introduced, which are score games. */
  readonly mode?: GameMode
  /**
   * Pieces still to come in a game with a limited supply, the one in hand included; absent when
   * the supply is endless. Once the game is over there is no piece in hand.
   */
  readonly piecesLeft?: number
}

/** Keeps the landscape's draws apart from the pieces' draws. */
const LANDSCAPE_SALT = 0x5bd1e995

/** The board a game in `mode` starts on: a generated landscape, or a piece and its tiles. */
function startingBoard(
  rng: Rng,
  mode: GameMode | undefined,
  biomeProbabilities?: BiomeProbabilities,
): Board {
  const rules = modeRules(mode)
  return rules.landscape
    ? growLandscape(createRng(rng.state ^ LANDSCAPE_SALT))
    : createStartingBoard(rng, biomeProbabilities, rules.bounds)
}

/** A score game's base point for its starting piece; a game that isn't scored stays at 0. */
function startingScore(mode: GameMode | undefined, routes: readonly Route[]): number {
  return modeRules(mode).scored ? PIECE_POINTS + routeScore(routes) : 0
}

export function createGame(
  seed: number,
  biomeProbabilities?: BiomeProbabilities,
  mode: GameMode = 'score',
): GameState {
  const rules = modeRules(mode)
  const rng = createRng(seed)
  const board = startingBoard(rng, mode, biomeProbabilities)
  const current = randomTetromino(rng, biomeProbabilities)
  const routes = findRoutes(board)
  return {
    board,
    current,
    rotation: 0,
    seed: rng.state,
    lastPlacement: null,
    score: startingScore(mode, routes),
    routes,
    bonus: createBonusState(seed),
    biomeProbabilities,
    mode,
    ...(rules.pieces === null ? {} : { piecesLeft: rules.pieces }),
  }
}

/**
 * The tiles drawn after the one in hand, peeked from the same sequence without drawing them;
 * fewer near the end of a limited supply.
 */
export function upcomingTiles(
  state: Pick<GameState, 'seed' | 'piecesLeft'> & {
    readonly biomeProbabilities?: BiomeProbabilities
  },
  count: number = VISIBLE_NEXT,
): Tetromino[] {
  const rng = createRng(state.seed)
  const shown = Math.max(0, Math.min(count, (state.piecesLeft ?? Infinity) - 1))
  return Array.from({ length: shown }, () => randomTetromino(rng, state.biomeProbabilities))
}

/**
 * Puts the board back to a starting island and the score to its base point; the tile in hand
 * carries on. A limited supply starts over in full, drawing a piece if the game had ended.
 */
export function resetBoard(state: GameState): GameState {
  const rules = modeRules(state.mode)
  // A separate sequence for the island, so the upcoming tiles stay exactly as shown.
  const board = startingBoard(
    createRng(state.seed ^ 0x9e3779b9),
    state.mode,
    state.biomeProbabilities,
  )
  const routes = findRoutes(board)
  let { current, rotation, seed } = state
  if (!current) {
    const rng = createRng(seed)
    current = randomTetromino(rng, state.biomeProbabilities)
    rotation = 0
    seed = rng.state
  }
  return {
    ...state,
    board,
    current,
    rotation,
    seed,
    lastPlacement: null,
    score: startingScore(state.mode, routes),
    routes,
    bonus: createBonusState(state.seed),
    ...(rules.pieces === null ? {} : { piecesLeft: rules.pieces }),
  }
}

/** The parts of the state needed to look at the tile in hand. */
export type HandState = Pick<GameState, 'board' | 'current' | 'rotation' | 'mode'>

/** The squares the piece in hand would cover with its anchor on `c`. */
export function currentSquares(state: HandState, c: Coord): Square[] | null {
  return state.current ? pieceSquares(state.current, state.rotation, c) : null
}

/** Whether the piece in hand fits with its anchor on `c`. */
export function canPlaceCurrent(state: HandState, c: Coord): boolean {
  const squares = currentSquares(state, c)
  return squares !== null && canPlace(state.board, squares, modeRules(state.mode))
}

/**
 * Anchors per rotation, kept per board, mode and piece: all three are fixed for a given board
 * and piece, so it never goes stale.
 */
const anchorCache = new WeakMap<
  Board,
  Map<GameMode, WeakMap<Tetromino, readonly (readonly Coord[])[]>>
>()

/** Every anchor where the piece in hand fits, for each of its four rotations. */
export function anchorsByRotation(state: HandState): readonly (readonly Coord[])[] {
  const { board, current, mode = 'score' } = state
  if (!current) return ROTATIONS.map(() => [])
  let byMode = anchorCache.get(board)
  if (!byMode) anchorCache.set(board, (byMode = new Map()))
  let byPiece = byMode.get(mode)
  if (!byPiece) byMode.set(mode, (byPiece = new WeakMap()))
  let anchors = byPiece.get(current)
  if (!anchors) {
    const rules = modeRules(mode)
    anchors = ROTATIONS.map((rotation) => placementAnchors(board, current, rotation, rules))
    byPiece.set(current, anchors)
  }
  return anchors
}

/** Every anchor where the piece in hand fits at `rotation` (its current one by default). */
export function currentAnchors(
  state: HandState,
  rotation: Rotation = state.rotation,
): readonly Coord[] {
  return anchorsByRotation(state)[rotation]!
}

/** The rotations at which the piece in hand fits with its anchor on `c`. */
export function fittingRotations(state: HandState, c: Coord): Rotation[] {
  return ROTATIONS.filter((rotation) => canPlaceCurrent({ ...state, rotation }, c))
}

/** The piece in hand fits nowhere, whichever way it turns, so it can only be skipped. */
export function isStuck(state: HandState): boolean {
  return state.current !== null && anchorsByRotation(state).every((a) => a.length === 0)
}

/**
 * Takes the next piece from the supply after one has been used up. A limited supply that runs
 * out, or a grid with no room left for any piece, ends the game: nothing more is drawn.
 */
function nextPiece(
  state: GameState,
  board: Board,
): Pick<GameState, 'current' | 'rotation' | 'seed' | 'piecesLeft'> & { readonly last: boolean } {
  const rules = modeRules(state.mode)
  const piecesLeft = state.piecesLeft === undefined ? undefined : state.piecesLeft - 1
  const left = piecesLeft === undefined ? {} : { piecesLeft }
  if (piecesLeft === 0 || !hasRoom(board, rules.bounds))
    return { current: null, rotation: 0, seed: state.seed, ...left, last: true }
  const rng = createRng(state.seed)
  const current = randomTetromino(rng, state.biomeProbabilities)
  return { current, rotation: 0, seed: rng.state, ...left, last: false }
}

/**
 * Sets the piece in hand aside and draws the next one; only allowed when it fits nowhere. In a
 * limited supply the skipped piece counts as used.
 */
export function skipCurrent(state: GameState): GameState {
  if (!isStuck(state)) return state
  const { last, ...next } = nextPiece(state, state.board)
  if (!last || !state.bonus) return { ...state, ...next }
  // The game ends here, so its open objective closes unmet.
  return { ...state, ...next, bonus: closeBonus(state.bonus) }
}

export function rotateCurrent(state: GameState, turns: number): GameState {
  return { ...state, rotation: normalizeRotation(state.rotation + turns) }
}

export function previewPlacement(state: HandState, c: Coord): PlacementPreview | null {
  const squares = currentSquares(state, c)
  if (!squares || !canPlace(state.board, squares, modeRules(state.mode))) return null
  return evaluatePlacement(state.board, squares)
}

/** What a placement scores in a game that keeps no score. */
const UNSCORED: PlacementScore = { connections: 0, surrounded: [], points: 0 }

/**
 * Places the tile in hand at `c` and draws the next one.
 * Returns `state` unchanged if the move is not allowed.
 */
export function placeCurrent(state: GameState, c: Coord): GameState {
  const squares = currentSquares(state, c)
  const preview = previewPlacement(state, c)
  if (!squares || !preview) return state

  const board = withPiece(state.board, squares)
  const { last, ...next } = nextPiece(state, board)
  // Roads are still found in a game that isn't scored: they are part of the landscape.
  const routes = findRoutes(board)
  const lastPlacement = { ...preview, coord: c, squares }

  if (!modeRules(state.mode).scored)
    return {
      ...state,
      ...next,
      board,
      lastPlacement: { ...lastPlacement, score: UNSCORED, roadPoints: 0, bonusPoints: 0 },
      routes,
    }

  const score = scorePlacement(state.board, board, squares)
  const roadPoints = routeScore(routes) - routeScore(state.routes)
  const { bonus, points: bonusPoints } = advanceBonus(
    state.bonus ?? createBonusState(state.seed, legacyPlacements(state.board)),
    state.board,
    board,
    last,
  )

  return {
    ...state,
    ...next,
    board,
    lastPlacement: { ...lastPlacement, score, roadPoints, bonusPoints },
    score: state.score + score.points + roadPoints + bonusPoints,
    routes,
    bonus,
  }
}

export function withBiomeProbabilities(
  state: GameState,
  biomeProbabilities: BiomeProbabilities,
): GameState {
  return {
    ...state,
    biomeProbabilities,
  }
}

/**
 * Why the game is over: its pieces ran out, or the grid had no room left for another. Null
 * while it goes on; an endless game never ends.
 */
export function endReason(
  state: Pick<GameState, 'current' | 'piecesLeft'>,
): 'pieces' | 'full' | null {
  if (state.current !== null || state.piecesLeft === undefined) return null
  return state.piecesLeft === 0 ? 'pieces' : 'full'
}

export function isGameOver(state: Pick<GameState, 'current' | 'piecesLeft'>): boolean {
  return endReason(state) !== null
}
