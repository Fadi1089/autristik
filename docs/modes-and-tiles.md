# Scoring, game modes and special tiles

[← Back to README](../README.md)

## Scoring

### Placement rewards

| Placement                                               | Reward               |
| ------------------------------------------------------- | -------------------- |
| Each matching square along a seam                       | +5 points            |
| Harmonious: every touching side fully matches, 2+ sides | +1 tile              |
| Perfect: all four sides occupied and fully matching     | +30 points, +2 tiles |

A side counts as matching only when both of its squares match. Mismatches cost nothing.

### Combos

A placement with at least one fully matching side and no mismatched contacts increases the
multiplier by 0.25. It starts at ×1, so the first success earns ×1.25, followed by ×1.5, ×1.75,
×2, ×2.25, ×2.5, ×2.75 and ×3 (the cap).

- Any mismatched touching side resets it to ×1 for that placement, even if another side fully matches.
- Empty sides do not break the combo.
- In Superblock, bedrock placements and bedrock contacts are neutral for the streak.
- Only the new tile's points, including its perfect-placement point bonus, are multiplied; existing
  score and bonus tiles are unchanged. Fractional points are retained.
- The combo survives level changes and pauses, and resets on a new game.

### Levels

Each level has a points goal with no time limit. Reaching it starts the next level at once, on the
same board, with 6 extra tiles. Points toward the goal start from zero each level; the total score
keeps adding up.

| Level | Goal              |
| ----- | ----------------- |
| 1     | 75                |
| 2     | 125               |
| 3     | 175               |
| n     | 75 + 50 × (n − 1) |

- In Standard, the game ends only when the stack (30 tiles to start) is empty. There is no countdown
  or duration-based game over.
- The menu pauses automatic falling.
- The top-right stopwatch shows active play time, pauses with the menu, stops at game over, and
  resets on a new game; it has no effect on the end of a game.
- The level goals live in `src/game/levels.ts`.
- The Tetris comparisons, curve and supply/duration estimates are documented in
  [docs/equilibrage-cadence.md](equilibrage-cadence.md). Estimates are calibration
  assumptions, not measurements; the original 30 tiles, +6 per level and score goals are preserved.

## Game modes and records

Gamemode, format and difficulty are independent, and are available in both the main and pause menus.
Selections apply to the first Play or the next New game; resuming never changes an active game's
mode, draws, format or difficulty.

### Gamemode: Classique / Superblock

