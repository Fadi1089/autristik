import { useTranslation } from '../i18n/useTranslation'
import { useSettingsStore } from '../store/settingsStore'
import { useState } from 'react'
import { playPlacementSound } from '../audio/placementAudio'

/** All audio volumes and switches are grouped in Settings. */
export function AudioSettings() {
  const { t } = useTranslation()
  const sound = useSettingsStore((s) => s.placementSound)
  const volume = useSettingsStore((s) => s.soundVolume)
  const setVolume = useSettingsStore((s) => s.setSoundVolume)
  const enabled = useSettingsStore((s) => s.placementSoundEnabled)
  const setEnabled = useSettingsStore((s) => s.setPlacementSoundEnabled)
  const [audioUnavailable, setAudioUnavailable] = useState(false)

  const preview = async () => {
    const settings = useSettingsStore.getState()
    if (!settings.placementSoundEnabled) return
    setAudioUnavailable(!(await playPlacementSound(settings.placementSound, settings.soundVolume)))
  }

  const menuSoundEnabled = useSettingsStore((s) => s.menuSoundEnabled)
  const menuSoundVolume = useSettingsStore((s) => s.menuSoundVolume)
  const setMenuSoundEnabled = useSettingsStore((s) => s.setMenuSoundEnabled)
  const setMenuSoundVolume = useSettingsStore((s) => s.setMenuSoundVolume)
  const musicEnabled = useSettingsStore((s) => s.musicEnabled)
  const musicVolume = useSettingsStore((s) => s.musicVolume)
  const setMusicEnabled = useSettingsStore((s) => s.setMusicEnabled)
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume)
  const clockSoundEnabled = useSettingsStore((s) => s.clockSoundEnabled)
  const clockSoundVolume = useSettingsStore((s) => s.clockSoundVolume)
  const setClockSoundEnabled = useSettingsStore((s) => s.setClockSoundEnabled)
  const setClockSoundVolume = useSettingsStore((s) => s.setClockSoundVolume)
  const feedbackSoundEnabled = useSettingsStore((s) => s.feedbackSoundEnabled)
  const feedbackSoundVolume = useSettingsStore((s) => s.feedbackSoundVolume)
  const setFeedbackSoundEnabled = useSettingsStore((s) => s.setFeedbackSoundEnabled)
  const setFeedbackSoundVolume = useSettingsStore((s) => s.setFeedbackSoundVolume)

  return (
    <section aria-label={t('Audio')} className="space-y-5">
      <h3 className="font-display text-lg font-semibold">{t('Audio')}</h3>
      <div>
        <SoundControl
          id="placement-volume"
          title={t('Tile sounds')}
          description={t('Enable or mute all tile sounds and adjust their shared volume.')}
          enabled={enabled}
          volume={volume}
          onToggle={() => setEnabled(!enabled)}
          onVolume={setVolume}
        />
        <button
          type="button"
          onClick={() => void preview()}
          disabled={!enabled || sound === 'none' || volume === 0}
          className="mt-3 rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-paper transition hover:bg-moss-deep disabled:cursor-default disabled:opacity-40"
        >
          {t('Preview sound')}
        </button>
        {audioUnavailable && (
          <p role="status" className="mt-2 text-xs text-clay">
            {t('Audio is unavailable. Try previewing again.')}
          </p>
        )}
      </div>
      <SoundControl
        id="background-music"
        title={t('Background music')}
        description={t(
          'Menu: Jazz at Dizzy’s. Game and pause: Relaxing Krishna Flute. New games from pause keep the music playing.',
        )}
        enabled={musicEnabled}
        volume={musicVolume}
        onToggle={() => setMusicEnabled(!musicEnabled)}
        onVolume={setMusicVolume}
      />
      <SoundControl
        id="menu-sound"
        title={t('Menu navigation')}
        description={t('A soft, low click when you hover or focus another menu option.')}
        enabled={menuSoundEnabled}
        volume={menuSoundVolume}
        onToggle={() => setMenuSoundEnabled(!menuSoundEnabled)}
        onVolume={setMenuSoundVolume}
      />
      <SoundControl
        id="clock-sound"
        title={t('Time-attack clock')}
        description={t(
          'Fast ticking when 15 seconds or less remain. Stops during pauses, after a time bonus and at game over.',
        )}
        enabled={clockSoundEnabled}
        volume={clockSoundVolume}
        onToggle={() => setClockSoundEnabled(!clockSoundEnabled)}
        onVolume={setClockSoundVolume}
      />
      <SoundControl
        id="game-alerts"
        title={t('Game alerts')}
        description={t(
          'End-of-game sound, record celebration and a brief beep for each of the last five tiles.',
        )}
        enabled={feedbackSoundEnabled}
        volume={feedbackSoundVolume}
        onToggle={() => setFeedbackSoundEnabled(!feedbackSoundEnabled)}
        onVolume={setFeedbackSoundVolume}
      />
    </section>
  )
}

export function SoundControl({
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
  const { t } = useTranslation()

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
          {enabled ? t('On') : t('Off')}
        </button>
      </div>
      <p className="mt-1 text-xs text-ink/60">{description}</p>
      <label htmlFor={id} className="mt-3 flex items-center justify-between text-sm">
        {t('Volume')}
        <span className="text-ink/60 tabular-nums">{Math.round(volume * 100)}%</span>
      </label>
      <input
        id={id}
        aria-label={t('{title} volume', { title })}
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
