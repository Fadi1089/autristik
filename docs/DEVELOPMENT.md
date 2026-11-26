# Development

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
cursor can go, the three modes (free placement, the bounded grid, the pieces left and the end of a
performance game, the shape weights), the green placement area, scoring, saving and loading (and rejecting broken saves),
every test save in `saves/`, the game flow, the upcoming pieces, the grid reset, key bindings and
keyboard layouts, mapping the pointer onto the canvas, the piece outlines drawn on the board, the
ghost's shell, the landing dust and the time format.

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

### GitHub mirror

The repository is mirrored on GitHub. There, every push to `main` runs
`.github/workflows/pages.yml`: the same lint, Prettier check, tests and build as the `test` job,
then a deploy to GitHub Pages at `https://fadi1089.github.io/autristik/`. The base path comes from
GitHub's Pages settings, so it follows a renamed repo or a custom domain. Pages must be set to
deploy from GitHub Actions (Settings > Pages > Source).

## Project layout

```
src/
  game/      Pure TypeScript game logic. No React, Three or store imports (ESLint enforces this).
    coords.ts    Square axial coordinates, directions, neighbours
    tiles.ts     Biomes, the seven tetromino shapes, rotation, weighted random draws
    board.ts     Board map (one biome square per cell, tagged with its piece), starting piece
                 and the single black tiles round it
    matching.ts  Placement rules (contact, overlap, blue), where a piece fits, edge matching,
                 keyboard cursor limits
    game.ts      Game state: place, rotate, skip, draw, upcoming pieces, grid reset, end of a game
    modes.ts     The three modes: free placement, scoring, the performance grid and piece count
    score.ts     Points for a placement, and which pieces it surrounded
    bonus.ts     Timed region objectives, equal random draws, and twenty-point rewards
    routes.ts    Cities (five or more black squares) and the shortest roads joining them
    save.ts      Saving a game to JSON and loading it back, checking every field
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
    PlacementHints.tsx, placementArea.ts  Green ground area the piece can cover where it fits,
                      and the cells that blink, in a darker shade of its biome, where the bonus objective's patch can grow
    Ground.tsx        Ground plane; also the pointer target for picking cells
    canvasEvents.ts   Pointer events measured from the canvas, whatever element they land on
    GridLines.tsx     Cell outlines that fade out from the centre of the view, kept to the grid
                      in performance mode
    PlayArea.tsx      The performance grid's lighter field and its picket fence
    PlacementDust.tsx, dust.ts  Dust and specks when a piece lands
    GoldFlash.tsx     A quick gold flash over a piece when surrounding it scores 10
    ScoreClouds.tsx, scoreNotes.ts  A cloud listing what each placement scored, line by line
    pieceWater.ts, waterSurface.ts  Live water on the blue squares, of placed pieces, the piece
                      dropping and the ghost: rolling swells, fine ripples and faint light lines
    Roads.tsx, roadPieces.ts  Roads between cities, a stone piece on each square they cross,
                      whose stones pop up along the road
    Cities.tsx        Houses and grass scattered over every city's squares, painted from the city palettes
    Forests.tsx       Woods on the green squares, autumn woods and falling leaves on the red ones
    Farms.tsx         Wheat fields, pastures and silos on the yellow squares
    roadClearing.ts   Keeps trees and farms off the roads, and clears them just ahead of a new road
    props.ts, PropMeshes.tsx  What the houses, grass and trees share: palettes, finding a spot
                      for each, drawing them, and how they pop up and leave
    useAfterDrop.ts   Holds roads, houses and trees back until the piece just placed has landed
    Lights.tsx        Hemisphere fill and a shadow-casting sun that follows the camera
    CameraRig.tsx     MapControls with zoom and tilt limits, scroll pivot, clamped to the board
  ui/        Tailwind overlay: HUD (menu, reset, score, pieces left, camera buttons, piece tray,
             skip notice, bonus objective and its help, end of a performance game), main menu
             (with the mode picker, save and load), shape and biome settings, keyboard
             shortcuts, and the confetti for a completed bonus objective
  palette.ts Colours shared by the scene and the HUD
  assets/models/  The city houses and grass, the trees, the farms and the road pieces, as GLB
                  (see CREDITS.md)
tools/       Blender scripts that build those GLBs from the original models:
             fantasy-houses-glb.py, grass-glb.py, trees-glb.py, farm-glb.py, and road-glb.py, which makes
             the turn, T and cross from the straight stone path in path-straight.glb
saves/       Test saves, one per feature (see Test saves in GUIDE.md)
```

Grid convention: `q` grows east (+x) and `r` grows south (+z). A shape is a list of square
offsets from its anchor, the cell under the pointer, which is always `(0, 0)`. One clockwise turn
maps an offset `(q, r)` to `(-r, q)`, so north becomes east and the piece turns around its anchor.

Fonts (Fraunces and Figtree) are bundled from `@fontsource-variable`, so the built site makes no
requests to external font hosts.
