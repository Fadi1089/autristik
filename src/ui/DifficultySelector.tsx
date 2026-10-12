import { useId } from 'react'
import { DIFFICULTIES, DIFFICULTY_LABELS, fallInterval } from '../game/levels'
import type { Difficulty } from '../game/levels'
import { FALL_DISTANCE } from '../game/falling'
import { useGameStore } from '../store/gameStore'

/** A compact new-game choice; resuming keeps the current game's difficulty. */
export function DifficultySelector() {
  const id = useId()
  const difficulty = useGameStore((s) => s.nextDifficulty)
  const select = useGameStore((s) => s.setNextDifficulty)
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <label htmlFor={id} className="font-semibold text-ink/60">
        Difficulty
      </label>
      <select
        id={id}
        aria-label="New game difficulty"
        title="Starting speed for a new game"
        value={difficulty}
        onChange={(event) => select(event.target.value as Difficulty)}
        className="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink"
      >
        {DIFFICULTIES.map((option) => (
          <option key={option} value={option}>
            {DIFFICULTY_LABELS[option]} ·{' '}
            {(fallInterval(1, option) * FALL_DISTANCE).toFixed(1).replace('.0', '')} s
          </option>
        ))}
      </select>
    </div>
  )
}
