import { coordKey, DIRECTIONS, neighbour } from './coords'
import type { Board, PlacedSquare } from './board'
import { BONUS_INTERVAL, BONUS_MAX_SIZE, BONUS_MIN_SIZE } from './bonus'
import type { BonusObjective, BonusState } from './bonus'
import type { GameState } from './game'
import { inBounds, isGameMode, modeRules } from './modes'
import type { GameMode, GridBounds } from './modes'
import { findRoutes } from './routes'
import { BIOMES, DEFAULT_BIOME_PROBABILITIES, SHAPES, validBiomeProbabilities } from './tiles'
import type { BiomeProbabilities, Rotation, Terrain, Terrains, Tetromino } from './tiles'

/** Marks a JSON file as a TrisTik save. */
export const SAVE_FORMAT = 'tristik-save'
export const SAVE_VERSION = 1

/** One square on the board, flattened for JSON. */
export interface SavedSquare {
  readonly q: number
  readonly r: number
  readonly terrain: Terrain
  /** The piece it belongs to; a piece's four squares share it. */
  readonly piece: number
}

/** A whole game as JSON: everything needed to carry on exactly where it was left. */
export interface SaveFile {
  readonly format: typeof SAVE_FORMAT
  readonly version: typeof SAVE_VERSION
  /** Free text describing the save; ignored when loading. */
  readonly note?: string
  readonly score: number
  /** State of the piece generator, so the same pieces keep coming. */
  readonly seed: number
  readonly rotation: Rotation
  /** The piece in hand, unrotated. */
  readonly current: Tetromino | null
  readonly biomeProbabilities: BiomeProbabilities
  readonly board: readonly SavedSquare[]
  /** Optional for compatibility with saves made before stage 8. */
  readonly bonus?: BonusState
  /** Absent in saves made before the modes, which are score games. */
  readonly mode?: GameMode
  /** Pieces still to come, the one in hand included; only in a game with a limited supply. */
  readonly piecesLeft?: number
}

export type LoadResult =
  | { readonly ok: true; readonly game: GameState; readonly note?: string }
  | { readonly ok: false; readonly error: string }

/** The odds with their keys in a fixed order, so a save's text depends only on the game. */
function orderedProbabilities({
  shapeWeights,
  biomeCounts,
  biomeWeights,
}: BiomeProbabilities): BiomeProbabilities {
  return {
    ...(shapeWeights === undefined
      ? {}
      : {
          shapeWeights: Object.fromEntries(
            SHAPES.map((shape) => [shape, shapeWeights[shape]]),
          ) as BiomeProbabilities['shapeWeights'],
        }),
    biomeCounts: { 1: biomeCounts[1], 2: biomeCounts[2], 3: biomeCounts[3], 4: biomeCounts[4] },
    biomeWeights: Object.fromEntries(
      BIOMES.map((biome) => [biome, biomeWeights[biome]]),
    ) as BiomeProbabilities['biomeWeights'],
  }
}

/** The game as a save file. The last placement is not kept: it only drives effects. */
export function toSave(state: GameState, note?: string): SaveFile {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    ...(note === undefined ? {} : { note }),
    score: state.score,
    seed: state.seed,
    rotation: state.rotation,
    current: state.current,
    ...(state.mode === undefined ? {} : { mode: state.mode }),
    ...(state.piecesLeft === undefined ? {} : { piecesLeft: state.piecesLeft }),
    ...(state.bonus === undefined ? {} : { bonus: state.bonus }),
    biomeProbabilities: orderedProbabilities(
      state.biomeProbabilities ?? DEFAULT_BIOME_PROBABILITIES,
    ),
    board: Object.values(state.board)
      .map(({ coord, terrain, piece }) => ({ q: coord.q, r: coord.r, terrain, piece }))
      .sort((a, b) => a.piece - b.piece || a.r - b.r || a.q - b.q),
  }
}

class SaveError extends Error {}