| Gamemode       | Contents                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Classique**  | Ordinary terrain tiles only: no gold joker, void, bedrock or per-tile multipliers. Combos, level goals, supply rewards and difficulty still apply. |
| **Superblock** | Keeps all [special tiles](#special-tiles-superblock). Selected by default to preserve the existing gameplay.                                       |

Each choice has a small **Infos** tab with three short points. The current mode is shown in the
pause menu and final score summary.

### Format: Standard / Time-attack

The same Gamemode panel offers the **Standard** / **Time-attack** format choice, compatible with
both Classique and Superblock.

**Time-attack rules**

- Starts with 30 tiles and 45 seconds of active play.
- Each placement consumes a tile, including special tiles; harmonious and perfect placements do not
  replenish the supply in this format.
- Every completed level resets the supply to exactly 30 tiles (unused tiles do not carry over) and
  adds exactly 45 seconds. A level-up on the last tile still refills the reserve.
- If the supply runs out before reaching the goal, the game ends immediately, even if time remains.
- The tray displays the remaining tiles normally. Score goals still rise by level.
- Gravity is fixed at 1.5 seconds per square (15 seconds for a full approach), irrespective of
  level or difficulty; the difficulty selector shows the fixed speed instead.
- The top-right card displays time remaining and elapsed play time.
- At zero, the game ends with a time-expired result; a simultaneous gravity placement cannot rescue it.
- Paused menus and hidden tabs freeze both clocks. Visible delayed ticks consume the full elapsed
  time, so browser stalls do not prolong the deadline.

**Clock sound and colour**

- At 15 seconds remaining or less, a fast watch tick/tock loop plays (four clicks per second), and
  the countdown turns red at the same threshold.
- It stops on pause, a hidden tab, game over (time or supply), or a level bonus that moves the
  countdown above the threshold.
- The native Web Audio loop uses a locally synthesized and cached sound, waits for user input to
  enable audio, and never overlaps itself.
- Settings > Audio provides an independent switch and volume (25% by default), so turning music off
  does not mute the clock.

### Difficulty

The compact Difficulty selector at the bottom of Gamemode changes only the starting cadence:

| Difficulty | Starting cadence (per tile) | Behaviour                                |
| ---------- | --------------------------- | ---------------------------------------- |
| Easy       | Exactly 15 s                | Accelerates gently with each score level |
| Medium     | 10 s                        | Accelerates gently with each score level |
| Hard       | 7.5 s                       | Accelerates gently with each score level |
| Insane     | 5 s (the minimum)           | Stays at the speed cap                   |

- Standard games start at score level 1 with 30 tiles and the same goals and rewards.
- Changing the selector during a pause affects the next new game, not the game being resumed.
- In both menus, Difficulty sits at the bottom of Gamemode, after the tile sets.

### Records

- Best scores are saved locally in `autristik:records` for four separate combinations:
  Standard/Classique, Standard/Superblock, Time-attack/Classique and Time-attack/Superblock.
- The Gamemode cards show the best score for the selected format.
- Improvements are saved live, so closing the tab or restarting preserves them.
- The final screen shows the best, a new-record or tie message, or the point difference from the
  best score before that run.
- Difficulty does not create additional record categories.
- Scores are kept on this browser/device; clearing browser storage removes them.
- Fractional scores are preserved, and invalid saved entries are ignored.
- The audio controls and record feedback are available in both languages.

**Alerts**

- Limited tile supplies turn red at five tiles or fewer, and each decrease to 5, 4, 3, 2 or 1 plays
  a brief electronic double beep distinct from placement sounds. Replenishing the supply clears the alert.
- Crossing a previous record during play stays silent.
- At game over, exceeding the previous record plays the victory cue; otherwise a descending loss cue plays.
- These one-shot cues share an independent **Game alerts** switch and volume (35% by default) in
  Settings > Audio. Pausing, hiding the tab and restarting cancel pending cues.

## Special tiles (Superblock)

Special tiles are whole blocks available in **Superblock**. They enter the same seeded supply, never
the initial island.

| Tile          | Appearance                                          | Effect                                                                                   | Draw chance            |
| ------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| Golden joker  | Gold with surface glints                            | Matches every ordinary terrain; bedrock blocks it                                        | 5%                     |
| Void          | Slowly revolving dark violet nebula                 | Clears the eight surrounding cells (diagonals included), except bedrock, then disappears | 3% after 10 placements |
| Bedrock       | Mottled grey stone                                  | Indestructible; never matches, even with another bedrock or a joker                      | 4%                     |
| Bronze bonus  | Brown metallic base/frame, ordinary terrain patches | ×2 points for this tile                                                                  | 6%                     |
| Silver bonus  | Silver base/frame, ordinary terrain patches         | ×3 points for this tile                                                                  | 3%                     |
| Diamond bonus | Diamond-blue base/frame, ordinary terrain patches   | ×5 points for this tile                                                                  | 1%                     |

### Golden joker

- Matches regular terrain on all four sides, both when being placed and when ordinary tiles are
  later placed beside it. Same points, combos and harmonious/perfect bonuses as normal matches.
- A whole joker has a 5% chance on each supply draw; the starting island uses regular terrain only.
- A single gold top, gold base, metallic finish and small twinkling surface flecks identify it on
  the board, moving/landing projections and both tray previews.
- All tiles keep a square footprint with slightly rounded edges, including the smaller supply sheets.
- The next-tile preview includes jokers and never consumes a draw.
- Gold jokers can also carry bronze ×2, silver ×3 or diamond-blue ×5 bonuses, identified by their
  frame and tray badge. Within the 5% joker draws, those bonuses occur with probabilities 6%, 3% and
  1%; the remaining 90% are ordinary ×1 gold jokers.

### Void

- Unavailable until 10 successful placements; the initial five island tiles, rotations and invalid
  moves do not count. Destruction never reduces that counter, and a restart resets it.
- The next preview uses the current completed placement count, because it can immediately be
  exchanged into the hand; neither tile can introduce void before the 10th completed placement.
- Ordinary tiles make up 81% before unlocking and 78% afterwards.
- Void destruction is previewed in violet before landing and marked with a short purple pulse.
- Earns no points and resets the combo.
- Destruction never subtracts previously earned points or refunds the removed tiles.
- If the island is emptied, a standard tile immediately replaces the void at its placement cell. It
  has no multiplier, grants no points or bonus tiles and does not consume another supply tile or
  count as another placement. The next draw remains exactly the one shown in the tray.

### Bedrock

- Earns no points and leaves the combo unchanged.
- Contacts with bedrock also leave the streak unaffected, while ordinary mismatched contacts still
  reset it.

### Bonus tiles (bronze, silver, diamond)

- Bonus frames preserve the matching terrain colours.
- The multiplier applies after the combo, including perfect-placement points, but never to bonus
  supply tiles or points already earned.
- In Superblock, an incoming normal tile or gold joker scores with the strongest bonus among its own
  multiplier and its four edge neighbours. Diagonal and distant tiles do not transmit it; void and
  bedrock do not grant or receive bonuses.
- Ordinary draws start at ×1; gold draws can be ×1, ×2, ×3 or ×5.
- Bonuses are not multiplied together: touching ×2 and ×3 yields ×3, and an intrinsic ×5 stays ×5.
- Neighbour bonuses affect only the placement score. The new tile retains its intrinsic multiplier
  and does not propagate received bonuses. Existing neighbours and previously earned points remain
  unchanged; Classique stays ×1.
- The moving ghost, landing projection and tray show the tile's own bonus, using the corresponding
  bronze, silver or diamond frame.
