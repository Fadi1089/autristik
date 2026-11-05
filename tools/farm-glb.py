"""Turns five farm animals, a silo and a clump of wheat into one small GLB for the yellow squares.

"Cow", "Bull", "Horse", "Donkey" and "Deer" by Quaternius (CC0), https://poly.pizza/m/26zM1outCr,
https://poly.pizza/m/a8PIIYwF7r, https://poly.pizza/m/qvTrSG9pZF, https://poly.pizza/m/qmX6nhnvp7
and https://poly.pizza/m/T6Cs7tmMHJ: rigged and animated, each is posed twice, standing (the
first frame of Idle) and grazing (partway through Eating, its head down), and frozen in that pose.
They keep their own colours, one per material, in the vertex colours.

"Silo" by Poly by Google, https://poly.pizza/m/8UPiiP129yz, and "Field of wheat" by Poly by
Google, https://poly.pizza/m/eWhaaKNh755, both CC BY 3.0, take their colours from a texture, which
the game doesn't use: the silo keeps them, sampled face by face into the vertex colours; the
wheat is sorted face by face into a part, ears or stalks, stored in the red channel as part / 3
(ears 0, stalks 1/3), for the game to paint from its wheat palettes (WHEAT_PALETTES in
src/palette.ts).

Each model ends up centred on its footprint, standing on the ground: the animals 1 long, the
silo 1 high and the wheat 1 across its widest side. The GLB is meshopt-compressed.

    blender -b --factory-startup --python tools/farm-glb.py -- \\
        Cow.fbx Bull.fbx Horse.fbx Donkey.fbx Deer.fbx PUSHILIN_silo.obj "FieldOfWheat(1).obj" \\
        src/assets/models/farm.glb
"""
import bpy, sys, mathutils
*animals, silo_path, wheat_path, out = sys.argv[sys.argv.index('--') + 1:]

# Share of the way through Eating where the head is down in the grass.
GRAZING = 0.4

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
models = []

def deselect():
    for o in bpy.context.scene.objects:
        o.select_set(False)

def settle(mesh, size_of):
    """Centres `mesh` on its footprint, on the ground, scaled so size_of(extent) is 1."""
    vs = [v.co for v in mesh.vertices]
    lo = mathutils.Vector([min(v[i] for v in vs) for i in range(3)])
    hi = mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
    scale = 1 / size_of(hi - lo)
    shift = mathutils.Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
    for v in mesh.vertices:
        v.co = (v.co - shift) * scale

def colour(mesh, colour_of):
    """Paints each face one colour, from colour_of(face), and drops the rest."""
    for layer in list(mesh.color_attributes):
        mesh.color_attributes.remove(layer)
    colours = mesh.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for p in mesh.polygons:
        c = colour_of(p)
        for l in p.loop_indices:
            colours.data[l].color = (*c, 1.0)
    mesh.color_attributes.active_color = colours
    for layer in list(mesh.uv_layers):
        mesh.uv_layers.remove(layer)
    mesh.materials.clear()

def keep(name, mesh):
    o = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(o)
    models.append(o)
    print('MODEL', name, 'faces', len(mesh.polygons))

def base_colour(material):
    node = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    return tuple(node.inputs['Base Color'].default_value[:3])

def sampler(image):
    w, h = image.size
    pixels = image.pixels[:]
    def sample(mesh, p):
        uv = mesh.uv_layers[0].data
        u = sum(uv[l].uv.x for l in p.loop_indices) / p.loop_total
        v = sum(uv[l].uv.y for l in p.loop_indices) / p.loop_total
        x = min(w - 1, max(0, int(u % 1 * w))); y = min(h - 1, max(0, int(v % 1 * h)))
        i = (y * w + x) * 4
        return pixels[i:i + 3]
    return sample

# The animals, each frozen in two poses.
for path in animals:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    body = next(o for o in new if o.type == 'MESH')
    rig = next(o for o in new if o.type == 'ARMATURE')
    # Named after the file: the bull's mesh is called Cow too.
    name = bpy.path.display_name_from_filepath(path).lower()
    actions = {a.name.split('|')[-1]: a for a in bpy.data.actions if a.name.startswith('AnimalArmature|') and a.name.count('|') == 1}
    rig.animation_data_create()
    for pose, action, share in (('standing', 'Idle', 0.0), ('grazing', 'Eating', GRAZING)):
        rig.animation_data.action = actions[action]
        first, last = actions[action].frame_range
        scene.frame_set(int(first + (last - first) * share))
        evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=bpy.context.evaluated_depsgraph_get())
        mesh.transform(body.matrix_world)
        colours = [base_colour(m) for m in body.data.materials]
        colour(mesh, lambda p: colours[p.material_index])
        settle(mesh, lambda size: max(size.x, size.y))
        keep(f'{name}-{pose}', mesh)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    for o in new:
        bpy.data.objects.remove(o)

def import_obj(path):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path)
    o = next(o for o in bpy.data.objects if o not in before and o.type == 'MESH')
    deselect(); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o

# The silo, in its own colours.
silo = import_obj(silo_path)
sample = sampler(silo.data.materials[0].node_tree.nodes['Image Texture'].image)
mesh = silo.data.copy()
colours = [sample(silo.data, p) for p in silo.data.polygons]
# Texture colours are sRGB; vertex colours are linear.
linear = lambda c: tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
colour(mesh, lambda p: linear(colours[p.index]))
settle(mesh, lambda size: size.z)
# Out of the way first, so the model can take its name.
bpy.data.objects.remove(silo)
keep('silo', mesh)

# The wheat, sorted into ears and stalks by how light the texture is under each face.
wheat = import_obj(wheat_path)
sample = sampler(wheat.data.materials[0].node_tree.nodes['Image Texture'].image)
mesh = wheat.data.copy()
lightness = [sum(sample(wheat.data, p)) / 3 for p in wheat.data.polygons]
split = sorted(lightness)[len(lightness) // 2]
colour(mesh, lambda p: (0.0 if lightness[p.index] > split else 1 / 3, 0.0, 0.0))
settle(mesh, lambda size: max(size.x, size.y))
bpy.data.objects.remove(wheat)
keep('wheat', mesh)

for o in list(bpy.data.objects):
    if o not in models:
        bpy.data.objects.remove(o)

bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', export_materials='NONE', export_vertex_color='ACTIVE',
    export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
    export_animations=False, export_skins=False, export_extras=False,
    # The animals are detailed; meshopt keeps the file small, and the game decodes it itself.
    export_meshopt_compression_enable=True,
)
