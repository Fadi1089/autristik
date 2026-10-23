# Camera rotation pictograms

The right camera control now reuses the left PNG with a horizontal CSS reflection, so the two controls are exact mirror images. The original right PNG and prompt below are retained as generation provenance.

The two transparent PNGs in `src/assets/` were generated with the built-in `image_gen.imagegen` tool, one call per direction, using `transparent_background: true`. The 1254 × 1254 outputs were resized to 144 × 144 with high quality bicubic interpolation for in-game use; the full resolution originals remain in the tool's generated images folder. The final PNGs retain alpha transparency.

## Left prompt

```text
Use case: logo-brand
Asset type: one small in-game camera rotation pictogram, transparent PNG
Primary request: depict ROTATE CAMERA LEFT at a glance. Center a simple dark warm-brown camera silhouette (a compact camera body with one circular lens) with one bold curved arrow sweeping counter-clockwise around its upper-left side, arrowhead clearly pointing left. Flat 2D UI icon, clean rounded contours, strong silhouette, nearly uniform visual weight, no fine detail. The camera and arrow should read independently at 20–36 px display size. Fill most of a square canvas with even modest padding. Single ink color approximately #3b2e22; subtle cream accent only if it helps separate shapes. Genuine transparent background and transparent outside the pictogram. No text, border, tile, gradients, shadows, glow, extra arrows, watermark, or realistic detail.
```

## Right prompt

```text
Use case: logo-brand
Asset type: one small in-game camera rotation pictogram, transparent PNG
Primary request: depict ROTATE CAMERA RIGHT at a glance. Center a simple dark warm-brown camera silhouette (a compact camera body with one circular lens) with one bold curved arrow sweeping clockwise around its upper-right side, arrowhead clearly pointing right. Make a visually matching companion to a leftward camera rotation icon: flat 2D UI pictogram, clean rounded contours, strong silhouette, nearly uniform visual weight, no fine detail. The camera and arrow should read independently at 20–36 px display size. Fill most of a square canvas with even modest padding. Single ink color approximately #3b2e22; subtle cream accent only if it helps separate shapes. Genuine transparent background and transparent outside the pictogram. No text, border, tile, gradients, shadows, glow, extra arrows, watermark, or realistic detail.
```
