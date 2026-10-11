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
  Navigate its buttons with arrows or the bound movement keys (WASD / ZQSD by default),
  including the Settings panel; `Enter` or `Space` activates the focused button.
- Move sideways around the stack to change the arrival side automatically. If the next lane
  has no tile ahead in the current fall direction, the falling tile rounds the edge and heads
  towards the stack from that side: moving off the right edge makes it fall right-to-left,
  off the left edge left-to-right, and similarly for the top and bottom. The remaining
  distance and fall cadence are preserved. Lateral movement follows the outer surface of
  each lane: taller stacks raise the tile and shorter stacks lower it without adding fall time.
- A transparent tile moves towards the stack automatically, one square every 1.5 seconds.
  It locks when the next square is occupied, scores normally, and the next tile starts another
  fall. Side contacts do not stop the fall. A fainter landing projection shows its destination.
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
- The camera follows successful manual lateral movements smoothly. Automatic falling,
  locking and spawning leave it in place while the falling tile stays on screen.
  If the tile leaves the frame, the camera smoothly recenters on the tile, its landing
  projection and the neighbouring island edge, keeping its orientation and zooming out
  only if needed. `C` or `!` requests the same framing on demand.
  You can still pan, pivot and zoom; automatic reframing waits until a mouse gesture ends.
- Seam dots on the landing projection show matching terrain (green) and mismatches (red).
  The combo multiplier is displayed in the score card in the top-left corner.
  There is no direction panel.
- The `?` tab on the right edge of the screen slides out the terrain legend and key list when
  you hover it (tap it on touch screens).
- `E` or `Page Down` rotates the tile clockwise, `Q` (QWERTY) / `A` (AZERTY) or `Page Up` anticlockwise. The buttons beside the floating tile
  preview do the same, and so does clicking the preview. It is drawn from the same angle as the
  main camera, so it always matches the board on screen.

The game is fully playable with the keyboard alone. Default keys:

| Key                       | Action                                                        |
| ------------------------- | ------------------------------------------------------------- |
| Arrows or `W` `A` `S` `D` | Move sideways / advance towards stack, relative to the camera |
| `Shift` + movement key    | Choose arrival side, relative to the camera                   |
| `Space` / `Enter`         | Place immediately against the first obstacle                  |
| `E` / `Page Down`         | Rotate clockwise                                              |
| `Q` / `Page Up`           | Rotate anticlockwise (QWERTY; `A` on AZERTY)                  |
| `Z` or `,` / `X` or `.`   | Next aligned camera side, left / right (90°; QWERTY)          |
| `=` / `-`                 | Zoom                                                          |
| `C` / `!`                 | Recenter on the falling tile and the island edge              |
| `Esc`                     | Menu (always, can't be rebound)                               |

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
| Left-drag, one finger                   | Pan                     |
| Scroll wheel, pinch                     | Zoom                    |
| Sideways touchpad scroll, Shift + wheel | Pivot around the board  |
| Right-drag                              | Tilt (limited) and turn |

Scoring:

| Placement                                               | Reward               |
| ------------------------------------------------------- | -------------------- |
| Each matching square along a seam                       | +5 points            |
| Harmonious: every touching side fully matches, 2+ sides | +1 tile              |
| Perfect: all four sides occupied and fully matching     | +30 points, +2 tiles |

A side counts as matching only when both of its squares match. Mismatches cost nothing.

Combos: a placement with at least one fully green side and no red contacts increases the
multiplier by 0.25. It starts at ×1, so the first success earns ×1.25, followed by ×1.5,
×1.75, ×2, ×2.25, ×2.5, ×2.75 and ×3 (the cap). Any mismatched touching side resets
it to ×1 for that placement, even if another side is fully green. Empty sides do not break
the combo. Only the new tile's points, including its perfect-placement point bonus, are
multiplied; existing score and bonus tiles are unchanged. Fractional points are retained.
The combo survives level changes and pauses, and resets on a new game.

Levels: each level has a points goal with no time limit. Reaching it starts the next level
at once, on the same board, with 6 extra tiles. Points toward the goal start from zero
each level; the total score keeps adding up.

| Level | Goal              |
| ----- | ----------------- |
| 1     | 75                |
| 2     | 125               |
| 3     | 175               |
| n     | 75 + 50 × (n − 1) |

The game ends only when the stack (30 tiles to start) is empty. There is no countdown or
duration-based game over. The menu pauses automatic falling. The level goals live in
`src/game/levels.ts`. Add `?seed=123` to the URL to replay the same sequence of tiles.

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
    levels.ts    Goal and time limit for each level
    random.ts    Seedable PRNG so games are reproducible
  input/     Pure keyboard logic: bindings and defaults, key labels, screen-relative movement
  store/
    gameStore.ts      Falling game state, lateral camera requests and menu
    viewStore.ts      Camera angles and focus, plus keyboard pivot/zoom requests
    settingsStore.ts  Key bindings, saved to localStorage
  scene/     React Three Fiber components
    Board.tsx       Placed tiles as two InstancedMeshes (soil, terrain squares), plus open-square markers
    SquareTile.tsx  A single non-instanced tile (used for the ghost)
    Ghost.tsx       Moving transparent tile and landing projection with seam feedback
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
