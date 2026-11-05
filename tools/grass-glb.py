"""Turns the "grass yellowing" patch into one small GLB, ready to be coloured in the game.

"grass yellowing" by Steve B, https://poly.pizza/m/eFUpFgjCf0p, CC BY 3.0. Its blades are joined
into one mesh, centred on its footprint, standing on the ground, with its widest side 1 long.
Each blade's material becomes a part, stored in the red channel of the vertex colours as
part / 3 (fresh 0, deep 1/3, yellowing 2/3); the game paints each part from one of its grass
palettes (GRASS_PALETTES in src/palette.ts).

    blender -b --factory-startup --python tools/grass-glb.py -- \\
        model.obj src/assets/models/grass.glb
"""
import bpy, sys, mathutils
path, out = sys.argv[sys.argv.index('--') + 1:]

# The model's materials: light green, dark green and yellow blades.
PARTS = {'mat9': 0, 'mat10': 1, 'mat12': 2}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=path)
blades = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in blades:
    o.select_set(True)
bpy.context.view_layer.objects.active = blades[0]
bpy.ops.object.join()
grass = bpy.context.view_layer.objects.active
grass.name = grass.data.name = 'grass'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

m = grass.data
colours = m.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
for p in m.polygons:
    c = (PARTS[m.materials[p.material_index].name] / 3, 0.0, 0.0, 1.0)
    for l in p.loop_indices:
        colours.data[l].color = c
m.color_attributes.active_color = colours
for layer in list(m.uv_layers):
    m.uv_layers.remove(layer)
m.materials.clear()

xs = [v.co.x for v in m.vertices]; ys = [v.co.y for v in m.vertices]; zs = [v.co.z for v in m.vertices]
size = max(max(xs) - min(xs), max(ys) - min(ys))
shift = mathutils.Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)))
for v in m.vertices:
    v.co = (v.co - shift) / size
print('GRASS faces', len(m.polygons), 'height', round((max(zs) - min(zs)) / size, 3))

bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', export_materials='NONE', export_vertex_color='ACTIVE',
    export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
    export_animations=False, export_extras=False,
)
