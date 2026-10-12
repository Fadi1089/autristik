/** Blend the tail into the head over 40 ms to avoid a click at the native loop boundary. */
export function seamlessLoop(ctx: AudioContext, original: AudioBuffer): AudioBuffer {
  const fade = Math.min(Math.round(original.sampleRate * 0.04), Math.floor(original.length / 4))
  if (fade < 2) return original
  const length = original.length - fade
  const loop = ctx.createBuffer(original.numberOfChannels, length, original.sampleRate)
  for (let channel = 0; channel < original.numberOfChannels; channel++) {
    const input = original.getChannelData(channel)
    const output = loop.getChannelData(channel)
    output.set(input.subarray(fade))
    for (let i = 0; i < fade; i++) {
      const amount = i / (fade - 1)
      const at = length - fade + i
      output[at] = output[at]! * (1 - amount) + input[i]! * amount
    }
  }
  return loop
}
