import { BONUS_INTERVAL, BONUS_POINTS, legacyPlacements } from '../game/bonus'
import { TERRAIN_COLORS, TERRAIN_LABELS } from '../palette'
import { useGameStore } from '../store/gameStore'

/** A compact objective card: the request, deadline, and number completed this game. */
export function BonusObjective() {
  const bonus = useGameStore((s) => s.bonus)
  const board = useGameStore((s) => s.board)
  const placements = bonus?.placements ?? legacyPlacements(board)
  const objective = bonus?.objective
  const remaining = objective
    ? objective.issuedAt + BONUS_INTERVAL - placements
    : BONUS_INTERVAL - (placements % BONUS_INTERVAL)

  if (placements < BONUS_INTERVAL) return null

  return (
    <section
      aria-label="Bonus objective"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="card w-fit max-w-full px-4 py-3 text-xs sm:max-w-[21rem] sm:text-sm"
    >
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <span className="eyebrow">Bonus objective</span>
        <span className="text-ink/60 tabular-nums">Completed: {bonus?.completed ?? 0}</span>
      </div>
      {objective ? (
        <>
          <p className="flex items-center gap-2 font-semibold text-ink">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: TERRAIN_COLORS[objective.biome] }}
            />
            Connect at least {objective.target} {TERRAIN_LABELS[objective.biome].toLowerCase()}{' '}
            squares
          </p>
          <p
            className={`mt-1 tabular-nums ${objective.completed ? 'font-semibold text-moss-deep' : 'text-ink/60'}`}
          >
            {objective.completed
              ? `Complete! +${BONUS_POINTS} points · Next in`
              : `${BONUS_POINTS} points ·`}{' '}
            {remaining} {remaining === 1 ? 'placement' : 'placements'}
            {!objective.completed && ' left'}
          </p>
        </>
      ) : (
        <p className="text-ink/70 tabular-nums">
          Next bonus in {remaining} {remaining === 1 ? 'placement' : 'placements'}
        </p>
      )}
    </section>
  )
}
