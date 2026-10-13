export const GAME_CUES = ['cue-game-over', 'cue-record', 'cue-supply'] as const
export type GameCue = (typeof GAME_CUES)[number]

/** Original end motif, victory arpeggio and very short electronic double beep. */
export function synthesizeGameCue(cue: GameCue, sampleRate: number): Float32Array {
  const duration = cue === 'cue-supply' ? 0.16 : cue === 'cue-record' ? 0.8 : 0.65
  const samples = new Float32Array(Math.ceil(duration * sampleRate))
  const notes = cue === 'cue-record' ? [523.25, 659.25, 783.99, 1046.5] : [392, 293.66, 196]
  const step = cue === 'cue-record' ? 0.14 : 0.16
  for (let i = 0; i < samples.length; i++) {
    const time = i / sampleRate
    let value = 0
    if (cue === 'cue-supply') {
      const note = time < 0.08 ? 0 : 1
      const local = time - note * 0.08
      if (local < 0.06) {
        const envelope = Math.min(1, local / 0.008) * Math.min(1, (0.06 - local) / 0.02)
        const phase = 2 * Math.PI * (note === 0 ? 180 : 140) * local
        value = Math.sin(phase) * 0.22 * envelope
      }
    } else {
      notes.forEach((frequency, note) => {
        const local = time - note * step
        if (local >= 0)
          value +=
            Math.sin(2 * Math.PI * frequency * local) *
            Math.min(1, local / 0.008) *
            Math.exp(-8 * local) *
            0.24
      })
      value *= Math.min(1, (duration - time) / 0.04)
    }
    samples[i] = Math.max(-0.8, Math.min(0.8, value))
  }
  samples[0] = 0
  samples[samples.length - 1] = 0
  return samples
}
