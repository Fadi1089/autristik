"""Turns the Fantasy Houses kit into one small GLB of ten houses, ready to be coloured in the game.

"Fantasy Houses" by burunduk, https://poly.pizza/m/AO4BeeUHLN, CC BY 3.0. The kit's colours live
in a palette image that doesn't ship with it, so each face is sorted by which swatch of that
palette its UVs point at into a part: wall, roof, stone or wood. The part is stored in the red
channel of the vertex colours, as part / 3 (wall 0, roof 1/3, stone 2/3, wood 1); the game
paints each part from one of its city palettes (CITY_PALETTES in src/palette.ts). Each house
ends up centred on its footprint, standing on the ground, with its widest side 1 long.

    blender -b --factory-startup --python tools/fantasy-houses-glb.py -- \
        "Fantasy houses Scatch.fbx" src/assets/models/fantasy-houses.glb
"""
import bpy, sys, mathutils
args = sys.argv[sys.argv.index('--') + 1:]
path, out = args

HOUSES = ['Box159', 'Box163', 'Box172', 'Box179', 'Box239', 'Box244', 'Box261', 'Box267', 'Box298', 'Object040']
WALL, ROOF, STONE, WOOD = 0, 1, 2, 3

def part(u, v):
    if u > 0.7: return WALL
    if u > 0.38: return ROOF
    if v > 0.2: return STONE
    return WOOD

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=path)
for o in list(bpy.data.objects):
    if o.name not in HOUSES: bpy.data.objects.remove(o)

for i, name in enumerate(HOUSES):
    o = bpy.data.objects[name]
    o.name = o.data.name = f'house-{i}'
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.select_set(False)
    m = o.data
    uv = m.uv_layers[0].data
    colours = m.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for p in m.polygons:
        u = sum(uv[l].uv.x for l in p.loop_indices) / p.loop_total
        v = sum(uv[l].uv.y for l in p.loop_indices) / p.loop_total
        c = (part(u, v) / 3, 0.0, 0.0, 1.0)
        for l in p.loop_indices: colours.data[l].color = c
    m.color_attributes.active_color = colours
    # Centred on its footprint, standing on the ground, its widest side 1 long.
    xs = [v.co.x for v in m.vertices]; ys = [v.co.y for v in m.vertices]; zs = [v.co.z for v in m.vertices]
    size = max(max(xs) - min(xs), max(ys) - min(ys))
    shift = mathutils.Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)))
    for vert in m.vertices: vert.co = (vert.co - shift) / size
    o.location = (0, 0, 0)
    for layer in list(m.uv_layers): m.uv_layers.remove(layer)
    print('HOUSE', o.name, 'from', name, 'height', round((max(zs) - min(zs)) / size, 2))

bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', export_materials='NONE', export_vertex_color='ACTIVE',
    export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
    export_animations=False, export_extras=False,
)
