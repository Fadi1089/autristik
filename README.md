<h1 align="center">Autristik</h1>

<p align="center">
  <img src="src/assets/menu-village.webp" alt="A small village of tiles: fields, a pond with a waterfall, pine trees and a lookout tower" width="360">
</p>

<p align="center">
  <strong><a href="https://autristic.pages.unistra.fr/autristik/">Try it out in your browser!</a></strong>, no install needed.
</p>

A falling tile game combining Tetris-style automatic movement with Dorfromantik terrain
matching. Guide square tiles sideways and rotate them as they fall towards the board.
Each tile is split into four terrain squares; matching squares across a seam score points.

Built with Vite, React, TypeScript, Three.js (via @react-three/fiber and drei), Zustand and
Tailwind CSS v4. It deploys to GitLab Pages.

## How to play

Each tile is a 2×2 grid of terrain squares (meadow, forest, field, water or village). Tiles sit
flush, so where two tiles meet, each square on one side faces one square on the other.

- The game opens on the menu. Press Play (or `Enter`, or `Esc`) to start. `Esc` or the button in the top
  left brings the menu back and pauses the game.
  In both menus, How to play has collapsible Rules and Controls sections, plus Tile types
  when Superblock is selected. The sections start closed. Controls use the player's current
  bindings and keyboard layout. Main menu focus is shown by colour and the four-square marker,
  without a green outline.
  Only one main option is highlighted; pointer hover and keyboard focus update that selection.
  Up/Down cycle through the large entries. Difficulty sits beside the new-game action;
  Right enters it and Left returns. Right/Left also enter and leave an open side panel.
