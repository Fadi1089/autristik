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

A game starts from one tetromino in the middle of the board, with five to eight single black
tiles scattered round it, four to seven squares out and well apart from one another, to build
towards.

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

Each piece scores when it is placed, and roads score for as long as they stand:

| Points | For                                                                 |
| ------ | ------------------------------------------------------------------- |
| 1      | Each piece laid down                                                |
| 1      | Each edge where the piece meets its own biome on another piece      |
| 10     | Each piece, this one or one already down, that it leaves surrounded |
| 1      | Each square a road crosses, while the road stands                   |
| 20     | Each bonus objective completed within its ten-placement window      |

A piece is surrounded when every one of its outer edges meets a square of its own biome on another
piece. The moment it scores its 10 the whole piece flashes gold, like a camera flash. It only scores
once. Edges between squares of the same piece don't count. After each placement a little cloud
floats up over the piece, listing its points line by line in the order of the table: "+1 placed",
then "+2 two sides match" if any sides match, then a gold "+10 tetromino surrounded" if it
surrounded a piece, then "+4 road squares" if it made a road longer or new, or "−2 road
shortened" if a shorter road took over. The total sits in the top right, with the points the
roads bring in now beside it ("+4 roads"). The starting piece counts for its base point, so a new
game starts at 1, and resetting the grid puts the score back to 1.

### Bonus objectives

After the 10th player placement, and every ten placements after that, a bonus objective asks
for a connected region of one biome. The biome is drawn uniformly from all five biomes,
independently of the piece settings (including biomes whose piece weight is zero). Its size is
drawn uniformly from 7 through 13 inclusive: each size has a 1/7 chance. A separate seeded random
stream keeps these draws from changing the upcoming pieces.

The next ten successful placements are the deadline: the objective proposed after placement 10
can be completed on placements 11 through 20, including placement 20. That last placement is
checked before the next objective is proposed. Invalid placements, rotations and skipped pieces
do not advance the counter. Neither the starting tetromino nor the scattered single black tiles
count as player placements.

A region joins squares of the requested biome along their sides, across piece boundaries;
diagonal contact does not join them. A placement must take a region from below the target to
the target or higher, either by growing it or joining smaller regions. A region that was already
large enough does not count retroactively, even if more squares are added to it; another region
may still qualify. Success adds 20 points once and increments the completed-objective counter.
Completing early leaves the completed objective visible until the next ten-placement milestone.
An unmet objective is replaced at its deadline without a penalty.

From the tenth player placement, the card in the top right, below the score, shows the current objective, placements left, and number
completed this game. Its reward also appears in the placement's score cloud. New games and grid
resets clear both objective counters along with the score. Saving and loading preserves the
objective, deadline, counters and independent random state. Older saves remain readable: their
placed tetrominoes determine the placement count, with no invented past completions; their first
new objective is proposed at the next multiple of ten.

### Forests

Every green square grows a small wood, five to eight trees crowding one another, and every red
square an autumn one: the same trees, turned amber, rust, gold and crimson, with leaves drifting
down from them. A new square's trees pop up once its piece has landed. Roads never cross green,
but they may cross red: the trees keep clear of a road, and when a new road comes through an
autumn wood, the trees in its way shiver, tip over and sink into the ground just ahead of its
stones. Should the road move away again, they grow back.

### Farms

Every yellow square is farmland. Most are fields of wheat in rows, sown along one way or the
other, ripe, pale, amber or still green at the stalk; some are pastures, where a few cattle,
horses with a donkey, or deer graze with some wheat at the edge, and each part of the board keeps
to one kind of herd; now and then one is a farmstead, a red silo with wheat round it. A road may
cross one yellow square: what is in its way goes just ahead of its stones, the wheat cut down, the
animals hopping off and the silo sinking into the ground.

### Cities and roads

A city is a region of at least five black squares joined along their edges, from one piece or
several, in any shape: a square, an L, a line. Two to four small houses and a few patches of grass pop up on each of
its squares, scattered at random and turned every which way, once the piece that completes it
has landed. They are painted from a handful of muted palettes; each part of the board leans
towards one, so a city hangs together while its houses still differ. Roads join cities by themselves as you play, laid in stone
on the squares they cross up to the edge of each city: a straight, a turn, a T or a cross on each
square, turned to fit, so two roads sharing a square meet rather than lie on top of each other. A
new road's stones pop up one after another, from its first city to its second, once the piece
that made it has landed. A road:

