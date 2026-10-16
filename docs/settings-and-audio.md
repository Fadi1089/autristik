# Menus, settings and audio

[← Back to README](../README.md)

## Menus

**Navigation**

- The game opens on the menu. Press Play (or `Enter`, or `Esc`) to start. `Esc` or the button in the
  top left brings the menu back and pauses the game.
- Navigate buttons with arrows or the bound movement keys (WASD / ZQSD by default), including the
  Settings panel; `Enter` or `Space` activates the focused button.
- Up/Down cycle through the large entries. Right/Left enter and leave an open side panel.
- Only one main option is highlighted; pointer hover and keyboard focus update that selection.
  Focus is shown by colour and the four-square marker, without a green outline.
- Arrow-key navigation skips controls inside closed sections.

**Content**

- In both menus, **How to play** has collapsible Rules and Controls sections, plus Tile types when
  Superblock is selected. The sections start closed. Controls use the player's current bindings and
  keyboard layout.
- **Settings** is available in both the starting and pause menus, with two initially collapsed sections:
  - **Customization:** themes and standard tile sound selection.
  - **General:** language, audio volumes and switches, keyboard and mouse controls.
- **Return to main menu** leaves the paused run, preserves saved records, and restores the home music;
  Play then starts a fresh run with the selected options.

**Layout**

- Menu panels are 29 rem wide on desktop. Fixed table columns, wrapping labels and shrinking grid
  tracks keep settings within the panel; only vertical scrolling is available.
- Scrollbars use the theme's paper and moss variables, with slim tracks and rounded thumbs in
  supported browsers.

## Theme and language

**Theme**

- **Light** preserves the original appearance.
- **Dark** changes the sky, ground, lighting, menus and HUD while keeping the terrain colours.
- The theme applies immediately and is saved locally.

**Language**

- French and English are available throughout the main and pause menus, tutorial, mode information,
  customization, HUD, tooltips and game-over screen.
- On first launch, the first supported browser language preference is selected (`fr-*` → French,
  `en-*` → English; otherwise English).
- **Menu > Settings > Language** lets players switch immediately, and saves the choice on this device.
  Existing preferences are retained when the language setting is first added.
- Score decimal separators and key names follow the language; keyboard layout and physical bindings
  remain independent.
- The title **Autristik** stays unchanged. Translations are centralized and typed in `src/i18n/`.

## Audio

**Tile sounds**

- Choose Wood, Button, Laser, Water drop (default), Steel, Glass or Silent for standard tile sounds.
  Selecting a clip previews it.
- Successful manual and automatic standard placements play the selected sound, including the last tile.
- All tile effects share one saved On/Off switch and volume slider, defaulting to 30%.
- Movement, rotation, restarting and opening menus stay silent.
- Clips are bundled locally and audio is unlocked by a user gesture. Sources and CC0 license notices
  live in [static/audio/CREDITS.md](../static/audio/CREDITS.md).
- **Settings > General > Audio** contains Preview sound, volumes and On/Off controls.

**Special tile sounds**

- Every special has its own original short sound: void suction, a coin-like gold chime, a low rock
  impact, and distinct bronze, silver and crystal-like diamond cues.
- All ordinary terrain combinations share the selected standard sound, defaulting to Water drop.
  Standard sound selection (including Silent) does not replace special effects.
- Special cues are synthesized and cached locally, without downloads, and selected from the actual
  placement result, including automatic locking.

**Menu navigation cue**

- A separate soft, low click plays for pointer hover and keyboard focus changes, with a lower pitch,
  reduced treble and a rounded attack/release envelope, and no duplicate cue when the same button
  remains selected.
- It defaults to 8% (about 68% quieter than its former 25% setting); existing default settings are
  upgraded, while customized volumes and mute choices are preserved.

**Music**

- Owner-supplied MP3s:
  - `static/audio/menu-jazz.mp3` (Jazz at Dizzy's) for the main menu.
  - `static/audio/game-flute.mp3` (Relaxing Krishna Flute) for play and pause.
- Only a change between these contexts replaces the player: pausing, resuming and restarting from
  pause preserve the same track and playhead.
- HTML audio streams the long tracks with native looping; native audio controls volume without
  decoding entire tracks into memory.
- Music becomes silent while the tab is hidden.
- Music and menu cues each have an independent On/Off switch and saved volume under
  Settings > General > Audio.
- Music attempts playback as soon as the app opens; if browser autoplay rules block it, any click or
  key press retries silently, without an activation button or explanatory text in the menu.
