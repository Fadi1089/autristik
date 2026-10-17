# Development, build and project layout

[← Back to README](../README.md)

## Development

### Requirements

Node.js 22.12 or newer (CI uses Node 24).

```sh
npm install
```

### Run

```sh
npm run dev
```

Open the URL Vite prints. It includes the base path, e.g. <http://localhost:5173/autristik/>.

In dev builds the Zustand store is exposed as `window.gameStore` for debugging from the console,
e.g. `gameStore.getState().restart(42)`.

### Scripts

| Script                 | What it does                      |
| ---------------------- | --------------------------------- |
| `npm run lint`         | ESLint                            |
| `npm run format`       | Prettier, writes changes          |
| `npm run format:check` | Prettier, check only (used in CI) |
| `npm run typecheck`    | `tsc -b` in strict mode           |

### Test

```sh
npm test            # single run
npm run test:watch  # watch mode
```

Tests live next to the code (`src/**/*.test.ts`). They cover square neighbours, rotation, seam
matching and scoring, placement rules, score-based levels without a time limit, falling cadence,
collision and automatic locking from all four sides, automatic edge turns, keeping the last
placement's lane, manual advance and immediate placement, lateral movement, pause/resume,
camera-relative controls, camera requests, and fractional score formatting.

## Build and deployment

### Build

```sh
npm run build    # type-checks, then writes dist/
npm run preview  # serves dist/ locally
```

### Base path

GitLab Pages serves a project site from `https://<namespace>.gitlab.io/<repo-name>/`, so the assets
need that prefix. `vite.config.ts` reads it from the `BASE_PATH` environment variable and falls back
to `/autristik/`:

```sh
BASE_PATH=/ npm run build            # site at a domain root
BASE_PATH=/my-fork/ npm run build    # repo renamed or forked
```

A `.env.local` file containing `BASE_PATH=/` works too.

Static files that should be copied as-is go in `static/`, not `public/`. The `public/` name is
reserved for the Pages artifact.

### Branches

- **`main`** is where the team works. Every push runs the `test` job: lint, Prettier check, Vitest
  and a production build (which also type-checks). Nothing is deployed from `main`.
- **`prod`** is what's live. A push to `prod` runs only `pages`, which builds the site, moves `dist/`
  to `public/` and publishes it to GitLab Pages. `test` is skipped there: everything on `prod`
  already passed it on `main` with the same files.

### Releasing

Start the commit message with `(RELEASE)` and push to `main`:

```sh
git commit -m "(RELEASE) feat: score-based levels"
git push origin main
```

On `main`, a commit flagged like this runs one more job after `test` passes: `release`. It adds one
squash commit to `prod` whose files are exactly those of the flagged commit.

- Whatever was on `prod` before is ignored, so there are no merges, merge requests or conflicts.
- The flag is stripped from the message (`feat: score-based levels` above; a bare `(RELEASE)` becomes
  `chore(release): main@<sha>`), the commit is authored by whoever pushed, and the body records the
  `main` commit it came from.
- The squash sits on top of the previous release, so the push is a plain fast-forward and never
  needs force.
- That push starts a pipeline on `prod`, which runs `pages`. Once it passes, the URL is listed under
  Deploy > Pages.

> **Note:** only the last commit of a push counts. If you push several commits at once, put the flag
> on the newest one. The branch name is the `PAGES_BRANCH` variable at the top of `.gitlab-ci.yml`.

### One-time setup

The `release` job pushes with a token, because the built-in CI job token can't push to the repository.

1. **Settings > Access tokens:** create a project access token with the Maintainer role and the
   `write_repository` scope. (If project access tokens are turned off on the instance, a maintainer's
   personal access token with the same scope works too.)
2. **Settings > CI/CD > Variables:** add it as `RELEASE_TOKEN`, with "Mask variable" and "Protect
   variable" checked. Protected variables are only given to protected branches, which `main` is by default.
3. **Settings > Repository > Protected branches:** protect `prod` with "Allowed to push and merge" set
   to Maintainers and force push off, so the release job is the usual way in. Keep `main` protected
   against force pushes.

In the `pages` job, `BASE_PATH` comes from `CI_PAGES_URL` when GitLab provides it, so it works on
self-hosted instances with their own Pages domain and with the "unique domain" setting (where the site
sits at the domain root). If neither is available it uses `/$CI_PROJECT_NAME/`. To force a value, set
a `BASE_PATH` CI/CD variable in the project settings.

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

**Grid convention:** `q` grows east (+x), `r` grows south (+z). A tile's squares are stored clockwise
from the north-west corner as `[NW, NE, SE, SW]`, and one clockwise turn moves the north-west square
to the north-east corner.

**Fonts:** Fraunces and Figtree are bundled from `@fontsource-variable`, so the built site makes no
requests to external font hosts.
