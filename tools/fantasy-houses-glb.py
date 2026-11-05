"""Turns the Fantasy Houses kit into one small GLB of ten houses, coloured from the game's palette.

"Fantasy Houses" by burunduk, https://poly.pizza/m/AO4BeeUHLN, CC BY 3.0. The kit's colours live
in a palette image that doesn't ship with it, so each face is coloured by which swatch of that
palette its UVs point at: walls, roofs, stone and wood. Each house ends up centred on its
footprint, standing on the ground, with its widest side 1 long.

    blender -b --factory-startup --python tools/fantasy-houses-glb.py -- \
        "Fantasy houses Scatch.fbx" src/assets/models/fantasy-houses.glb
"""
import bpy, sys, mathutils
args = sys.argv[sys.argv.index('--') + 1:]
path, out = args

HOUSES = ['Box159', 'Box163', 'Box172', 'Box179', 'Box239', 'Box244', 'Box261', 'Box267', 'Box298', 'Object040']
WALL, STONE, WOOD = '#f1e3c6', '#b8a68d', '#7a5134'
ROOFS = ['#c4643c', '#5f6b7a', '#a8452f']

def linear(hex_colour):
    def channel(c):
        c = int(hex_colour[c:c + 2], 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (channel(1), channel(3), channel(5), 1.0)

def role(u, v, roof):
    if u > 0.7: return WALL
    if u > 0.38: return roof
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
    roof = ROOFS[i % len(ROOFS)]
    for p in m.polygons:
        u = sum(uv[l].uv.x for l in p.loop_indices) / p.loop_total
        v = sum(uv[l].uv.y for l in p.loop_indices) / p.loop_total
        c = linear(role(u, v, roof))
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