function fail(message: string): never {
  throw new SaveError(message)
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isInteger = (value: unknown): value is number => Number.isSafeInteger(value)

function readTerrain(value: unknown, where: string): Terrain {
  if (!BIOMES.includes(value as Terrain))
    fail(`${where} has an unknown biome: ${JSON.stringify(value)}`)
  return value as Terrain
}

function readPiece(value: unknown): Tetromino | null {
  if (value === null) return null
  if (!isObject(value)) fail('the piece in hand must be an object or null')
  if (!SHAPES.includes(value.shape as Tetromino['shape']))
    fail(`the piece in hand has an unknown shape: ${JSON.stringify(value.shape)}`)
  if (!Array.isArray(value.terrains) || value.terrains.length !== 4)
    fail('the piece in hand needs four biomes')
  const terrains = value.terrains.map((t, i) =>
    readTerrain(t, `square ${i + 1} of the piece in hand`),
  )
  return { shape: value.shape as Tetromino['shape'], terrains: terrains as unknown as Terrains }
}

function readWeight(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
    fail(`${where} must be a number from 0 to 100`)
  return value
}

/** One objective, checked for a sound target and a milestone placement to be issued at. */
function readObjective(value: unknown, where: string): BonusObjective {
  if (!isObject(value)) fail(`${where} must be an object`)
  const { target, issuedAt, completed } = value
  if (!isInteger(target) || target < BONUS_MIN_SIZE || target > BONUS_MAX_SIZE)
    fail(`the target of ${where} must be a whole number from 7 to 13`)
  if (!isInteger(issuedAt) || issuedAt < BONUS_INTERVAL || issuedAt % BONUS_INTERVAL !== 0)
    fail(`${where} must be issued at a multiple of ${BONUS_INTERVAL} placements`)
  if (typeof completed !== 'boolean') fail(`the completion flag of ${where} must be true or false`)
  return { biome: readTerrain(value.biome, where), target, issuedAt, completed }
}

/** `ended`: the game is over, so its last objective may have closed before its ten placements. */
function readBonus(value: unknown, ended = false): BonusState | undefined {
  if (value === undefined) return undefined
  if (!isObject(value)) fail('the bonus progress must be an object')
  const { placements, completed, seed } = value
  if (!isInteger(placements) || placements < 0)
    fail('the bonus placement count must be a whole number of 0 or more')
  const maximumCompleted = Math.max(0, Math.floor((placements - 1) / BONUS_INTERVAL))
  if (!isInteger(completed) || completed < 0 || completed > maximumCompleted)
    fail('the completed bonus count does not match the placement count')
  if (!isInteger(seed) || seed < 0 || seed > 0xffffffff)
    fail('the bonus seed must be a whole number from 0 to 4294967295')

  // Saves from before the history was kept have none; their past objectives stay unknown.
  if (value.history !== undefined && !Array.isArray(value.history))
    fail('the bonus history must be a list')
  const history = ((value.history ?? []) as unknown[]).map((entry) =>
    readObjective(entry, 'a past bonus objective'),
  )
  history.forEach((past, i) => {
    const next = history[i + 1]?.issuedAt
    const inOrder =
      next !== undefined
        ? past.issuedAt + BONUS_INTERVAL <= next
        : past.issuedAt + BONUS_INTERVAL <= placements ||
          (ended && value.objective === null && past.issuedAt <= placements)
    if (!inOrder) fail('the past bonus objectives must come in order, ten placements apart')
  })
  if (history.filter((past) => past.completed).length > completed)
    fail('the bonus history has more completed objectives than the completed count')

  if (value.objective === null) return { placements, completed, seed, objective: null, history }
  const objective = readObjective(value.objective, 'the bonus objective')
  if (
    objective.issuedAt > placements ||
    placements >= objective.issuedAt + BONUS_INTERVAL ||
    (history.length > 0 && history.at(-1)!.issuedAt + BONUS_INTERVAL !== objective.issuedAt)
  )
    fail('the bonus deadline does not match the placement count')
  if (objective.completed && (completed === 0 || placements === objective.issuedAt))
    fail('the bonus objective cannot already be completed at this placement')
  return { placements, completed, seed, objective, history }
}

function readProbabilities(value: unknown): BiomeProbabilities {
  if (value === undefined) return DEFAULT_BIOME_PROBABILITIES
  if (!isObject(value) || !isObject(value.biomeCounts) || !isObject(value.biomeWeights))
    fail('the biome odds need biomeCounts and biomeWeights')
  const counts = value.biomeCounts
  const weights = value.biomeWeights
  // Saves from before the shape weights draw every shape equally, so they leave it out.
  if (value.shapeWeights !== undefined && !isObject(value.shapeWeights))
    fail('the shape weights must be an object')
  const shapes = value.shapeWeights
  const probabilities: BiomeProbabilities = {
    ...(shapes === undefined
      ? {}
      : {
          shapeWeights: Object.fromEntries(
            SHAPES.map((shape) => [shape, readWeight(shapes[shape], `the ${shape} weight`)]),
          ) as BiomeProbabilities['shapeWeights'],
        }),
    biomeCounts: {
      1: readWeight(counts[1], 'the odds of 1 biome'),
      2: readWeight(counts[2], 'the odds of 2 biomes'),
      3: readWeight(counts[3], 'the odds of 3 biomes'),
      4: readWeight(counts[4], 'the odds of 4 biomes'),
    },
    biomeWeights: Object.fromEntries(
      BIOMES.map((biome) => [biome, readWeight(weights[biome], `the ${biome} weight`)]),
    ) as BiomeProbabilities['biomeWeights'],
  }
  if (!validBiomeProbabilities(probabilities))
    fail('the odds leave no shape to draw, or ask for more biomes per piece than they allow')
  return probabilities
}

/** Whether `squares` are joined along their edges into one piece. */
function connected(squares: readonly PlacedSquare[]): boolean {
  const keys = new Set(squares.map((s) => coordKey(s.coord)))
  const seen = new Set([coordKey(squares[0]!.coord)])
  const queue = [squares[0]!.coord]
  while (queue.length > 0) {
    const c = queue.pop()!
    for (const d of DIRECTIONS) {
      const key = coordKey(neighbour(c, d))
      if (keys.has(key) && !seen.has(key)) {
        seen.add(key)
        queue.push(neighbour(c, d))
      }
    }
  }
  return seen.size === squares.length
}

function readBoard(value: unknown, bounds: GridBounds | null): Board {
  if (!Array.isArray(value) || value.length === 0) fail('the board needs at least one piece')
  const board: Record<string, PlacedSquare> = {}
  const pieces = new Map<number, PlacedSquare[]>()
  value.forEach((entry: unknown, i) => {
    const where = `board square ${i + 1}`
    if (!isObject(entry)) fail(`${where} must be an object`)
    const { q, r, piece } = entry
    if (!isInteger(q) || !isInteger(r)) fail(`${where} needs whole-number q and r`)
    if (!inBounds(bounds, { q, r })) fail(`${where} (${q}, ${r}) lies off the grid`)
    if (!isInteger(piece) || piece < 0) fail(`${where} needs a piece number of 0 or more`)
    const key = coordKey({ q, r })
    if (board[key]) fail(`two squares sit on the same cell (${q}, ${r})`)
    const square: PlacedSquare = {
      coord: { q, r },
      terrain: readTerrain(entry.terrain, where),
      piece,
    }
    board[key] = square
    pieces.set(piece, [...(pieces.get(piece) ?? []), square])
  })
  for (const [id, squares] of pieces) {
    // A tetromino, or one of the single tiles a board starts with.
    if (squares.length !== 4 && squares.length !== 1)
      fail(`piece ${id} has ${squares.length} squares instead of 4 (or 1, for a single tile)`)
    if (!connected(squares)) fail(`the squares of piece ${id} don't join up`)
  }
  return board
}

/** Reads a save file, checking everything a game relies on. */
export function fromSave(data: unknown): LoadResult {
  try {
    if (!isObject(data) || data.format !== SAVE_FORMAT) fail('this is not a TrisTik save')
    if (data.version !== SAVE_VERSION)
      fail(`save version ${JSON.stringify(data.version)} isn't supported`)
    if (!isInteger(data.score) || data.score < 0)
      fail('the score must be a whole number of 0 or more')
    if (!isInteger(data.seed) || data.seed < 0 || data.seed > 0xffffffff)
      fail('the seed must be a whole number from 0 to 4294967295')
    if (!isInteger(data.rotation) || data.rotation < 0 || data.rotation > 3)
      fail('the rotation must be 0, 1, 2 or 3')
    if (data.mode !== undefined && !isGameMode(data.mode))
      fail(`unknown game mode ${JSON.stringify(data.mode)}`)
    const mode = data.mode as GameMode | undefined
    const rules = modeRules(mode)
    const current = readPiece(data.current)
    const piecesLeft = data.piecesLeft
    if (rules.pieces === null) {
      if (piecesLeft !== undefined) fail('only a performance game counts its pieces left')
    } else {
      if (!isInteger(piecesLeft) || piecesLeft < 0 || piecesLeft > rules.pieces)
        fail(`the pieces left must be a whole number from 0 to ${rules.pieces}`)
      if (piecesLeft === 0 && current !== null) fail('a game with no pieces left has none in hand')
    }
    const board = readBoard(data.board, rules.bounds)
    const bonus = readBonus(data.bonus, rules.pieces !== null && current === null)
    const game: GameState = {
      board,
      current,
      rotation: data.rotation as Rotation,
      seed: data.seed,
      lastPlacement: null,
      score: data.score,
      routes: findRoutes(board),
      ...(bonus === undefined ? {} : { bonus }),
      biomeProbabilities: readProbabilities(data.biomeProbabilities),
      ...(mode === undefined ? {} : { mode }),
      ...(piecesLeft === undefined ? {} : { piecesLeft: piecesLeft as number }),
    }
    return typeof data.note === 'string' ? { ok: true, game, note: data.note } : { ok: true, game }
  } catch (error) {
    if (error instanceof SaveError) return { ok: false, error: error.message }
    throw error
  }
}

/** Reads a save from JSON text. */
export function parseSave(text: string): LoadResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: "the file isn't valid JSON" }
  }
  return fromSave(data)
}

/** A save as pretty-printed JSON text. */
export function saveText(state: GameState, note?: string): string {
  return `${JSON.stringify(toSave(state, note), null, 2)}\n`
}
