import bpy
import sys

# Limpiar la escena
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Argumentos
argv = sys.argv
argv = argv[argv.index("--") + 1:]

obj_path = argv[0]
fbx_path = argv[1]

# Importar OBJ
bpy.ops.wm.obj_import(filepath=obj_path)

# Seleccionar el objeto importado
obj = bpy.context.selected_objects[0]
bpy.context.view_layer.objects.active = obj

# ============================================================
# ROTACIÓN DEL MODELO
# ============================================================

obj.rotation_euler[0] = 90 * 3.141592653589793 / 180
obj.rotation_euler[1] = -45 * 3.141592653589793 / 180
obj.rotation_euler[2] = 0

# Aplicar rotación
bpy.ops.object.transform_apply(
    location=False,
    rotation=True,
    scale=False
)

# ============================================================
# SOLIDIFY
# ============================================================

solidify = obj.modifiers.new(
    name="Solidify",
    type='SOLIDIFY'
)

solidify.thickness = 0.10
solidify.offset = 0.0
solidify.use_even_offset = True
solidify.use_quality_normals = True

# Aplicar el modifier
bpy.ops.object.modifier_apply(
    modifier="Solidify"
)

# ============================================================
# EXPORTAR FBX
# ============================================================

bpy.ops.export_scene.fbx(
    filepath=fbx_path,
    use_selection=False,
    apply_scale_options='FBX_SCALE_ALL',
    axis_forward='-Z',
    axis_up='Y'
)

print(
    f"Converted + Solidify + Rotation: "
    f"{obj_path} -> {fbx_path}"
)