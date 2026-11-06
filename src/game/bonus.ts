import type { Board } from './board'
import { coordKey, DIRECTIONS, neighbour } from './coords'
import type { Coord, CoordKey } from './coords'
import { blueConflict } from './matching'
import { createRng } from './random'
import type { Rng } from './random'
import { BIOMES } from './tiles'
import type { Biome } from './tiles'

export const BONUS_INTERVAL = 10
export const BONUS_POINTS = 20
export const BONUS_MIN_SIZE = 7
export const BONUS_MAX_SIZE = 13

export interface BonusObjective {
  readonly biome: Biome
  readonly target: number
  /** Proposed after this many player placements; the following ten placements count. */
  readonly issuedAt: number
  readonly completed: boolean
}

export interface BonusState {
  /** Successful player placements, excluding the initial board and skipped pieces. */
  readonly placements: number
  readonly completed: number
  /** Independent random stream: objectives must never change the upcoming pieces. */
  readonly seed: number
  readonly objective: BonusObjective | null
  /** Earlier objectives, oldest first, each as it stood when the next one replaced it. */
  readonly history: readonly BonusObjective[]
}

export function createBonusState(seed: number, placements = 0): BonusState {
  return {
    placements,
    completed: 0,
    seed: (seed ^ 0x6a09e667) >>> 0,
    objective: null,
    history: [],
  }
}

/** Only used for pre-objective saves, which did not record a player placement counter. */
export function legacyPlacements(board: Board): number {
  const sizes = new Map<number, number>()
  for (const square of Object.values(board))
    sizes.set(square.piece, (sizes.get(square.piece) ?? 0) + 1)
  return Math.max(0, [...sizes.values()].filter((size) => size === 4).length - 1)
}

/** Equal odds for all five biomes and all seven sizes, regardless of the piece settings. */
export function drawBonusObjective(rng: Pick<Rng, 'next'>, issuedAt: number): BonusObjective {
  return {
    biome: BIOMES[Math.floor(rng.next() * BIOMES.length)]!,
    target: BONUS_MIN_SIZE + Math.floor(rng.next() * (BONUS_MAX_SIZE - BONUS_MIN_SIZE + 1)),
    issuedAt,
    completed: false,
  }
}

/** Regions join along sides, including across tetromino boundaries, never just at corners. */
function regions(board: Board, biome: Biome): CoordKey[][] {
  const remaining = new Set<CoordKey>()
  for (const square of Object.values(board))
    if (square.terrain === biome) remaining.add(coordKey(square.coord))
  const result: CoordKey[][] = []
  for (const start of remaining) {
    remaining.delete(start)
    const region: CoordKey[] = [start]
    for (let i = 0; i < region.length; i++) {
      const square = board[region[i]!]!
      for (const direction of DIRECTIONS) {
        const key = coordKey(neighbour(square.coord, direction))
        if (remaining.delete(key)) region.push(key)
      }
    }
    result.push(region)
  }
  return result
}

/**
 * How far the objective has come: its largest region still below the target. A region already at
 * the target while the objective is open was that large before it, so it can never count; nor can
 * anything joined to it. `stale` counts those regions, so the player can be told.
 */
export function bonusProgress(
  board: Board,
  objective: Pick<BonusObjective, 'biome' | 'target' | 'completed'>,
): { size: number; stale: number } {
  if (objective.completed) return { size: objective.target, stale: 0 }
  const sizes = regions(board, objective.biome).map((region) => region.length)
  const open = sizes.filter((size) => size < objective.target)
  return { size: Math.max(0, ...open), stale: sizes.length - open.length }
}

/**
 * Where to grow the objective: the empty cells beside its largest region that can still count.
 * A square of the biome there joins that region without touching one that is already too big,
 * which would spoil it; cells against blue are left out, since only blue goes against blue.
 */
export function bonusTargetCells(
  board: Board,
  objective: Pick<BonusObjective, 'biome' | 'target' | 'completed'>,
): Coord[] {
  if (objective.completed) return []
  const all = regions(board, objective.biome)
  const stale = new Set(all.filter((region) => region.length >= objective.target).flat())
  const growable = all
    .filter((region) => region.length < objective.target)
    .map((region) => {
      const cells = new Map<CoordKey, Coord>()
      for (const key of region)
        for (const direction of DIRECTIONS) {
          const cell = neighbour(board[key]!.coord, direction)
          if (board[coordKey(cell)] || cells.has(coordKey(cell))) continue
          const blocked = DIRECTIONS.some((d) => {
            const other = board[coordKey(neighbour(cell, d))]
            return (
              other &&
              (stale.has(coordKey(other.coord)) || blueConflict(other.terrain, objective.biome))
            )
          })
          if (!blocked) cells.set(coordKey(cell), cell)
        }
      return { size: region.length, cells: [...cells.values()] }
    })
    .filter((region) => region.cells.length > 0)
  const largest = Math.max(0, ...growable.map((region) => region.size))
  return growable
    .filter((region) => region.size === largest)
    .flatMap((region) => region.cells)
    .sort((a, b) => a.r - b.r || a.q - b.q)
}

/** A placement must take a region across the target, without reusing an already large one. */
export function reachesBonusRegion(
  before: Board,
  after: Board,
  objective: Pick<BonusObjective, 'biome' | 'target'>,
): boolean {
  const alreadyLarge = new Set(
    regions(before, objective.biome)
      .filter((region) => region.length >= objective.target)
      .flat(),
  )
  return regions(after, objective.biome).some(
    (region) =>
      region.length >= objective.target &&
      region.some((key) => before[key] === undefined) &&
      region.every((key) => !alreadyLarge.has(key)),
  )
}

/** The game is over: the open objective, met or not, joins the history and none follows. */
export function closeBonus(state: BonusState): BonusState {
  if (!state.objective) return state
  return { ...state, objective: null, history: [...state.history, state.objective] }
}

/**
 * Evaluate the expiring objective before proposing the next one at the same milestone. The
 * `last` placement of a game proposes nothing: its objective, met or not, joins the history.
 */
export function advanceBonus(
  state: BonusState,
  before: Board,
  after: Board,
  last = false,
): { bonus: BonusState; points: number } {
  const placements = state.placements + 1
  let objective = state.objective
  let completed = state.completed
  let seed = state.seed
  let points = 0
  if (
    objective &&
    !objective.completed &&
    placements > objective.issuedAt &&
    placements <= objective.issuedAt + BONUS_INTERVAL &&
    reachesBonusRegion(before, after, objective)
  ) {
    objective = { ...objective, completed: true }
    completed++
    points = BONUS_POINTS
  }
  let history = state.history
  if (last) return { bonus: closeBonus({ ...state, placements, completed, objective }), points }
  if (placements % BONUS_INTERVAL === 0) {
    if (objective) history = [...history, objective]
    const rng = createRng(seed)
    objective = drawBonusObjective(rng, placements)
    seed = rng.state
  }
  return { bonus: { placements, completed, seed, objective, history }, points }
}
