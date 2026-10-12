import { useState } from 'react'
import { GAME_THEMES, PLACEMENT_SOUNDS } from '../customization'
import type { PlacementSound } from '../customization'
import { playPlacementSound } from '../audio/placementAudio'
import { useSettingsStore } from '../store/settingsStore'
import { AudioSettings } from './AudioSettings'

const CHOICE =
  'rounded-xl border px-3 py-2.5 text-sm transition hover:border-moss focus-visible:border-moss'

export function Customization() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const sound = useSettingsStore((s) => s.placementSound)
  const setSound = useSettingsStore((s) => s.setPlacementSound)
  const volume = useSettingsStore((s) => s.soundVolume)
  const setVolume = useSettingsStore((s) => s.setSoundVolume)
  const [audioUnavailable, setAudioUnavailable] = useState(false)

  const preview = async (selected: PlacementSound) => {
    setAudioUnavailable(
      !(await playPlacementSound(selected, useSettingsStore.getState().soundVolume)),
    )
  }

  return (
    <div className="space-y-7">
      <section aria-label="Visual theme">
        <h3 className="font-display text-lg font-semibold">Visuals</h3>
        <p className="mt-1 text-xs text-ink/60">Choose the atmosphere of the island and menus.</p>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Theme">
          {GAME_THEMES.map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={theme === option}
              onClick={() => setTheme(option)}
              className={`${CHOICE} ${theme === option ? 'border-moss bg-moss/12' : 'border-ink/12 bg-paper/50'}`}
            >
              <span
                aria-hidden
                className={`mx-auto mb-2 block h-10 rounded-lg border border-ink/10 ${option === 'light' ? 'bg-[#e7dbc3]' : 'bg-[#25343b]'}`}
              />
              {option === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Placement sound">
        <h3 className="font-display text-lg font-semibold">Tile placement sound</h3>
        <p className="mt-1 text-xs text-ink/60">
          Select the sound for ordinary tiles. Each special tile has its own sound. Volume and
          Silent apply to all tile placements.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Placement sounds">
          {PLACEMENT_SOUNDS.map((option) => (
            <button
              type="button"
              key={option.id}
              aria-pressed={sound === option.id}
              onClick={() => {
                setSound(option.id)
                void preview(option.id)
              }}
              className={`${CHOICE} ${sound === option.id ? 'border-moss bg-moss/12 text-ink' : 'border-ink/12 text-ink/75'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label
          className="mt-4 flex items-center justify-between text-sm"
          htmlFor="placement-volume"
        >
          Volume <span className="text-ink/60 tabular-nums">{Math.round(volume * 100)}%</span>
        </label>
        <input
          id="placement-volume"
          className="mt-2 w-full accent-moss"
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(volume * 100)}
          onChange={(event) => setVolume(Number(event.target.value) / 100)}
        />
        <button
          type="button"
          onClick={() => void preview(sound)}
          disabled={sound === 'none' || volume === 0}
          className="mt-3 rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-paper transition hover:bg-moss-deep disabled:cursor-default disabled:opacity-40"
        >
          Preview sound
        </button>
        {audioUnavailable && (
          <p role="status" className="mt-2 text-xs text-clay">
            Audio is unavailable. Try previewing again.
          </p>
        )}
      </section>
      <AudioSettings />
      <p className="text-xs text-ink/50">Your choices are saved on this device.</p>
    </div>
  )
}
