"""Turns the straight stone path into the four road pieces the game lays: straight, turn, T and cross.

"Path Straight" by Quaternius, https://poly.pizza/m/ZuRHRsKWoz, CC0, kept as
tools/path-straight.glb: a strip of loose stones running along Blender's Y, in two materials,
Stone_Light and Stone_Dark. It is centred and scaled to cross a cell 1 long, edge to
edge. Each piece lies on a cell from -0.5 to 0.5, and joins the middles of the edges it names, in
Blender's axes (+Y is north, +X east, so the game's -z and +x):

    road-straight  north, south     the strip as it is
    road-turn      south, east      the strip bent into a quarter circle round the south-east corner
    road-tee       north, south, east       the strip, and the east half of it turned across
    road-cross     north, south, east, west the strip, and both halves of it turned across

The game turns each piece to fit. The vertex colours carry two numbers for each stone: its
material in red (light 0, dark 1), and in green which stone it is, as id / 256, so the game
can pop the stones up one at a time.

    blender -b --factory-startup --python tools/road-glb.py -- \\
        tools/path-straight.glb src/assets/models/road.glb
"""
import bpy, bmesh, sys, math, mathutils
path, out = sys.argv[sys.argv.index('--') + 1:]

PARTS = {'Stone_Light': 0, 'Stone_Dark': 1}
# Cuts across the strip before it is bent, so long stones curve rather than stay straight.
BEND_CUTS = 24

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
source = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = source
source.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def strip():
    """The stones as a bmesh, centred, on the ground, 1 long along Y, with each face's part kept."""
    bm = bmesh.new()
    bm.from_mesh(source.data)
    names = [m.name.split('.')[0] for m in source.data.materials]
    for f in bm.faces:
        f.material_index = PARTS[names[f.material_index]]
        f.smooth = False
    # The glTF splits each stone's corners apart; weld them, so each stone is one piece again.
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]; zs = [v.co.z for v in bm.verts]
    size = max(ys) - min(ys)
    shift = mathutils.Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)))
    for v in bm.verts:
        v.co = (v.co - shift) / size
    return bm

_strip = strip()
HALF_WIDTH = max(abs(v.co.x) for v in _strip.verts)
_strip.free()

def cut(bm, co, no):
    """Keeps what lies on the side of the plane (co, no) that `no` points to, closing the cut."""
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_inner=True)
    edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    bmesh.ops.holes_fill(bm, edges=edges)

def arm(side):
    """The strip turned across, keeping only the part east (side 1) or west (side -1) of the main strip."""
    bm = strip()
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=mathutils.Matrix.Rotation(math.pi / 2, 3, 'Z'))
    cut(bm, (side * HALF_WIDTH, 0, 0), (side, 0, 0))
    return bm

def bend(bm):
    """
    Bends the strip into a quarter circle from the middle of the south edge to the middle of the
    east edge, round the south-east corner: along the strip becomes round the corner, and across
    it becomes the distance from the corner.
    """
    for i in range(1, BEND_CUTS):
        y = -0.5 + i / BEND_CUTS
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, y, 0), plane_no=(0, 1, 0))
    for v in bm.verts:
        angle = (v.co.y + 0.5) * math.pi / 2
        radius = 0.5 - v.co.x
        v.co.x = 0.5 - radius * math.cos(angle)
        v.co.y = -0.5 + radius * math.sin(angle)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

def join(*parts):
    bm = bmesh.new()
    for part in parts:
        mesh = bpy.data.meshes.new('tmp'); part.to_mesh(mesh); bm.from_mesh(mesh)
    return bm

pieces = {
    'road-straight': strip(),
    'road-turn': strip(),
    'road-tee': join(strip(), arm(1)),
    'road-cross': join(strip(), arm(1), arm(-1)),
}
bend(pieces['road-turn'])

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)

for name, bm in pieces.items():
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    # Number the stones: each loose part of the mesh is one.
    stone = [-1] * len(mesh.vertices)
    neighbours = [[] for _ in mesh.vertices]
    for e in mesh.edges:
        a, b = e.vertices
        neighbours[a].append(b); neighbours[b].append(a)
    stones = 0
    for start in range(len(mesh.vertices)):
        if stone[start] >= 0: continue
        stack = [start]
        while stack:
            v = stack.pop()
            if stone[v] >= 0: continue
            stone[v] = stones
            stack += neighbours[v]
        stones += 1
    assert stones < 256, f'{name} has {stones} stones, more than its colours can number'
    colours = mesh.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for p in mesh.polygons:
        for l in p.loop_indices:
            colours.data[l].color = (p.material_index, stone[mesh.loops[l].vertex_index] / 256, 0.0, 1.0)
    mesh.color_attributes.active_color = colours
    for layer in list(mesh.uv_layers):
        mesh.uv_layers.remove(layer)
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    print('PIECE', name, 'stones', stones, 'faces', len(mesh.polygons))

bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', export_materials='NONE', export_vertex_color='ACTIVE',
    export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
    export_animations=False, export_extras=False,
)