- Customization is available in both the starting and pause menus. Light preserves the original
  appearance; Dark changes the sky, ground, lighting, menus and HUD while keeping the terrain
  colours. The theme applies immediately and is saved locally.
  Choose Wood, Button, Laser, Water drop (default), Steel, Glass or Silent for standard tile sounds.
  Selecting a clip previews it. Settings > Audio contains Preview sound, volumes and On/Off controls.
  Successful manual and automatic standard placements play the selected sound, including the last tile.
  All tile effects share one saved On/Off switch and volume slider, defaulting to 30%.
  Movement, rotation, restarting and opening menus stay silent. Clips are bundled locally and
  audio is unlocked by a user gesture. Sources and CC0 license notices live in
  [static/audio/CREDITS.md](static/audio/CREDITS.md).
  Menu navigation has a separate soft, low click for pointer hover and keyboard focus changes,
  with a lower pitch, reduced treble and a rounded attack/release envelope,
  with no duplicate cue when the same button remains selected. The owner-supplied MP3s are
  `static/audio/menu-jazz.mp3` (Jazz at Dizzy's) for the main menu and
  `static/audio/game-flute.mp3` (Relaxing Krishna Flute) for play and pause. Only a change
  between these contexts replaces the player: pausing, resuming and restarting from pause
  preserve the same track and playhead. HTML audio streams the long tracks with native looping;
  Native audio controls volume without decoding entire tracks into memory.
  Music becomes silent while the tab is hidden. Music and menu cues each have an
  independent On/Off switch and saved volume under Settings > Audio.
  The menu cue defaults to 8% (about 68% quieter than its former 25% setting); existing default
  settings are upgraded, while customized volumes and mute choices are preserved. Music attempts
  playback as soon as the app opens; if browser autoplay rules block it, any click or key press retries.
  Navigate its buttons with arrows or the bound movement keys (WASD / ZQSD by default),
  including the Settings panel; `Enter` or `Space` activates the focused button.
- Move sideways around the stack to change the arrival side automatically. If the next lane
  has no tile ahead in the current fall direction, the falling tile rounds the edge and heads
  towards the stack from that side: moving off the right edge makes it fall right-to-left,
  off the left edge left-to-right, and similarly for the top and bottom. The remaining
  distance and fall cadence are preserved. Lateral movement follows the outer surface of
  each lane: taller stacks raise the tile and shorter stacks lower it without adding fall time.
- A transparent tile moves towards the stack automatically, one square every 1.5 seconds at level 1 on Easy.
  Each level gently shortens the interval: `0.45 + 1.05 × 0.93^(level - 1)` seconds per square.
  A fresh ten-step approach takes 15 s at level 1, about 12.4 s at level 5, 10 s at level 10
  and 7.1 s at level 20, gradually approaching a 4.5 s minimum. The new speed applies to the
  next tile after a level-up; manual side changes retain the elapsed cadence.
  It locks when the next square is occupied, scores normally, and the next tile starts another
  fall. Side contacts do not stop the fall. A fainter landing projection shows its destination.
- The compact Difficulty selector beside Play / New game changes only the starting cadence:
  Easy starts at 15 s per tile, Medium at about 10 s (Easy level 10), Hard at about 7.1 s
  (Easy level 20), and Insane at the 4.5 s minimum. Medium and Hard continue to accelerate
  gently with each score level; Insane stays at the speed cap. Standard games start at score level 1
  with 30 tiles and the same goals and rewards. Changing the selector during a pause affects
  the next new game, not the game being resumed.
- The next tile starts ten squares from the outermost occupied tile in its lane, on the same column for
  vertical gravity or the same row for horizontal gravity. It keeps the current arrival side.
- Arrows / WASD follow the camera orientation. The key pointing
  towards the stack advances exactly one square immediately and resets the fall cadence;
  holding it repeats. Perpendicular keys move sideways; the key away from the stack does
  nothing. Click or tap the ground to select a perpendicular lane. Crossing an unsupported
  lane turns around the edge once; the tile stays outside the stack's surface.
- `Space` or `Enter` immediately places the tile against the first obstacle in the selected
  lane, scores it and draws the next tile. It never passes through an occupied square.
- Hold `Shift` with any bound movement key to choose the arrival side, relative to the
  camera: `Shift` + right makes the tile fall right-to-left, left makes it fall left-to-right,
  up makes it fall top-to-bottom, and down makes it fall bottom-to-top.
  This preserves the remaining distance and cadence and uses the projected placement's
  row/column for the new lane. If that lane has no obstacle, the adjacent lane containing
  the previously targeted stack tile is used. The camera stays in place while the tile is visible.
  Repeated key events do not advance the tile.
- Once void destruction separates islands, Shift + a direction first approaches that side
  of the currently selected island. Pressing it again visits the next island in that direction
  from its near edge. For example, Shift + down selects the bottom of island 1 (upward fall),
  then the top of island 2 (downward fall), then island 2's bottom. The same works left,
  right and up, including bound AZERTY / QWERTY movement keys and camera-relative controls.
  Remaining approach distance and cadence are preserved. Lateral movement, gravity and
  respawning stay on the selected island; the floating ghost may travel over other islands
  without stopping on them. Holding Shift + a key does not skip islands.
- A lateral input first tries the adjacent empty cell at the falling tile's current depth.
  Only a cell bordered by placed tiles on exactly three of its four faces allows insertion.
  If it touches the selected island, the tile slides into that pocket without restarting its clock
  and locks at the next gravity step, even under an overhang. Rotation and exchanging tiles
  remain possible before locking; Enter/Space places it there immediately. Otherwise movement
  follows lane relief as before. This applies in all four directions and both game modes.
  The moving ghost is 80% opaque so its terrain colours remain readable.
- The camera follows successful manual lateral movements smoothly. Automatic falling,
  locking and spawning leave it in place while the falling tile stays on screen.
  If the tile leaves the frame, the camera smoothly recenters on the tile, its landing
  projection and the neighbouring island edge, keeping its orientation and zooming out
  only if needed. `C` or `!` requests the same framing on demand.
  You can still pan, pivot and zoom; automatic reframing waits until a mouse gesture ends.
- The landing projection no longer reveals matching or mismatching sides with green/red dots.
  Cyan outlines the moving tile and pale gold outlines its final destination, with a dark
  backing for contrast on both themes. Ghosts and their borders remain visible over other islands.
  The combo multiplier is displayed in the score card in the top-left corner.
  There is no direction panel.
- The `?` tab at the bottom-left edge slides out the terrain legend and key list when
  you hover the tab itself (tap it on touch screens). The rest of the screen edge does not
  trigger it. Keyboard focus can also open it, and its contents stay accessible while open.
- `E` or `Page Down` rotates the tile clockwise, `Q` (QWERTY) / `A` (AZERTY) or `Page Up` anticlockwise.
  The right-hand vertical tray shows the current tile larger at the top and the actual next tile
  smaller directly below, with Current/Next labels (localized) and a short separator between them.
  The tile count sits below a wider horizontal separator. Clicking the current tile
  rotates it anticlockwise on its left half, clockwise on its right half. Keyboard activation
  of that preview remains clockwise. Click the next tile, or press `F` / `ù` on AZERTY (`F` / `'` on QWERTY),
  to swap the two tiles as often as desired. Each tile keeps its own rotation and multiplier.
  Swapping costs no tiles or points and preserves the fall position and elapsed cadence.
  Both previews follow the main camera's angle; looking at the next tile does not consume the
  random sequence, and repeated swaps never reroll it. The next slot is empty when only
  one tile remains in the supply. The rotation arrow buttons are removed.

The game is fully playable with the keyboard alone. Default keys:

| Key                       | Action                                                        |
| ------------------------- | ------------------------------------------------------------- |
| Arrows or `W` `A` `S` `D` | Move sideways / advance towards stack, relative to the camera |
| `Shift` + movement key    | Choose arrival side, relative to the camera                   |
| `Space` / `Enter`         | Place immediately against the first obstacle                  |
| `F` / `ù` (AZERTY)        | Swap current / next tile (`F` / `'` on QWERTY)                |
| `E` / `Page Down`         | Rotate clockwise                                              |
| `Q` / `Page Up`           | Rotate anticlockwise (QWERTY; `A` on AZERTY)                  |
| `Z` or `,` / `X` or `.`   | Next aligned camera side, left / right (90°; QWERTY)          |
| `=` / `-`                 | Zoom                                                          |
| `C` / `!`                 | Recenter on the falling tile and the island edge              |
| `Esc`                     | Menu (always, can't be rebound)                               |

French and English are available throughout the main and pause menus, tutorial, mode information,
customization, HUD, tooltips and game-over screen. On first launch, the first supported browser
language preference is selected (`fr-*` → French, `en-*` → English; otherwise English).
Menu > Settings > Language lets players switch immediately, and saves the choice on this device.
Existing preferences are retained when the language setting is first added. Score decimal separators
and key names follow the language; keyboard layout and physical bindings remain independent.
The title **Autristik** stays unchanged. Translations are centralized and typed in `src/i18n/`.

Choose AZERTY or QWERTY under Menu > Settings > Keyboard layout. The selection is saved and
updates key labels throughout the interface. Keys are matched by physical position, so movement
uses `Z` `Q` `S` `D` on AZERTY and `W` `A` `S` `D` on QWERTY; switching layouts preserves custom bindings. Active controls except
`Esc` and the two recenter shortcuts can be changed under Menu > Settings (two keys per action, saved in the browser).
All four movement actions and immediate placement are configurable under Settings.
The movement mapping adapts when the camera has pivoted; arrival sides change through movement
or `Shift` + a movement key (including custom bindings and AZERTY / QWERTY).
Camera pivot uses `W` or `;` to turn left and `X` or `:` to turn right on AZERTY
(`Z` or `,` / `X` or `.` on QWERTY). These secondary defaults are added to existing
settings without replacing custom camera bindings or keys assigned to other actions. Each press moves to
the next of the four grid-aligned views, left or right, with a smooth transition.
From a freely rotated camera, it selects the next aligned view in that direction.
Holding a pivot key does not skip sides; successive presses queue correctly during a turn.
Mouse and touchpad rotation remains free.

Mouse and touchpad:

| Input                                   | Action                  |
| --------------------------------------- | ----------------------- |
| Click / tap                             | Choose a landing lane   |
| Click / tap the next tray tile          | Swap current / next     |
| Left-drag, one finger                   | Pan                     |
| Scroll wheel, pinch                     | Zoom                    |
| Sideways touchpad scroll, Shift + wheel | Pivot around the board  |
| Right-drag                              | Tilt (limited) and turn |

Scoring:

Golden joker tiles match regular terrain on all four sides, both when being placed and
when ordinary tiles are later placed beside them. They use the same points, combos and
harmonious/perfect bonuses as normal matches. A whole joker has a 5% chance on each supply
draw; the starting island still uses regular terrain only. A single gold top, gold base,
metallic finish and small twinkling surface flecks identify it on the board,
moving/landing projections and both tray previews. All tiles keep a square footprint
with slightly rounded edges, including the smaller supply sheets.
The next-tile preview includes jokers and never consumes a draw. Gold jokers can also carry
bronze ×2, silver ×3 or diamond-blue ×5 bonuses, identified by their frame and tray badge.
Within the 5% joker draws, those bonuses occur with probabilities 6%, 3% and 1% respectively;
the remaining 90% are ordinary ×1 gold jokers.

Gamemode is available in the main and pause menus. Select **Classique** for ordinary terrain
tiles only, with no gold joker, void, bedrock or per-tile multipliers; combos, level goals,
supply rewards and difficulty still apply. **Superblock** keeps all special tiles described
below. Each choice has a small **Infos** tab with three short points. The selection applies
to first Play or the next New game; resuming never changes an active game's mode or draws.
Superblock is initially selected to preserve the existing gameplay. Mode and difficulty
are independent. The current mode is shown in the pause menu and final score summary.

The same Gamemode panel offers the independent **Standard** / **Time-attack** format choice,
compatible with both Classique and Superblock. Time-attack starts with 30 tiles and 45 seconds
of active play. Each placement consumes a tile, including special tiles; harmonious and perfect
placements do not replenish the supply in this format. Every completed level resets the supply
to exactly 30 tiles (unused tiles do not carry over) and adds exactly 45 seconds. A level-up on
the last tile still refills the reserve. If the supply runs out before reaching the goal, the
game ends immediately, even if time remains. The tray displays the remaining tiles normally.
The score goals still rise by level. Gravity is fixed at 1.5 seconds per square (15 seconds for
a full approach), irrespective of level or difficulty; its difficulty selector shows the fixed
speed instead. The top-right card displays time remaining and elapsed play time. At zero,
the game ends with a time-expired result; a simultaneous gravity placement cannot rescue it.
Paused menus and hidden tabs freeze both clocks. Visible delayed ticks consume the full elapsed
time, so browser stalls do not prolong the deadline. Choosing another format during pause applies
only to the next New game; resuming preserves the active challenge, supply and countdown.

At 15 seconds remaining or less, Time-attack plays a fast watch tick/tock loop (four clicks
per second). It stops on pause, a hidden tab, game over (time or supply), or a level bonus
that moves the countdown above the threshold. The native Web Audio loop uses a locally
synthesized and cached sound, waits for user input to enable audio, and never overlaps itself.
Settings > Audio provides an independent switch and volume (25% by default),
so turning music off does not mute the clock.

Best scores are saved locally in `autristik:records` for four separate combinations:
Standard/Classique, Standard/Superblock, Time-attack/Classique and Time-attack/Superblock.
The Gamemode cards show the best score for the selected format. Improvements are saved live,
so closing the tab or restarting preserves them. The final screen shows the best, a new-record
or tie message, or the point difference from the best score before that run. Difficulty does
not create additional record categories. Scores are kept on this browser/device; clearing
browser storage removes them. Fractional scores are preserved, and invalid saved entries
are ignored. The audio controls and record feedback are available in both languages.

Each new run resets the camera to the central island, with a fitted zoom that includes the
approaching tile. This also works after restarting with the same seed, without reframing an
ordinary pause/resume. Free camera movement remains available during play.

The Time-attack countdown turns red at the same 15-second threshold as its ticking sound.
Limited tile supplies turn red at five tiles or fewer, and each decrease to 5, 4, 3, 2 or 1
plays a brief electronic double beep distinct from placement sounds. Replenishing the supply
clears the alert. Crossing a previous record during play stays silent. At game over, exceeding
the previous record plays the victory cue; otherwise a descending loss cue plays. These
one-shot cues share an independent **Game alerts** switch and volume (35% by default) in
Settings > Audio. Pausing, hiding the tab and restarting cancel pending cues.

Menu panels are 29 rem wide on desktop. Fixed table columns, wrapping labels and shrinking grid
tracks keep settings within the panel; only vertical scrolling is available. Scrollbars use the
theme's paper and moss variables, with slim tracks and rounded thumbs in supported browsers.

Special tiles are whole blocks in **Superblock** and enter the same seeded supply, never the initial island:

| Tile          | Appearance                                          | Effect                                                                                   | Draw chance            |
| ------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| Golden joker  | Gold with surface glints                            | Matches every ordinary terrain; bedrock blocks it                                        | 5%                     |
| Void          | Slowly revolving dark violet nebula                 | Clears the eight surrounding cells (diagonals included), except bedrock, then disappears | 3% after 10 placements |
| Bedrock       | Mottled grey stone                                  | Indestructible; never matches, even with another bedrock or a joker                      | 4%                     |
| Bronze bonus  | Brown metallic base/frame, ordinary terrain patches | ×2 points for this tile                                                                  | 6%                     |
| Silver bonus  | Silver base/frame, ordinary terrain patches         | ×3 points for this tile                                                                  | 3%                     |
| Diamond bonus | Diamond-blue base/frame, ordinary terrain patches   | ×5 points for this tile                                                                  | 1%                     |

Void is unavailable until 10 successful placements; the initial five island tiles, rotations
and invalid moves do not count. Destruction never reduces that counter, and a restart resets
it. The next preview uses the current completed placement count, because it can immediately
be exchanged into the hand; neither tile can introduce void before the 10th completed placement.
Ordinary tiles make up 81% before unlocking and 78% afterwards.
Bonus frames preserve the matching terrain colours and
their multiplier applies after the combo, including perfect-placement points, but never to
bonus supply tiles or points already earned. In Superblock, an incoming normal tile or gold
joker scores with the strongest bonus among its own multiplier and its four edge neighbours.
Diagonal and distant tiles do not transmit it; void and bedrock do not grant or receive bonuses.
Ordinary draws start at ×1; gold draws can be ×1, ×2, ×3 or ×5. Bonuses are not multiplied
together: touching ×2 and ×3 yields ×3, and an intrinsic ×5 stays ×5. Neighbour bonuses affect
only the placement score. The new tile retains its intrinsic multiplier and does not propagate
received bonuses. Existing neighbours and previously earned points remain unchanged; Classic stays ×1.
The moving ghost, landing projection and tray show the tile's own bonus, using the corresponding
bronze, silver or diamond frame. Void destruction is previewed in violet before landing
and marked with a short purple pulse. Void earns no points and resets the combo.
Bedrock earns no points and leaves the combo unchanged. Contacts with bedrock also leave
the streak unaffected, while ordinary mismatched contacts still reset it;
destruction never subtracts previously earned points or refunds the removed tiles. If the island
is emptied, a standard tile immediately replaces the void at its placement cell. It has no
multiplier, grants no points or bonus tiles and does not consume another supply tile or count
as another placement. The next draw remains exactly the one shown in the tray.

Every special has its own original short sound: void suction, a coin-like gold chime,
a low rock impact, and distinct bronze, silver and crystal-like diamond cues. All ordinary
terrain combinations share the selected standard sound, defaulting to Water drop. Standard
sound selection (including Silent) does not replace special effects. All tile effects share
one 30% default volume and On/Off switch under Settings > Audio. Special cues are synthesized and cached locally,
without downloads, and selected from the actual placement result, including automatic locking.

| Placement                                               | Reward               |
| ------------------------------------------------------- | -------------------- |
| Each matching square along a seam                       | +5 points            |
| Harmonious: every touching side fully matches, 2+ sides | +1 tile              |
| Perfect: all four sides occupied and fully matching     | +30 points, +2 tiles |

A side counts as matching only when both of its squares match. Mismatches cost nothing.

Combos: a placement with at least one fully matching side and no mismatched contacts increases the
multiplier by 0.25. It starts at ×1, so the first success earns ×1.25, followed by ×1.5,
×1.75, ×2, ×2.25, ×2.5, ×2.75 and ×3 (the cap). Any mismatched touching side resets
it to ×1 for that placement, even if another side fully matches. In Superblock, bedrock
placements and bedrock contacts are neutral for the streak. Empty sides do not break
the combo. Only the new tile's points, including its perfect-placement point bonus, are
multiplied; existing score and bonus tiles are unchanged. Fractional points are retained.
The combo survives level changes and pauses, and resets on a new game.

Standard levels: each level has a points goal with no time limit. Reaching it starts the next level
at once, on the same board, with 6 extra tiles. Points toward the goal start from zero
each level; the total score keeps adding up.

| Level | Goal              |
| ----- | ----------------- |
| 1     | 75                |
| 2     | 125               |
| 3     | 175               |
| n     | 75 + 50 × (n − 1) |

In Standard, the game ends only when the stack (30 tiles to start) is empty. There is no countdown or
duration-based game over. The menu pauses automatic falling. The level goals live in
`src/game/levels.ts`. The top-right stopwatch shows active play time, pauses with the menu,
stops at game over, and resets on a new game; it has no effect on the end of a game.
Add `?seed=123` to the URL to replay the same sequence of tiles.
The Tetris comparisons, curve and supply/duration estimates are documented in
[docs/equilibrage-cadence.md](docs/equilibrage-cadence.md). Estimates are calibration assumptions,
not measurements; the original 30 tiles, +6 per level and score goals are preserved.

## Requirements

Node.js 22.12 or newer (CI uses Node 24).

```sh
npm install
```

## Develop

```sh
npm run dev
```

Open the URL Vite prints. It includes the base path, e.g. <http://localhost:5173/autristik/>.

In dev builds the Zustand store is exposed as `window.gameStore` for debugging from the console,
e.g. `gameStore.getState().restart(42)`.

Other scripts:

| Script                 | What it does                      |
| ---------------------- | --------------------------------- |
| `npm run lint`         | ESLint                            |
| `npm run format`       | Prettier, writes changes          |
| `npm run format:check` | Prettier, check only (used in CI) |
| `npm run typecheck`    | `tsc -b` in strict mode           |

## Test

```sh
npm test            # single run
npm run test:watch  # watch mode
```

Tests live next to the code (`src/**/*.test.ts`). They cover square neighbours, rotation, seam
matching and scoring, placement rules, score-based levels without a time limit, falling cadence, collision and automatic
locking from all four sides, automatic edge turns, keeping the last placement's lane,
manual advance and immediate placement, lateral movement, pause/resume, camera-relative
controls, camera requests, and fractional score formatting.

## Build

```sh
npm run build    # type-checks, then writes dist/
npm run preview  # serves dist/ locally
```

### Base path

GitLab Pages serves a project site from `https://<namespace>.gitlab.io/<repo-name>/`, so the
assets need that prefix. `vite.config.ts` reads it from the `BASE_PATH` environment variable
and falls back to `/autristik/`:

```sh
BASE_PATH=/ npm run build            # site at a domain root
BASE_PATH=/my-fork/ npm run build    # repo renamed or forked
```

A `.env.local` file containing `BASE_PATH=/` works too.

Static files that should be copied as-is go in `static/`, not `public/`. The `public/` name is
reserved for the Pages artifact.

## Branches and deploying

- `main` is where the team works. Every push runs the `test` job: lint, Prettier check, Vitest
  and a production build (which also type-checks). Nothing is deployed from `main`.
- `prod` is what's live. A push to `prod` runs only `pages`, which builds the site, moves `dist/`
  to `public/` and publishes it to GitLab Pages. `test` is skipped there: everything on `prod`
  already passed it on `main` with the same files.

To release, start the commit message with `(RELEASE)` and push to `main`:

```sh
git commit -m "(RELEASE) feat: score-based levels"
git push origin main
```

On `main`, a commit flagged like this runs one more job after `test` passes: `release`. It adds
one squash commit to `prod` whose files are exactly those of the flagged commit. Whatever was on
`prod` before is ignored, so there are no merges, merge requests or conflicts. The flag is
stripped from the message (`feat: score-based levels` above; a bare `(RELEASE)` becomes
`chore(release): main@<sha>`), the commit is authored by whoever pushed, and the body records the
`main` commit it came from. The squash sits on top of the previous release, so the push is a
plain fast-forward and never needs force. That push starts a pipeline on `prod`, which runs
`pages`. Once it passes, the URL is listed under Deploy > Pages.

Only the last commit of a push counts: if you push several commits at once, put the flag on the
newest one. The branch name is the `PAGES_BRANCH` variable at the top of `.gitlab-ci.yml`.

### One-time setup

The `release` job pushes with a token, because the built-in CI job token can't push to the
repository.

1. Settings > Access tokens: create a project access token with the Maintainer role and the
   `write_repository` scope. (If project access tokens are turned off on the instance, a
   maintainer's personal access token with the same scope works too.)
2. Settings > CI/CD > Variables: add it as `RELEASE_TOKEN`, with "Mask variable" and "Protect
   variable" checked. Protected variables are only given to protected branches, which `main` is
   by default.
3. Settings > Repository > Protected branches: protect `prod` with "Allowed to push and merge"
   set to Maintainers and force push off, so the release job is the usual way in. Keep `main`
   protected against force pushes.

In the `pages` job, `BASE_PATH` comes from `CI_PAGES_URL` when GitLab provides it, so it works
on self-hosted instances with their own Pages domain and with the "unique domain" setting (where
the site sits at the domain root). If neither is available it uses `/$CI_PROJECT_NAME/`. To force
a value, set a `BASE_PATH` CI/CD variable in the project settings.

## Project layout

```
src/
  game/      Pure TypeScript game logic. No React, Three or store imports (ESLint enforces this).
    coords.ts    Square axial coordinates, directions, neighbours
    tiles.ts     Terrain types, 2×2 quadrants, rotation, which squares face each other
    board.ts     Board map and the starting layout
    matching.ts  Seam matching and placement rules
    scoring.ts   Points and bonus tiles
    game.ts      Game state transitions (place, rotate, draw, level up)
    falling.ts   Four-sided gravity, landing projection, lateral movement, manual/hard drop
    levels.ts    Score goals, difficulty presets and capped falling cadence
    random.ts    Seedable PRNG so games are reproducible
  input/     Pure keyboard logic: bindings and defaults, key labels, screen-relative movement
  store/
    gameStore.ts      Falling game state, lateral camera requests and menu
    viewStore.ts      Camera angles and focus, plus keyboard pivot/zoom requests
    settingsStore.ts  Key bindings, saved to localStorage
  scene/     React Three Fiber components
    Board.tsx       Placed tiles as two InstancedMeshes (soil, terrain squares), plus open-square markers
    SquareTile.tsx  A single non-instanced tile (used for the ghost)
    Ghost.tsx       Moving transparent tile, landing outline and void destruction preview
    Ground.tsx      Ground plane; also the pointer target for picking squares
    Lights.tsx      Hemisphere fill and a shadow-casting sun that follows the camera
    CameraRig.tsx   MapControls with zoom and tilt limits, scroll pivot, clamped to the board
  ui/        Tailwind overlay: HUD (score, tile tray), main menu, game-over screen,
             keyboard shortcuts and automatic falling cadence
  palette.ts Colours shared by the scene and the HUD
```

Grid convention: `q` grows east (+x), `r` grows south (+z). A tile's squares are stored clockwise
from the north-west corner as `[NW, NE, SE, SW]`, and one clockwise turn moves the north-west
square to the north-east corner.

Fonts (Fraunces and Figtree) are bundled from `@fontsource-variable`, so the built site makes no
requests to external font hosts .
