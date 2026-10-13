/** Original mechanical tick/tock: four soft, alternating clicks per second. */
export function synthesizeClockTick(sampleRate: number): Float32Array {
  const samples = new Float32Array(Math.round(sampleRate * 0.5))
  let seed = 13,
    low = 0
  for (let i = 0; i < samples.length; i++) {
    const time = i / sampleRate
    const tick = time < 0.25 ? 0 : 1
    const local = time - tick * 0.25
    if (local >= 0.06) continue
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const noise = (seed / 2 ** 32) * 2 - 1
    low += (1 - Math.exp((-2 * Math.PI * 1400) / sampleRate)) * (noise - low)
    const envelope =
      Math.min(1, local / 0.002) * Math.exp(-85 * local) * Math.min(1, (0.06 - local) / 0.01)
    const frequency = tick === 0 ? 720 : 950
    samples[i] = envelope * (0.28 * Math.sin(2 * Math.PI * frequency * local) + 0.2 * low)
  }
  samples[0] = 0
  samples[samples.length - 1] = 0
  return samples
}
