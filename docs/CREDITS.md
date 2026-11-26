# Credits

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
