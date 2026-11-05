"""Turns two low-poly forests into one small GLB of seventeen trees, ready to be coloured in the game.

"Forest" by Nathan Merrill, https://poly.pizza/m/79xo-C_-n1J, CC BY 3.0: sixteen copies of one
leafy tree, of which the first is kept. "Forest" by Poly by Google, https://poly.pizza/m/2_fv3tn3NG_,
CC BY 3.0: one mesh of sixteen trees, pines and round-topped ones, each made of a trunk and one
to three crowns as loose parts; each crown is joined to the trunk nearest beneath it.

Both take their colours from a texture, which the game doesn't use: each face is sorted by the
colour under it into a part, light leaves, dark leaves or trunk, stored in the red channel of
the vertex colours as part / 3 (light 0, dark 1/3, trunk 2/3); the game paints each part from
one of its forest palettes (FOREST_PALETTES and AUTUMN_PALETTES in src/palette.ts). Each tree
ends up standing on the ground at the foot of its trunk, the Poly trees keeping their sizes
against one another with the tallest 1 high, and the Merrill tree MERRILL_HEIGHT high.

    blender -b --factory-startup --python tools/trees-glb.py -- \\
        merrill/forest.obj poly/PUSHILIN_forest.obj src/assets/models/trees.glb
"""
import bpy, sys, mathutils
merrill_path, poly_path, out = sys.argv[sys.argv.index('--') + 1:]

LIGHT, DARK, TRUNK = 0, 1, 2
MERRILL_HEIGHT = 0.95

def part_of(rgb):
    r, g, b = rgb
    if r > g: return TRUNK
    return LIGHT if g > 0.5 else DARK

def sampler(image):
    w, h = image.size
    pixels = image.pixels[:]
    def sample(u, v):
        x = min(w - 1, max(0, int(u * w))); y = min(h - 1, max(0, int(v * h)))
        i = (y * w + x) * 4
        return pixels[i:i + 3]
    return sample

def face_colours(o, sample):
    uv = o.data.uv_layers[0].data
    for p in o.data.polygons:
        u = sum(uv[l].uv.x for l in p.loop_indices) / p.loop_total
        v = sum(uv[l].uv.y for l in p.loop_indices) / p.loop_total
        yield p, sample(u, v)

def import_obj(path):
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in new:
        o.select_set(False)
    return new

def paint(o, parts):
    """Stores each face's part, given face by face, in the vertex colours, and drops the rest."""
    m = o.data
    colours = m.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for p, part in zip(m.polygons, parts):
        for l in p.loop_indices:
            colours.data[l].color = (part / 3, 0.0, 0.0, 1.0)
    m.color_attributes.active_color = colours
    for layer in list(m.uv_layers):
        m.uv_layers.remove(layer)
    m.materials.clear()

def stand(o, foot, scale):
    """Moves the tree so `foot` (the bottom middle of its trunk) is at the origin, and scales it."""
    for v in o.data.vertices:
        v.co = (v.co - foot) * scale

def join(objects):
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.select_set(False)
    return joined

def foot_of(vertices):
    xs = [v.x for v in vertices]; ys = [v.y for v in vertices]
    return mathutils.Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(v.z for v in vertices)))

bpy.ops.wm.read_factory_settings(use_empty=True)
trees = []

# Merrill: one tree, its parts told apart face by face.
merrill = import_obj(merrill_path)
keep = next(o for o in merrill if o.name == 'tree01')
for o in merrill:
    if o is not keep: bpy.data.objects.remove(o)
sample = sampler(next(i for i in bpy.data.images if i.name.startswith('tree_texture')))
parts = [part_of(rgb) for _, rgb in face_colours(keep, sample)]
trunk = [keep.data.vertices[i].co for p, part in zip(keep.data.polygons, parts) if part == TRUNK for i in p.vertices]
height = max(v.co.z for v in keep.data.vertices) - min(v.co.z for v in keep.data.vertices)
paint(keep, parts)
stand(keep, foot_of(trunk), MERRILL_HEIGHT / height)
trees.append(keep)

# Poly: loose parts, each of one colour, sorted by its average colour.
poly = import_obj(poly_path)[0]
sample = sampler(next(i for i in bpy.data.images if i.name.startswith('PUSHILIN')))
bpy.context.view_layer.objects.active = poly
poly.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
pieces = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('forest')]
kinds = {}
for o in pieces:
    colours = [rgb for _, rgb in face_colours(o, sample)]
    kinds[o.name] = part_of(tuple(sum(c[i] for c in colours) / len(colours) for i in range(3)))
    paint(o, [kinds[o.name]] * len(o.data.polygons))
centre = lambda o: sum((v.co for v in o.data.vertices), mathutils.Vector()) / len(o.data.vertices)
trunks = [o for o in pieces if kinds[o.name] == TRUNK]
groups = {t.name: [t] for t in trunks}
for o in pieces:
    if kinds[o.name] == TRUNK: continue
    c = centre(o)
    nearest = min(trunks, key=lambda t: (centre(t).xy - c.xy).length)
    groups[nearest.name].append(o)
feet = {name: foot_of([v.co for v in group[0].data.vertices]) for name, group in groups.items()}
tallest = max(max(v.co.z for o in group for v in o.data.vertices) - feet[name].z for name, group in groups.items())
# In a steady order: west to east, then north to south.
for name in sorted(groups, key=lambda n: (round(feet[n].x, 2), round(feet[n].y, 2))):
    tree = join(groups[name])
    stand(tree, feet[name], 1 / tallest)
    trees.append(tree)

for i, tree in enumerate(trees):
    tree.name = tree.data.name = f'tree-{i}'
    tree.location = (0, 0, 0)
    zs = [v.co.z for v in tree.data.vertices]
    print('TREE', tree.name, 'faces', len(tree.data.polygons), 'height', round(max(zs), 3))

for o in list(bpy.data.objects):
    if o not in trees: bpy.data.objects.remove(o)

bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', export_materials='NONE', export_vertex_color='ACTIVE',
    export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
    export_animations=False, export_extras=False,
)
