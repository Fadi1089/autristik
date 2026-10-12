import { useSettingsStore } from '../store/settingsStore'

/** The same audio preferences are available from Settings and Customization. */
export function AudioSettings() {
  const menuSoundEnabled = useSettingsStore((s) => s.menuSoundEnabled)
  const menuSoundVolume = useSettingsStore((s) => s.menuSoundVolume)
  const setMenuSoundEnabled = useSettingsStore((s) => s.setMenuSoundEnabled)
  const setMenuSoundVolume = useSettingsStore((s) => s.setMenuSoundVolume)
  const musicEnabled = useSettingsStore((s) => s.musicEnabled)
  const musicVolume = useSettingsStore((s) => s.musicVolume)
  const setMusicEnabled = useSettingsStore((s) => s.setMusicEnabled)
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume)

  return (
    <section aria-label="Audio" className="space-y-5">
      <h3 className="font-display text-lg font-semibold">Audio</h3>
      <SoundControl
        id="background-music"
        title="Background music"
        description="Sunset Walk · calm ambient loop · 1:17. Plays softly in menus and during play."
        enabled={musicEnabled}
        volume={musicVolume}
        onToggle={() => setMusicEnabled(!musicEnabled)}
        onVolume={setMusicVolume}
      />
      <SoundControl
        id="menu-sound"
        title="Menu navigation"
        description="A soft, low click when you hover or focus another menu option."
        enabled={menuSoundEnabled}
        volume={menuSoundVolume}
        onToggle={() => setMenuSoundEnabled(!menuSoundEnabled)}
        onVolume={setMenuSoundVolume}
      />
    </section>
  )
}

function SoundControl({
  id,
  title,
  description,
  enabled,
  volume,
  onToggle,
  onVolume,
}: {
  id: string
  title: string
  description: string
  enabled: boolean
  volume: number
  onToggle: () => void
  onVolume: (volume: number) => void
}) {
  return (
    <div className="border-t border-ink/10 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold">{title}</h4>
        <button
          type="button"
          aria-label={title}
          aria-pressed={enabled}
          onClick={onToggle}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${enabled ? 'bg-moss text-paper' : 'bg-ink/8 text-ink/65'}`}
        >
          {enabled ? 'On' : 'Off'}
        </button>
      </div>
      <p className="mt-1 text-xs text-ink/60">{description}</p>
      <label htmlFor={id} className="mt-3 flex items-center justify-between text-sm">
        Volume <span className="text-ink/60 tabular-nums">{Math.round(volume * 100)}%</span>
      </label>
      <input
        id={id}
        aria-label={`${title} volume`}
        className="mt-2 w-full accent-moss"
        type="range"
        min="0"
        max="100"
        step="1"
        value={Math.round(volume * 100)}
        onChange={(event) => onVolume(Number(event.target.value) / 100)}
      />
    </div>
  )
}
