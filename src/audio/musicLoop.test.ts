import { describe, expect, it } from 'vitest'
import { seamlessLoop } from './musicLoop'

function buffer(channels: Float32Array[], sampleRate: number): AudioBuffer {
  return {
    length: channels[0]!.length,
    sampleRate,
    numberOfChannels: channels.length,
    getChannelData: (channel: number) => channels[channel]!,
  } as AudioBuffer
}

describe('music loop boundary', () => {
  it('removes the abrupt seam on both stereo channels without silence or altering the original', () => {
    const channels = [
      Float32Array.from({ length: 1000 }, (_, i) => Math.sin(i * 0.03)),
      Float32Array.from({ length: 1000 }, (_, i) => Math.cos(i * 0.03)),
    ]
    const untouched = channels.map((channel) => new Float32Array(channel))
    const original = buffer(channels, 1000)
    const ctx = {
      createBuffer: (count: number, length: number, rate: number) =>
        buffer(
          Array.from({ length: count }, () => new Float32Array(length)),
          rate,
        ),
    } as AudioContext
    const loop = seamlessLoop(ctx, original)
    expect(loop.length).toBe(960)
    expect(loop.sampleRate).toBe(original.sampleRate)
    expect(loop.numberOfChannels).toBe(2)
    for (let channel = 0; channel < 2; channel++) {
      const output = loop.getChannelData(channel)
      expect(Math.abs(output[0]! - output[output.length - 1]!)).toBeLessThan(0.04)
      expect(Math.max(...output.map(Math.abs))).toBeLessThanOrEqual(1)
      expect(channels[channel]).toEqual(untouched[channel])
    }
  })
})