- only crosses squares on the board, moving from a square to one beside it (never diagonally);
- never crosses blue or green;
- crosses at most one yellow square (zero is fine);
- is the shortest way between its two cities that keeps to those rules.

Two cities with no such way between them have no road, and neither does a board with fewer than
two cities. Roads are worked out again after every placement, so a piece that opens a shorter way
moves the road onto it, and the score follows: it counts the squares the roads cross now, not
the ones they used to. A shorter road can therefore lower the score.

How a road is found (`src/game/routes.ts`):

1. **Cities.** A flood fill over the black squares groups them into regions; the ones with five
   or more squares are cities.
2. **Shortest road between two cities.** An A* search starts from every square of the first city
   at once. It always extends the path whose steps so far plus the fewest steps that could be
   left (the straight-line grid distance to the nearest square of the second city, ignoring what
   is in the way) is smallest, so it heads towards the second city instead of spreading out in
   every direction. That estimate never overestimates, so the first time the search reaches the
   second city, its path is a shortest one. The yellow limit is what makes this more than a plain
   search: the search keeps track of each square together with how many yellow squares it took
   to get there (0 or 1). Reaching a square with no yellow used and reaching it after a yellow
   are two different positions, so a slightly longer way with no yellow isn't thrown away just
   because a shorter one already spent the only yellow. A step onto a second yellow, onto blue
   or green, or off the board is never taken.
