<h1 align="center">TrisTik</h1>

<p align="center">
  <img src="src/assets/menu-village.webp" alt="A small village of tiles: fields, a pond with a waterfall, pine trees and a lookout tower" width="360">
</p>

<p align="center">
  <strong><a href="https://autristic.pages.unistra.fr/autristik/">Try it out in your browser!</a></strong>, no install needed.
</p>

A cozy tile-placement game in the spirit of Dorfromantik, played with tetrominoes. Each piece is
four biome squares laid out as an I, O, T, S, Z, J or L. Every piece has to be laid against the
pieces already on the board, and only blue can be laid against blue.

Built with Vite, React, TypeScript, Three.js (via @react-three/fiber and drei), Zustand and
Tailwind CSS v4. It deploys to GitLab Pages.

## How to play

There are five biomes: black, red, green, yellow and blue, one per board cell. Each of the seven
shapes is equally likely. A piece first draws how many distinct biomes it has (by default 1: 15%,
2: 45%, 3: 25%, 4: 15%), then picks that many different biomes by weight (red and green 30,
black and yellow 17.5, blue 5). Each picked biome gets one square. The squares left over are
filled from the picked biomes only, in proportion to their weights scaled to 100% among them:
a red and blue piece fills each spare square with red 30/35 of the time and blue 5/35. Both
sets of odds can be changed in the settings. A placed piece is one low block whose squares meet
flush, with slightly rounded outer corners, and a thin strip of ground separates it from its
neighbours. Cell outlines are drawn on the ground, strongest at the centre of the view and fading
towards the edges.

### Rules

| Rule    | What it means                                                        |
| ------- | -------------------------------------------------------------------- |
| Contact | A piece must share at least one edge with a square on the board.     |
| Overlap | A piece can't cover a cell that is already taken.                    |
| Water   | Only blue can go against blue on the board; blue can go against all. |

The game starts with one random piece at the centre, which is the only piece placed without
contact. It is never all blue, unless the settings allow nothing but blue, since only blue could
ever be laid against it. Squares within the same piece can sit next to each other in any
combination. Squares that only meet at a corner don't count as touching.

There is no timer or end: the game keeps drawing pieces. Add `?seed=123` to the URL to replay
the same sequence of pieces.

### Score

Each piece scores when it is placed:

| Points | For                                                                 |
| ------ | ------------------------------------------------------------------- |
| 1      | Each piece laid down                                                |
| 1      | Each edge where the piece meets its own biome on another piece      |
| 10     | Each piece, this one or one already down, that it leaves surrounded |

A piece is surrounded when every one of its outer edges meets a square of its own biome on another
piece. The moment it scores its 10 the whole piece flashes gold, like a camera flash. It only scores
once. Edges between squares of the same piece don't count. After each placement a little cloud
floats up over the piece, listing its points line by line in the order of the table: "+1 placed",
then "+2 two sides match" if any sides match, then a gold "+10 tetromino surrounded" if it
surrounded a piece. The total sits in the top right. The starting piece scores nothing, and
resetting the grid puts the score back to 0.

### Playing

- The game opens on the menu. Move between its items with the arrow keys or the mouse and press
  `Enter` to pick one. During play, `Esc` pauses into the menu and pressing it again resumes. The
  button in the top left opens the menu too.
- A flat green area on the ground covers every cell the piece in hand can reach at a spot where
  it fits, at the angle it is turned to now. Its outline follows the piece's shape and rotation,
  so turning the piece reshapes it. Hover a cell to see whether the piece fits with its anchor
  there.
- Hover any cell, or move there with the keyboard, to see the piece in hand floating over it. It
  slides from cell to cell and spins when you rotate it. It stays under the mouse when the camera
  pans, zooms or pivots. A translucent green shell around it means it can go there; red means it
  can't.
- Click, or press `Enter` / `Space`, to place it. Dragging the camera doesn't count as a click.
  Touch screens have no hover, so the first tap on a cell shows the preview and a second tap on
  the same cell places the piece. Tapping another cell moves the preview.
- `R` or `E` rotates the piece clockwise and `Q` anticlockwise, around the cell under the
  pointer. The buttons beside the current piece do the same, and so does clicking it.
- If a piece fits nowhere at any angle, a notice above the tray offers to skip it and draw the
  next one.
- The tray at the bottom shows the current piece and the next three (each smaller than the one
  before). The icons turn with the camera, so they match the board.
- The Reset button next to the menu button clears the grid back to a single starting piece. The
  piece in hand and the queue carry on.

### Controls

The game can be played with the keyboard alone. Default keys:

