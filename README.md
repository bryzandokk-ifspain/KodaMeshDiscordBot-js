# RobloxImageBot

Discord bot para convertir y procesar recursos de Minecraft/Roblox y trabajar con Roblox Open Cloud.

## Comandos incluidos

- `/idsound` — procesa audio y trabaja con assets de sonido de Roblox.
- `/imageresolution` — consulta/procesa resoluciones de imágenes.
- `/imagetomesh3id` — convierte una imagen en un mesh 3D y obtiene su MeshId.
- `/portpack` — convierte un Resource Pack de Minecraft en un JSON para Bridge Duels.
- `/previewpack` — genera una vista previa de un pack JSON.
- `/rblxavatarzip` — descarga un avatar 3D de Roblox y lo empaqueta.
- `/robloxavatar3d` — herramientas relacionadas con avatares 3D.
- `/robloximageid` — herramientas para imágenes de Roblox.
- `/skyimages` — procesa las texturas de cielo de un Resource Pack.
- `/woolimages` — procesa texturas de lana.

## Requisitos

- Node.js 20+ recomendado.
- Windows si vas a usar las funciones que dependen de Blender.
- Blender 4.4 instalado en la ruta configurada en los comandos que lo utilizan.
- Una aplicación/bot de Discord.
- Una API Key de Roblox Open Cloud con los permisos necesarios.
- Un Universe y Place de Roblox configurados para las funciones que ejecutan Luau.

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/TU-USUARIO/RobloxImageBot.git
cd RobloxImageBot
```

2. Instala dependencias:

```bash
npm install
```

3. Copia `.env.example` a `.env`.

4. Rellena `.env` con tus credenciales reales. **Nunca subas `.env` a GitHub.**

5. Revisa la ruta de Blender en los comandos que generan FBX si tu instalación está en otra carpeta.

6. Inicia el bot:

```bash
npm start
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `TOKEN` | Token privado del bot de Discord |
| `CLIENT_ID` | Application ID del bot |
| `GUILD_ID` | Servidor donde registrar comandos durante desarrollo |
| `ROBLOX_API_KEY` | API Key de Roblox Open Cloud |
| `ROBLOX_CREATOR_ID` | Usuario o grupo propietario de los assets |
| `ROBLOX_IS_GROUP` | `true` si el creator es un grupo |
| `ROBLOX_UNIVERSE_ID` | Universe usado por las tareas Luau |
| `ROBLOX_PLACE_ID` | Place usado por las tareas Luau |

## Seguridad

No publiques tokens, API keys, cookies, archivos `.env`, ni otros secretos. Si una credencial real fue expuesta, revócala y genera una nueva antes de publicar el repositorio.

## Estructura

```text
RobloxImageBot/
├── commands/
├── create_image_mesh.py
├── convert_obj_to_fbx.py
├── index.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

## Licencia

Este proyecto se publica bajo MIT. Revisa las licencias de las dependencias de npm y de cualquier recurso de terceros que distribuyas junto al bot.