3. **Which cities to join.** Every pair of cities gets its shortest road, if it has one. The roads
   are then taken shortest first, and a road is kept only if it joins two cities not already
   linked by the roads kept so far (Kruskal's algorithm, which gives a minimum spanning tree). So
   every city that can be reached is connected, with the fewest road squares in total and no
   road that just repeats a link that already exists. There is no limit on the number of roads.

Each square counts once, even where two roads share it. The cities' own black squares at either
end of a road don't count; a black square that isn't part of a city does.

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
- The Reset button next to the menu button clears the grid back to a starting piece and its
  scattered black tiles. The piece in hand and the queue carry on.

### Saving and loading

Save game in the menu downloads the game in progress as a JSON file, such as
`tristik-2026-11-03-1642.json`. Load game picks such a file and carries on exactly where it was
left: same board, piece in hand and angle, score, upcoming pieces and biome odds (which also go
into Settings, so later pieces keep coming the same way). There is one game at a time: loading
replaces the game in progress. A file that isn't a valid save is refused with the reason, and the
game in progress stays as it was.

A save holds `format` (`"tristik-save"`), `version` (1), an optional `note`, `score`, `seed` (the
piece generator's state), `rotation`, `current` (the piece in hand: `shape` and its four
`terrains`), `biomeProbabilities`, the optional stage-8 `bonus` progress, and `board`, a list of squares (`q`, `r`, `terrain`, and the
`piece` they belong to). Loading checks every field: each piece must have four joined squares, no
two squares may share a cell, and the odds must be able to draw every piece they ask for.

### Test saves

[`saves/`](saves) holds one save per feature. Load one from the menu and follow its `note`; each
claim in the notes is also checked automatically by `src/game/saves.test.ts`.

| Save                                | What it shows                                                 |
| ----------------------------------- | ------------------------------------------------------------- |
| `01-new-game.json`                  | A new game starts at 1 point; every later piece must touch    |
| `02-water-blocks-other-biomes.json` | A piece without blue never goes against blue                  |
| `03-water-goes-anywhere.json`       | An all-blue piece goes against any biome                      |
| `04-stuck-piece.json`               | A piece that fits nowhere: the skip notice                    |
| `05-angles.json`                    | Where a piece fits depends on its angle (a flat-only slot)    |
| `06-matching-sides.json`            | +1 per side against the same biome on another piece           |
| `07-surround-bonus.json`            | Closing in a piece: gold flash and +10                        |
| `08-self-surround.json`             | A piece dropped into a matching hole surrounds itself         |
| `09-two-biome-odds.json`            | Saved biome odds: two biomes per piece, red three times green |
| `10-long-game.json`                 | Forty moves in: many pieces, and the same queue after loading |
| `11-roads.json`                     | Two cities with no road, until a piece fills the gap: +4      |
| `12-shortest-road.json`             | A shorter road through one yellow takes over: −2              |
| `13-bonus-objective.json`           | Grow six green squares to ten: +20 and one completed bonus    |
| `14-bonus-deadline.json`            | Miss the final placement: the next objective replaces it      |

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
grid resets use these settings for the starting piece too; the single tiles round it are always
black.

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
cursor can go, the green placement area, scoring, saving and loading (and rejecting broken saves),
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
    game.ts      Game state: place, rotate, skip, draw, upcoming pieces, grid reset
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
    PlacementHints.tsx, placementArea.ts  Green ground area the piece can cover where it fits
    Ground.tsx        Ground plane; also the pointer target for picking cells
    canvasEvents.ts   Pointer events measured from the canvas, whatever element they land on
    GridLines.tsx     Cell outlines that fade out from the centre of the view
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
  ui/        Tailwind overlay: HUD (menu, reset, score, camera buttons, piece tray, skip
             notice), main menu (with save and load), biome settings and keyboard shortcuts
  palette.ts Colours shared by the scene and the HUD
  assets/models/  The city houses and grass, the trees, the farms and the road pieces, as GLB
                  (see Credits)
tools/       Blender scripts that build those GLBs from the original models:
             fantasy-houses-glb.py, grass-glb.py, trees-glb.py, farm-glb.py, and road-glb.py, which makes
             the turn, T and cross from the straight stone path in path-straight.glb
saves/       Test saves, one per feature (see Test saves above)
```

Grid convention: `q` grows east (+x) and `r` grows south (+z). A shape is a list of square
offsets from its anchor, the cell under the pointer, which is always `(0, 0)`. One clockwise turn
maps an offset `(q, r)` to `(-r, q)`, so north becomes east and the piece turns around its anchor.

Fonts (Fraunces and Figtree) are bundled from `@fontsource-variable`, so the built site makes no
requests to external font hosts.

## Credits

The cities are built from two models from Poly Pizza, both licensed under
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/):

- the houses are ["Fantasy Houses"](https://poly.pizza/m/AO4BeeUHLN) by burunduk, scaled and
  exported to GLB with `tools/fantasy-houses-glb.py`;
- the grass is ["grass yellowing"](https://poly.pizza/m/eFUpFgjCf0p) by Steve B, joined into one
  mesh, scaled and exported to GLB with `tools/grass-glb.py`.

Both are repainted in the game from its own palettes (`CITY_PALETTES` and `GRASS_PALETTES` in
`src/palette.ts`).

The forests are built from two more, also [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/):

- ["Forest"](https://poly.pizza/m/79xo-C_-n1J) by Nathan Merrill, of which one leafy tree is kept;
- ["Forest"](https://poly.pizza/m/2_fv3tn3NG_) by Poly by Google, split into its sixteen pines
  and round-topped trees.

`tools/trees-glb.py` turns both into one GLB of seventeen trees, repainted in the game from
`FOREST_PALETTES` and `AUTUMN_PALETTES` in `src/palette.ts`.

The farms are built from two models by Poly by Google, also
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), ["Silo"](https://poly.pizza/m/8UPiiP129yz)
and ["Field of wheat"](https://poly.pizza/m/eWhaaKNh755), and five animals by Quaternius in the
public domain ([CC0](https://creativecommons.org/publicdomain/zero/1.0/)):
["Cow"](https://poly.pizza/m/26zM1outCr), ["Bull"](https://poly.pizza/m/a8PIIYwF7r),
["Horse"](https://poly.pizza/m/qvTrSG9pZF), ["Donkey"](https://poly.pizza/m/qmX6nhnvp7) and
["Deer"](https://poly.pizza/m/T6Cs7tmMHJ). `tools/farm-glb.py` freezes each animal standing and
grazing, and turns them all into one GLB; the wheat is repainted from `WHEAT_PALETTES` in
`src/palette.ts`, and the rest keep their own colours.

The roads are built from ["Path Straight"](https://poly.pizza/m/ZuRHRsKWoz) by Quaternius, in
the public domain ([CC0](https://creativecommons.org/publicdomain/zero/1.0/)), kept as
`tools/path-straight.glb`. `tools/road-glb.py` bends it into the turn and builds the T and the
cross from it. Their stones are painted from `ROAD_STONES` in `src/palette.ts`.
