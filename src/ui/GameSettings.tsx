import { useEffect } from 'react'
import { BIOMES } from '../game/tiles'
import type { Biome } from '../game/tiles'
import { TERRAIN_LABELS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'

function ChanceInput({
  label,
  value,
  percent,
  onChange,
}: {
  label: string
  value: number
  percent: number
  onChange(value: number): void
}) {
  return (
    <label className="grid grid-cols-[1fr_5rem_auto] items-center gap-2 text-sm">
      <span className="text-ink/80">{label}</span>
      <input
        type="number"
        min="0"
        max="100"
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
          are normalized from these weights.
        </p>
        <div className="space-y-2">
          {([1, 2, 3, 4] as const).map((count) => (
            <ChanceInput
              key={count}
              label={`${count} ${count === 1 ? 'biome' : 'biomes'}`}
              value={probabilities.biomeCounts[count]}
              percent={share(probabilities.biomeCounts[count], countTotal)}
              onChange={(value) => setCountWeight(count, value)}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-ink/8 pt-5">
        <h3 className="mb-2 font-display text-lg font-semibold">Biome selection weights</h3>
        <p className="mb-3 text-xs leading-relaxed text-ink/55">
          Relative weights used when selecting biome types without replacement. These are not direct
          per-square percentages; squares are assigned according to the chosen biome count. If a
          piece needs more distinct biomes than have nonzero weights, the remaining ones are chosen
          uniformly so the selected biome count is preserved.
        </p>
        <div className="space-y-2">
          {BIOMES.map((biome: Biome) => (
            <ChanceInput
              key={biome}
              label={TERRAIN_LABELS[biome]}
              value={probabilities.biomeWeights[biome]}
              percent={share(probabilities.biomeWeights[biome], biomeTotal)}
              onChange={(value) => setBiomeWeight(biome, value)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
