import { useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  BIOMES,
  DEFAULT_SHAPE_WEIGHTS,
  enabledBiomes,
  enabledShapes,
  largestBiomeCount,
  SHAPES,
  shapeOffsets,
} from '../game/tiles'
import type { Biome, Shape } from '../game/tiles'
import { TERRAIN_LABELS } from '../palette'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'

/** A shape's outline, square by square, to tell the seven apart at a glance. */
function ShapeGlyph({ shape }: { shape: Shape }) {
  const offsets = shapeOffsets(shape)
  const minQ = Math.min(...offsets.map((o) => o.q))
  const minR = Math.min(...offsets.map((o) => o.r))
  return (
    <svg viewBox="0 0 4 4" aria-hidden className="size-5 shrink-0 text-ink/60">
      <g
        transform={`translate(${(4 - (Math.max(...offsets.map((o) => o.q)) - minQ + 1)) / 2} ${
          (4 - (Math.max(...offsets.map((o) => o.r)) - minR + 1)) / 2
        })`}
      >
        {offsets.map((o, i) => (
          <rect
            key={i}
            x={o.q - minQ + 0.08}
            y={o.r - minR + 0.08}
            width={0.84}
            height={0.84}
            rx={0.18}
            fill="currentColor"
          />
        ))}
      </g>
    </svg>
  )
}

function ChanceInput({
  label,
  icon,
  value,
  percent,
  locked,
  onChange,
}: {
  label: string
  /** Drawn before the label. */
  icon?: ReactNode
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
      <span
        className={`flex items-center gap-2 ${locked && value === 0 ? 'text-ink/45' : 'text-ink/80'}`}
      >
        {icon}
        {label}
      </span>
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
  const setShapeWeight = useSettingsStore((s) => s.setShapeWeight)
  const setCountWeight = useSettingsStore((s) => s.setBiomeCountWeight)
  const setBiomeWeight = useSettingsStore((s) => s.setBiomeWeight)

  useEffect(() => {
    useGameStore.getState().setBiomeProbabilities(probabilities)
  }, [probabilities])

  const shapeWeights = probabilities.shapeWeights ?? DEFAULT_SHAPE_WEIGHTS
  const shapeTotal = Object.values(shapeWeights).reduce((sum, weight) => sum + weight, 0)
  /** The last shape above 0 can't go to 0: a piece needs some shape. */
  const shapesLocked = enabledShapes(shapeWeights).length === 1
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
      <p className="text-xs leading-relaxed text-ink/55">
        These odds apply in every mode, to the pieces drawn next, including the ones already shown
        in the tray.
      </p>
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">Tetromino shapes</h3>
          <button
            type="button"
            onClick={reset}
            className="text-xs font-semibold text-ink/55 underline decoration-ink/20 underline-offset-4 hover:text-ink"
          >
            Reset defaults
          </button>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-ink/55">
          Relative chances of each shape. A zero weight leaves that shape out; at least one shape
          stays above 0.
        </p>
        <div className="space-y-2">
          {SHAPES.map((shape) => (
            <ChanceInput
              key={shape}
              label={shape}
              icon={<ShapeGlyph shape={shape} />}
              value={shapeWeights[shape]}
              percent={share(shapeWeights[shape], shapeTotal)}
              locked={
                shapesLocked && shapeWeights[shape] > 0
                  ? 'At least one shape must stay above 0'
                  : undefined
              }
              onChange={(value) => setShapeWeight(shape, value)}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-ink/8 pt-5">
        <h3 className="mb-2 font-display text-lg font-semibold">Biomes per tetromino</h3>
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
