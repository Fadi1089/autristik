import { CONNECTION_POINTS, PIECE_POINTS, SURROUNDED_POINTS } from '../game/score'
import type { PlacementScore } from '../game/score'

/** One line of a placement's cloud: some of its points, and where they came from. */
export interface ScoreLine {
  readonly points: number
  readonly reason: string
  /** The surround bonus, drawn in gold. */
  readonly gold: boolean
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

/** Small counts as words, which read better in a sentence. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n)
}

/**
 * A placement's points, line by line: the base point for placing the piece, then its
 * matching sides, then the bonus for each piece it surrounded. Lines worth nothing are left
 * out, except the base point. They add up to the placement's points.
 */
export function scoreLines(score: PlacementScore): ScoreLine[] {
  const lines: ScoreLine[] = [{ points: PIECE_POINTS, reason: 'placed', gold: false }]
  const sides = score.connections
  if (sides > 0)
    lines.push({
      points: sides * CONNECTION_POINTS,
      reason: `${countWord(sides)} ${sides === 1 ? 'side matches' : 'sides match'}`,
      gold: false,
    })
  const surrounded = score.surrounded.length
  if (surrounded > 0)
    lines.push({
      points: surrounded * SURROUNDED_POINTS,
      reason:
        surrounded === 1
          ? 'tetromino surrounded'
          : `${countWord(surrounded)} tetrominoes surrounded`,
      gold: true,
    })
  return lines
}
