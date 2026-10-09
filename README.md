# Autristik

A cozy tile-placement game in the spirit of Dorfromantik. You place square tiles next to the
board one at a time. Each tile is split into four terrain squares, and squares that match the
neighbouring tile across a seam score points.

Built with Vite, React, TypeScript, Three.js (via @react-three/fiber and drei), Zustand and
Tailwind CSS v4. It deploys to GitLab Pages.

## How to play

Each tile is a 2×2 grid of terrain squares (meadow, forest, field, water or village). Tiles sit
flush, so where two tiles meet, each square on one side faces one square on the other.

- The game opens on the menu. Press Play (or `Enter`, or `Esc`) to start. `Esc` or the button in the top
  left brings the menu back and pauses the game and the timer.
- Hover a highlighted square next to the board, or move the keyboard cursor onto one, to see the
  tile in hand floating over it. Dots on
  the seams show which squares match (green) and which don't (red), and the label shows what the
  placement is worth.
- Click, or press `Enter` / `Space`, to place it. Dragging the camera doesn't count as a click.
- The `?` tab on the right edge of the screen slides out the terrain legend and key list when
  you hover it (tap it on touch screens).
- `R` or `E` rotates the tile clockwise, `Q` anticlockwise. The buttons beside the floating tile
  preview do the same, and so does clicking the preview. It is drawn from the same angle as the
  main camera, so it always matches the board on screen.

The game is fully playable with the keyboard alone. Default keys:

| Key                       | Action                                 |
| ------------------------- | -------------------------------------- |
| Arrows or `W` `A` `S` `D` | Move the cursor (relative to the view) |
| `Enter` or `Space`        | Place the tile                         |
| `R` or `E` / `Q`          | Rotate clockwise / anticlockwise       |
| `Z` / `X`                 | Pivot the camera                       |
| `=` / `-`                 | Zoom                                   |
| `Esc`                     | Menu (always, can't be rebound)        |

The first movement key drops the cursor on the open square nearest the middle of the view, and
the camera follows it. Keys are matched by physical position, so on AZERTY the movement keys are
`Z` `Q` `S` `D`; in Chromium browsers the labels show what is printed on your keyboard. Every key
except `Esc` can be changed under Menu > Settings (two keys per action, saved in the browser).

Mouse and touchpad:

| Input                                   | Action                  |
| --------------------------------------- | ----------------------- |
| Click                                   | Place the tile          |
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

Levels: each level has a points goal and a countdown (top right). Earn the goal's points within
the level before the clock hits zero and the next level starts at once, on the same board, with a
fresh clock and 6 extra tiles. Points toward the goal start from zero each level; the total score
keeps adding up.

| Level | Goal              | Time                                 |
| ----- | ----------------- | ------------------------------------ |
| 1     | 50                | 1:15                                 |
| 2     | 75                | 1:10                                 |
| 3     | 100               | 1:05                                 |
| n     | 50 + 25 × (n − 1) | 75 − 5 × (n − 1) s, never under 40 s |

The game ends when the countdown runs out or the stack (30 tiles to start) is empty. The menu
pauses the clock. The numbers live in `src/game/levels.ts`. Add `?seed=123` to the URL to replay
the same sequence of tiles.

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

Tests live next to the code (`src/**/*.test.ts`). They cover square neighbours, rotation, which
squares face each other across a seam, matching and scoring, placement rules, the game flow and
the timer format.

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
git commit -m "(RELEASE) feat: timed levels"
git push origin main
```

On `main`, a commit flagged like this runs one more job after `test` passes: `release`. It adds
one squash commit to `prod` whose files are exactly those of the flagged commit. Whatever was on
`prod` before is ignored, so there are no merges, merge requests or conflicts. The flag is
stripped from the message (`feat: timed levels` above; a bare `(RELEASE)` becomes
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
    game.ts      Game state transitions (place, rotate, draw, countdown, level up)
    levels.ts    Goal and time limit for each level
    random.ts    Seedable PRNG so games are reproducible
  input/     Pure keyboard logic: bindings and defaults, key labels, screen-relative movement
  store/
    gameStore.ts      Game state plus hover, keyboard cursor, menu and timer
    viewStore.ts      Camera angles and focus, plus keyboard pivot/zoom requests
    settingsStore.ts  Key bindings, saved to localStorage
  scene/     React Three Fiber components
    Board.tsx       Placed tiles as two InstancedMeshes (soil, terrain squares), plus open-square markers
    SquareTile.tsx  A single non-instanced tile (used for the ghost)
    Ghost.tsx       Hover preview with seam feedback
    Ground.tsx      Ground plane; also the pointer target for picking squares
    Lights.tsx      Hemisphere fill and a shadow-casting sun that follows the camera
    CameraRig.tsx   MapControls with zoom and tilt limits, scroll pivot, clamped to the board
  ui/        Tailwind overlay: HUD (score, timer, tile tray), main menu, game-over screen,
             keyboard shortcuts and the game clock
  palette.ts Colours shared by the scene and the HUD
```

Grid convention: `q` grows east (+x), `r` grows south (+z). A tile's squares are stored clockwise
from the north-west corner as `[NW, NE, SE, SW]`, and one clockwise turn moves the north-west
square to the north-east corner.

Fonts (Fraunces and Figtree) are bundled from `@fontsource-variable`, so the built site makes no
requests to external font hosts.
