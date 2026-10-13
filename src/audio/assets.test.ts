/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PLACEMENT_SOUNDS } from '../customization'
import { MUSIC_FILES } from './musicTracks'

describe('bundled placement clips', () => {
  it.each([
    ...PLACEMENT_SOUNDS.filter((sound) => sound.id !== 'none'),
    { id: 'menu-nav', label: 'Menu navigation' },
  ])('ships a short complete Vorbis clip for $label', ({ id }) => {
    const data = readFileSync(`static/audio/${id}.ogg`)
    const rate = data.readUInt32LE(data.indexOf(Buffer.from('vorbis')) + 11)
    let cursor = 0
    let samples = 0n
    while (cursor < data.length) {
      expect(data.toString('ascii', cursor, cursor + 4)).toBe('OggS')
      const segments = data[cursor + 26]!
      samples = data.readBigUInt64LE(cursor + 6)
      let body = 0
      for (let i = 0; i < segments; i++) body += data[cursor + 27 + i]!
      cursor += 27 + segments + body
    }
    expect(cursor).toBe(data.length)
    expect(rate).toBeGreaterThan(0)
    expect(Number(samples) / rate).toBeGreaterThan(0)
    expect(Number(samples) / rate).toBeLessThan(1)
  })
  it.each(Object.values(MUSIC_FILES))(
    'bundles the supplied MP3 music %s with an MPEG frame header',
    (file) => {
      const data = readFileSync(`static/audio/${file}`)
      expect(data.length).toBeGreaterThan(100000)
      expect(data[0]).toBe(0xff)
      expect(data[1]! & 0xe0).toBe(0xe0)
    },
  )
})