| Key                       | Action                                 |
| ------------------------- | -------------------------------------- |
| Arrows or `W` `A` `S` `D` | Move the cursor (relative to the view) |
| `Enter` or `Space`        | Place the piece                        |
| `R` or `E` / `Q`          | Rotate clockwise / anticlockwise       |
| `Z` / `X`                 | Pivot the camera                       |
| `=` / `-`                 | Zoom                                   |
| `Esc`                     | Menu and pause (can't be rebound)      |

The first arrow press picks up the preview where the mouse left it. If there is no preview yet,
it starts on the cell nearest the middle of the view where the piece fits. The mouse takes over
again only when it moves onto another cell.

Letter shortcuts follow the selected keyboard layout, so on AZERTY the movement keys are
`Z` `Q` `S` `D`. The browser detects the layout where supported; otherwise the browser language
provides a fallback. A layout can also be chosen under Shortcuts and stays fixed while playing.
Every key except `Esc` can be changed under Menu > Shortcuts (two keys per action, saved in the
browser).

Menu > Settings lets you tune the relative chances of each biome count and the relative weights
used to pick biomes. The percentages shown are the normalized odds. Changes apply to pieces
drawn next, including the tray previews. A zero weight excludes a biome. At least as many biomes
must keep a weight above 0 as the largest biome count above 0, so a piece always gets the number
of distinct biomes it asks for. For example, with 3-biome pieces enabled, the last three biomes
can't be set to 0, and the 3-biome count stays at 0 while only two biomes are enabled. New games and
grid resets use these settings for the starting piece too.

Mouse and touchpad:

| Input                                   | Action                  |
| --------------------------------------- | ----------------------- |
| Click                                   | Place the piece         |
| Left-drag, one finger                   | Pan                     |
| Scroll wheel, pinch                     | Zoom                    |
| Sideways touchpad scroll, Shift + wheel | Pivot around the board  |
| Right-drag                              | Tilt (limited) and turn |

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

Tests live next to the code (`src/**/*.test.ts`). They cover coordinates, the seven shapes and their
rotations, biome draws and their settings, edge matching, the placement rules (contact, overlap and
blue), where a piece fits at each angle, skipping a piece that fits nowhere, how far the keyboard
cursor can go, the green placement area, scoring, the game flow, the upcoming pieces, the grid
reset, key bindings and keyboard layouts, the piece outlines drawn on the board, the ghost's shell,
the landing dust and the time format.

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
git commit -m "(RELEASE) feat: place tetrominoes"
git push origin main
```

On `main`, a commit flagged like this runs one more job after `test` passes: `release`. It adds
one squash commit to `prod` whose files are exactly those of the flagged commit. Whatever was on
`prod` before is ignored, so there are no merges, merge requests or conflicts. The flag is
stripped from the message (`feat: place tetrominoes` above; a bare `(RELEASE)` becomes
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
    tiles.ts     Biomes, the seven tetromino shapes, rotation, weighted random draws
    board.ts     Board map (one biome square per cell, tagged with its piece), starting piece
    matching.ts  Placement rules (contact, overlap, blue), where a piece fits, edge matching,
                 keyboard cursor limits
    game.ts      Game state: place, rotate, skip, draw, upcoming pieces, grid reset
    score.ts     Points for a placement, and which pieces it surrounded
    random.ts    Seedable PRNG so games are reproducible
  input/     Pure keyboard logic: bindings and defaults, key labels, layout detection,
             screen-relative movement
  store/
    gameStore.ts      Game state plus hover, keyboard cursor and menu
    viewStore.ts      Camera angles and focus, plus keyboard pivot/zoom requests
    settingsStore.ts  Key bindings, keyboard layout and biome odds, saved to localStorage
  scene/     React Three Fiber components
    layout.ts         Cell size, heights, and the boxes that draw a piece with its inset outline
    Board.tsx         Placed pieces merged into one mesh, plus the one easing down after placing
    pieceGeometry.ts  A piece's soil and biome blocks as one geometry, with rounded outer corners
    PieceTile.tsx     A single piece on its own (used for the ghost)
    Ghost.tsx, ghostEnvelope.ts  Preview of the piece in hand: slides, spins, green or red shell
    PlacementHints.tsx, placementArea.ts  Green ground area the piece can cover where it fits
    Ground.tsx        Ground plane; also the pointer target for picking cells
    GridLines.tsx     Cell outlines that fade out from the centre of the view
    PlacementDust.tsx, dust.ts  Dust and specks when a piece lands
    GoldFlash.tsx     A quick gold flash over a piece when surrounding it scores 10
    ScoreClouds.tsx, scoreNotes.ts  A cloud listing what each placement scored, line by line
    Lights.tsx        Hemisphere fill and a shadow-casting sun that follows the camera
    CameraRig.tsx     MapControls with zoom and tilt limits, scroll pivot, clamped to the board
  ui/        Tailwind overlay: HUD (menu, reset, score, camera buttons, piece tray, skip
             notice), main menu, biome settings and keyboard shortcuts
  palette.ts Colours shared by the scene and the HUD
```

Grid convention: `q` grows east (+x) and `r` grows south (+z). A shape is a list of square
offsets from its anchor, the cell under the pointer, which is always `(0, 0)`. One clockwise turn
maps an offset `(q, r)` to `(-r, q)`, so north becomes east and the piece turns around its anchor.

Fonts (Fraunces and Figtree) are bundled from `@fontsource-variable`, so the built site makes no
requests to external font hosts.
