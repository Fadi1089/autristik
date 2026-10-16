# Gameplay and controls

[← Back to README](../README.md)

## Gameplay

### The basics

Each tile is a 2×2 grid of terrain squares (meadow, forest, field, water or village). Tiles sit
flush, so where two tiles meet, each square on one side faces one square on the other.

- A transparent tile moves towards the stack automatically.
- It locks when the next square is occupied, scores normally, and the next tile starts another fall.
- Side contacts do not stop the fall.
- A fainter landing projection shows its destination.
- Add `?seed=123` to the URL to replay the same sequence of tiles.

### Falling and placing tiles

**Cadence**

- The tile advances one square every 1.5 seconds at level 1 on Easy.
- Each level gently shortens the interval:
  `0.5 + (starting interval − 0.5) × 0.93^(level − 1)` seconds per square.
- On Easy, a fresh ten-step approach takes 15 s at level 1, about 12.5 s at level 5,
  10.2 s at level 10 and 7.5 s at level 20, gradually approaching a 5 s minimum.
- The new speed applies to the next tile after a level-up; manual side changes retain the elapsed cadence.

**Spawning**

- The next tile starts ten squares from the outermost occupied tile in its lane, on the same
  column for vertical gravity or the same row for horizontal gravity.
- It keeps the current arrival side.

**Moving**

- Arrows / WASD follow the camera orientation.
- The key pointing towards the stack advances exactly one square immediately and resets the fall
  cadence; holding it repeats.
- Perpendicular keys move sideways; the key away from the stack does nothing.
- Click or tap the ground to select a perpendicular lane.
- Lateral movement follows the outer surface of each lane: taller stacks raise the tile and
  shorter stacks lower it without adding fall time.

**Rounding edges**

- If the next lane has no tile ahead in the current fall direction, the falling tile rounds the
  edge and heads towards the stack from that side: moving off the right edge makes it fall
  right-to-left, off the left edge left-to-right, and similarly for the top and bottom.
- The remaining distance and fall cadence are preserved.
- Crossing an unsupported lane turns around the edge once; the tile stays outside the stack's surface.

**Placing**

- `Space` or `Enter` immediately places the tile against the first obstacle in the selected lane,
  scores it and draws the next tile.
- It never passes through an occupied square.

**Projection display**

- The landing projection no longer reveals matching or mismatching sides with green/red dots.
- Cyan outlines the moving tile and pale gold outlines its final destination, with a dark backing
  for contrast on both themes.
- Ghosts and their borders remain visible over other islands.
- The moving ghost is 80% opaque so its terrain colours remain readable.
- The combo multiplier is displayed in the score card in the top-left corner. There is no direction panel.

### Choosing the arrival side

Hold `Shift` with any bound movement key to choose the arrival side, relative to the camera:

| `Shift` + | Effect                          |
| --------- | ------------------------------- |
| Right     | Tile falls right-to-left        |
| Left      | Tile falls left-to-right        |
| Up        | Tile falls top-to-bottom        |
| Down      | Tile falls bottom-to-top        |

- This preserves the remaining distance and cadence and uses the projected placement's row/column
  for the new lane.
- If that lane has no obstacle, the adjacent lane containing the previously targeted stack tile is used.
- The camera stays in place while the tile is visible.
- Repeated key events do not advance the tile.

### Islands and cavities

**Several islands**

Once void destruction separates islands, `Shift` + a direction first approaches that side of the
currently selected island. Pressing it again visits the next island in that direction from its
near edge.

> Example: `Shift` + down selects the bottom of island 1 (upward fall), then the top of island 2
> (downward fall), then island 2's bottom. The same works left, right and up, including bound
> AZERTY / QWERTY movement keys and camera-relative controls.

- Remaining approach distance and cadence are preserved.
- Lateral movement, gravity and respawning stay on the selected island; the floating ghost may
  travel over other islands without stopping on them.
- Holding `Shift` + a key does not skip islands.

**Cavities**

- A lateral input first tries the adjacent empty cell at the falling tile's current depth.
- Cavities allow insertion when the same island surrounds an empty cell in at least three cardinal
  directions, including a floor ahead in the unchanged fall direction.
- There is no maximum wall distance or requirement to touch a wall while moving: large courtyards
  are traversable at the tile's current depth.
- A multi-column selection keeps this depth only if the entire path is empty and inside the cavity.
- Occupied cells block lateral movement inside cavities; unrelated islands cannot serve as their
  enclosing walls.
- The tile keeps its clock, then continues to the floor on the existing gravity cadence.
- A single-cell pocket locks at the next step.
- Distant holes, exposed edges and occupied source cells retain ordinary lane movement.
- This applies in all four directions and both game modes.

