import { useEffect } from 'react'
import { BIOMES, enabledBiomes, largestBiomeCount } from '../game/tiles'
import type { Biome } from '../game/tiles'
import { TERRAIN_LABELS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'

function ChanceInput({
  label,
  value,
  percent,
  locked,
  onChange,
}: {
  label: string
  value: number
  percent: number
  /** Why the weight can't go below its current value (or above 0, when it is 0). */
  locked?: string
  onChange(value: number): void
}) {
  // A locked weight at 0 can't rise; a locked positive weight can't reach 0.
  const min = locked && value > 0 ? 0.5 : 0
  const max = locked && value === 0 ? 0 : 100
  return (
    <label title={locked} className="grid grid-cols-[1fr_5rem_auto] items-center gap-2 text-sm">
      <span className={locked && value === 0 ? 'text-ink/45' : 'text-ink/80'}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step="0.5"
        value={value}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        aria-label={`${label} weight`}
        className="w-full rounded-lg bg-paper px-2 py-1.5 text-right text-ink shadow-[inset_0_0_0_1px_rgb(59_46_34/0.14)]"
      />
      <span className="w-12 text-right text-xs tabular-nums text-ink/55">
        {percent.toFixed(1)}%
      </span>
    </label>
  )
}

function share(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

/** Probability controls used for pieces drawn after the settings change. */
export function GameSettings() {
  const probabilities = useSettingsStore((s) => s.biomeProbabilities)
  const reset = useSettingsStore((s) => s.resetBiomeProbabilities)
  const setCountWeight = useSettingsStore((s) => s.setBiomeCountWeight)
  const setBiomeWeight = useSettingsStore((s) => s.setBiomeWeight)

  useEffect(() => {
    useGameStore.getState().setBiomeProbabilities(probabilities)
  }, [probabilities])

  const countTotal = Object.values(probabilities.biomeCounts).reduce(
    (sum, weight) => sum + weight,
    0,
  )
  const biomeTotal = Object.values(probabilities.biomeWeights).reduce(
    (sum, weight) => sum + weight,
    0,
  )
  /** A piece of N distinct biomes needs N biomes to pick from, so neither side may break that. */
  const enabled = enabledBiomes(probabilities.biomeWeights).length
  const biomesLocked = enabled === largestBiomeCount(probabilities.biomeCounts)

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">Biomes per tetromino</h3>
          <button
            type="button"
            onClick={reset}
            className="text-xs font-semibold text-ink/55 underline decoration-ink/20 underline-offset-4 hover:text-ink"
          >
            Reset defaults
          </button>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-ink/55">
          Set the relative chances for exactly 1, 2, 3 or 4 distinct biomes. The percentages shown
          are normalized from these weights. A count can only go above 0 when at least that many
          biomes are above 0 below.
        </p>
        <div className="space-y-2">
          {([1, 2, 3, 4] as const).map((count) => (
            <ChanceInput
              key={count}
              label={`${count} ${count === 1 ? 'biome' : 'biomes'}`}
              value={probabilities.biomeCounts[count]}
              percent={share(probabilities.biomeCounts[count], countTotal)}
              locked={
                count > enabled
                  ? `Needs at least ${count} biomes above 0 in the weights below`
                  : undefined
              }
              onChange={(value) => setCountWeight(count, value)}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-ink/8 pt-5">
        <h3 className="mb-2 font-display text-lg font-semibold">Biome selection weights</h3>
        <p className="mb-3 text-xs leading-relaxed text-ink/55">
          Relative weights used when selecting biome types without replacement. Each selected biome
          gets one square; the remaining squares are filled from the selected biomes in proportion
          to these weights, scaled to 100% among them. A zero weight excludes that biome. At least
          as many biomes must stay above 0 as the largest biome count above 0, so a piece always
          gets the number of biomes it asks for.
        </p>
        <div className="space-y-2">
          {BIOMES.map((biome: Biome) => (
            <ChanceInput
              key={biome}
              label={TERRAIN_LABELS[biome]}
              value={probabilities.biomeWeights[biome]}
              percent={share(probabilities.biomeWeights[biome], biomeTotal)}
              locked={
                biomesLocked && probabilities.biomeWeights[biome] > 0
                  ? `Pieces with ${enabled} biomes need ${enabled} biomes above 0`
                  : undefined
              }
              onChange={(value) => setBiomeWeight(biome, value)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
