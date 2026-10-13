import { describe, expect, it } from 'vitest'
import { createFallingGame } from '../game/falling'
import { gameCueEvent } from './gameCueEvents'
import { GAME_CUES, synthesizeGameCue } from './gameCueSounds'

function playing() {
  return { ...createFallingGame(42), started: true, menuOpen: false, runId: 1, bestAtStart: 100 }
}

describe('record, loss and low-supply events', () => {
  it('stays quiet when crossing a record during play and celebrates only at the end', () => {
    const before = { ...playing(), score: 99 }
    const record = { ...before, score: 105 }
    expect(gameCueEvent(record, before)).toBeNull()
    expect(gameCueEvent({ ...record, score: 120 }, record)).toBeNull()
    expect(gameCueEvent({ ...record, current: null }, record)).toBe('cue-record')
    expect(gameCueEvent({ ...before, score: 100, current: null }, before)).toBe('cue-game-over')
    expect(gameCueEvent({ ...before, score: 100 }, before)).toBeNull()
    expect(
      gameCueEvent({ ...record, bestAtStart: null }, { ...before, bestAtStart: null }),
    ).toBeNull()
  })

  it('announces game over from either deadline or empty supply, with a celebratory last-move record', () => {
    const before = playing()
    const ended = { ...before, current: null, remaining: 0 }
    expect(gameCueEvent(ended, before)).toBe('cue-game-over')
    expect(gameCueEvent(ended, ended)).toBeNull()
    expect(gameCueEvent({ ...ended, score: 110 }, before)).toBe('cue-record')
    const timed = { ...before, variant: 'time-attack' as const, timeRemaining: 1 }
    expect(gameCueEvent({ ...timed, timeRemaining: 0, current: null }, timed)).toBe('cue-game-over')
  })

  it('beeps at each decrease from five to one tiles, but never on clock ticks, exchanges or refills', () => {
    for (const remaining of [5, 4, 3, 2, 1]) {
      const before = { ...playing(), remaining: remaining + 1 }
      const after = { ...before, remaining, placements: 1 }
      expect(gameCueEvent(after, before)).toBe('cue-supply')
      const clockTick = { ...after, fallElapsed: 0.5 }
      expect(gameCueEvent(clockTick, after)).toBeNull()
    }
    const before = { ...playing(), remaining: 5 }
    expect(gameCueEvent({ ...before, placements: 1, remaining: 30 }, before)).toBeNull()
    expect(gameCueEvent({ ...before, remaining: 4 }, before)).toBeNull()
    expect(gameCueEvent({ ...before, placements: 1, remaining: 6 }, before)).toBeNull()
    expect(gameCueEvent({ ...before, placements: 1, remaining: Infinity }, before)).toBeNull()
  })

  it('does not play feedback during pause, restart or first Play', () => {
    const before = playing()
    for (const override of [{ menuOpen: true }, { started: false }, { runId: 2 }])
      expect(gameCueEvent({ ...before, ...override, current: null, score: 120 }, before)).toBeNull()
    expect(gameCueEvent({ ...before, score: 120 }, { ...before, menuOpen: true })).toBeNull()
  })
})

describe('distinct original alert sounds', () => {
  it('keeps the supply alert bass-heavy and quieter, without sharp harmonics', () => {
    const rate = 48000
    const sound = synthesizeGameCue('cue-supply', rate)
    expect(sound.every((value) => Math.abs(value) <= 0.23)).toBe(true)
    for (const start of [0.01, 0.09]) {
      let crossings = 0
      for (let i = Math.floor(start * rate); i < Math.floor((start + 0.04) * rate); i++)
        if (sound[i]! < 0 && sound[i + 1]! >= 0) crossings++
      expect(crossings).toBeGreaterThan(3)
      expect(crossings).toBeLessThan(12)
    }
  })

  it.each(GAME_CUES)('synthesizes a finite, unclipped %s effect with silent endpoints', (cue) => {
    for (const rate of [22050, 48000]) {
      const sound = synthesizeGameCue(cue, rate)
      expect(sound.every((value) => Number.isFinite(value) && Math.abs(value) < 1)).toBe(true)
      expect(sound.some((value) => Math.abs(value) > 0.1)).toBe(true)
      expect(sound[0]).toBe(0)
      expect(sound.at(-1)).toBe(0)
      expect(sound.length / rate).toBeLessThan(1)
      if (cue === 'cue-supply') expect(sound.length / rate).toBeLessThan(0.2)
    }
  })
})