**Inside a cavity**

- Changing arrival side targets the nearest inner wall in the same row or column as the moving tile,
  instead of respawning outside the island.
- A farther wall advances the tile along an empty path to preserve its remaining fall steps; a
  closer wall shortens that distance without moving the tile backwards. The cadence is unchanged.
- Walls and open exits block lateral escape; choosing an open direction or repeating the same
  arrival side cannot leave the cavity or switch islands.
- `Shift` + a movement key aims towards that screen direction (up towards the upper wall, down
  towards the lower wall, likewise left/right). Outside, it still selects the arrival side. Both
  mappings follow camera orientation and rebound movement keys.
- Rotation and exchanging tiles remain possible before locking; `Enter` / `Space` places it at the
  cavity floor immediately.

### Tile tray

The right-hand vertical tray shows the current tile larger at the top and the actual next tile
smaller directly below, with localized Current/Next labels and a short separator between them.
The tile count sits below a wider horizontal separator.

- **Rotate:** `E` / `Page Down` clockwise, `Q` (QWERTY) / `A` (AZERTY) or `Page Up` anticlockwise.
  Clicking the current tile rotates it anticlockwise on its left half, clockwise on its right half.
  Keyboard activation of that preview remains clockwise. The rotation arrow buttons are removed.
- **Swap:** click the next tile, or press `F` / `ù` on AZERTY (`F` / `'` on QWERTY), as often as desired.
  - Each tile keeps its own rotation and multiplier.
  - Swapping costs no tiles or points and preserves the fall position and elapsed cadence.
- Both previews follow the main camera's angle.
- Looking at the next tile does not consume the random sequence, and repeated swaps never reroll it.
- The next slot is empty when only one tile remains in the supply.

## Controls and camera

The game is fully playable with the keyboard alone.

### Keyboard

Default keys:

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

### Mouse and touchpad

| Input                                   | Action                  |
| --------------------------------------- | ----------------------- |
| Click / tap                             | Choose a landing lane   |
| Click / tap the next tray tile          | Swap current / next     |
| Left-drag, one finger                   | Pan                     |
| Scroll wheel, pinch                     | Zoom                    |
| Sideways touchpad scroll, `Shift` + wheel | Pivot around the board  |
| Right-drag                              | Tilt (limited) and turn |

### Layouts and rebinding

- Choose AZERTY or QWERTY under **Menu > Settings > Keyboard layout**. The selection is saved and
  updates key labels throughout the interface.
- Keys are matched by physical position, so movement uses `Z` `Q` `S` `D` on AZERTY and
  `W` `A` `S` `D` on QWERTY. Switching layouts preserves custom bindings.
- Active controls except `Esc` and the two recenter shortcuts can be changed under
  **Menu > Settings** (two keys per action, saved in the browser). All four movement actions and
  immediate placement are configurable.
- The movement mapping adapts when the camera has pivoted; arrival sides change through movement
  or `Shift` + a movement key (including custom bindings and AZERTY / QWERTY).

### Camera

**Pivoting**

- Camera pivot uses `W` or `;` to turn left and `X` or `:` to turn right on AZERTY
  (`Z` or `,` / `X` or `.` on QWERTY).
- These secondary defaults are added to existing settings without replacing custom camera bindings
  or keys assigned to other actions.
- Each press moves to the next of the four grid-aligned views, left or right, with a smooth transition.
- From a freely rotated camera, it selects the next aligned view in that direction.
- Holding a pivot key does not skip sides; successive presses queue correctly during a turn.
- Mouse and touchpad rotation remains free.

**Following the action**

- The camera follows successful manual lateral movements smoothly.
- Automatic falling, locking and spawning leave it in place while the falling tile stays on screen.
- If the tile leaves the frame, the camera smoothly recenters on the tile, its landing projection
  and the neighbouring island edge, keeping its orientation and zooming out only if needed.
  `C` or `!` requests the same framing on demand.
- You can still pan, pivot and zoom; automatic reframing waits until a mouse gesture ends.

**Framing and HUD**

- The camera measures the visible HUD and frames the falling tile and its destination inside the
  largest unobstructed rectangular area. It accounts for the top cards, the tile tray and the help
  drawer, including window resizing, while preserving free camera controls and the tray's position
  and design. Manual recentering uses the same safe area.
- Each new run resets the camera to the central island, with a fitted zoom that includes the
  approaching tile. This also works after restarting with the same seed, without reframing an
  ordinary pause/resume.

**Help drawer**

The `?` tab at the bottom-left edge slides out the terrain legend and key list when you hover the
tab itself (tap it on touch screens). The rest of the screen edge does not trigger it. Keyboard
focus can also open it, and its contents stay accessible while open.
