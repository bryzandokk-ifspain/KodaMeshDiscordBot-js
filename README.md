# RobloxImageBot

Bot de Discord para flujos de trabajo de recursos de Roblox y conversión de resource packs de Minecraft Java.

## Funciones

El repositorio incluye los comandos y el sistema de generación de mallas del bot:

- Procesamiento y conversión de resolución de imágenes.
- Conversión de imágenes transparentes a MeshParts.
- Conversión y previsualización de resource packs.
- Conversión de texturas de cielo y lana.
- Subida de imágenes y audio a Roblox.
- Visualización y exportación ZIP de avatares de Roblox.
- Asistente de IA opcional, que requiere una API key de OpenAI.

Los comandos se ejecutan mediante slash commands de Discord. El bot carga automáticamente los módulos válidos de la carpeta `commands/`.

## Requisitos

- Node.js 18 o superior.
- Una aplicación y un bot creados en Discord.
- Una cuenta de Roblox con permisos para subir recursos.
- Una API key de Roblox Open Cloud con los permisos de Assets necesarios.
- Una API key de OpenAI solo si vas a utilizar `/aichat`.

## Instalación

1. Descarga o clona este repositorio.
2. Abre una terminal dentro de la carpeta del proyecto.
3. Instala las dependencias:

   ```bash
   npm install
   ```

4. Copia `.env.example` y cambia el nombre de la copia a `.env`.
5. Completa las variables de `.env` siguiendo las instrucciones de abajo.
6. Inicia el bot:

   ```bash
   npm start
   ```

**No subas nunca el archivo `.env` a GitHub.** Contiene credenciales privadas. El archivo `.gitignore` de este repositorio ya lo excluye.

## Configuración

### 1. Token de Discord e ID de la aplicación

1. Entra en el [Discord Developer Portal](https://discord.com/developers/applications).
2. Crea una aplicación o selecciona una que ya tengas.
3. Abre la sección **Bot** y crea el bot si todavía no existe.
4. Copia el token del bot y colócalo en `TOKEN` dentro de `.env`.
5. En **General Information**, copia el **Application ID** y colócalo en `CLIENT_ID`.
6. En **OAuth2 → URL Generator**, selecciona los scopes `bot` y `applications.commands`, elige los permisos que necesite el bot y utiliza la URL generada para invitarlo a tu servidor.

El token de Discord funciona como una contraseña. No lo publiques ni lo compartas.

### 2. Crear una API key de Roblox Open Cloud

El bot utiliza Roblox Open Cloud para subir recursos. Necesitas una API key con permisos para gestionar assets.

1. Inicia sesión en el [Roblox Creator Dashboard](https://create.roblox.com/).
2. Abre la página de [API Keys](https://create.roblox.com/credentials).
3. Pulsa **Create API Key**.
4. Escribe un nombre identificable, por ejemplo `RobloxImageBot`.
5. En **Access Permissions**, añade el sistema API **Assets**.
6. Si el panel permite limitar la clave a una experiencia, selecciona la experiencia correspondiente.
7. En las operaciones de Assets, habilita los permisos **Read** y **Write** que necesite la subida y consulta de recursos.
8. Guarda y genera la clave.
9. Copia la clave generada en `ROBLOX_API_KEY` dentro de `.env`.

Configura únicamente los permisos y recursos que necesite el bot. La API key equivale a una contraseña: no la publiques, no la incluyas en el código y no la subas a GitHub.

Documentación oficial de Roblox:
- [Administrar API keys](https://create.roblox.com/docs/cloud/auth/api-keys)
- [Guía de uso de Assets API](https://create.roblox.com/docs/cloud/guides/usage-assets)

### 3. Configurar el creador de los recursos de Roblox

Indica dónde quieres que se publiquen los recursos:

- `ROBLOX_CREATOR_ID`: tu ID de usuario de Roblox o el ID del grupo.
- `ROBLOX_IS_GROUP`: utiliza `false` si publicarás en tu cuenta personal y `true` si publicarás en un grupo.

Para encontrar el ID de usuario, abre tu perfil de Roblox. Es el número que aparece en la URL del perfil.

Para encontrar el ID de grupo, abre la página del grupo. Es el número que aparece en su URL.

Si publicas en un grupo, la cuenta que creó la API key debe tener los permisos necesarios dentro de ese grupo.

### 4. OpenAI (opcional)

El comando `/aichat` utiliza la API de OpenAI. Si quieres habilitarlo:

1. Crea una API key en [OpenAI Platform](https://platform.openai.com/api-keys).
2. Colócala en `OPENAI_API_KEY` dentro de `.env`.
3. Opcionalmente, configura `OPENAI_MODEL` para seleccionar el modelo.

Esta clave no es necesaria para los demás comandos del bot.

## Variables de entorno

| Variable | ¿Obligatoria? | Descripción |
|---|---|---|
| `TOKEN` | Sí | Token del bot de Discord |
| `CLIENT_ID` | Sí | Application ID de Discord |
| `GUILD_ID` | No | ID opcional de un servidor usado para limpiar un registro antiguo de comandos por servidor |
| `ROBLOX_API_KEY` | Para subir recursos | API key de Roblox Open Cloud |
| `ROBLOX_CREATOR_ID` | Para subir recursos | ID de usuario o de grupo de Roblox |
| `ROBLOX_IS_GROUP` | Para subir recursos | `true` si el creador es un grupo; de lo contrario `false` |
| `OPENAI_API_KEY` | No | Solo se necesita para `/aichat` |
| `OPENAI_MODEL` | No | Modelo opcional para `/aichat` |

## Comandos

El bot carga los módulos de comandos válidos de forma automática y registra sus slash commands al iniciarse. El proyecto incluye:

- `/aichat`
- `/idsound`
- `/imageresolution`
- `/imagetomesh3id`
- `/portpack`
- `/previewpack`
- `/rblxavatarzip`
- `/robloxavatar3d`
- `/robloximageid`
- `/skyimages`
- `/woolimages`

Algunos comandos necesitan permisos de Roblox Open Cloud y archivos adjuntos o ZIP de resource packs. `/aichat` necesita además `OPENAI_API_KEY`.

## Estructura del proyecto

```text
RobloxImageBot/
├── commands/              # Módulos de los slash commands
├── systems/
│   └── mesh-generator/    # Sistema de generación de mallas
├── .env.example           # Plantilla de variables de entorno
├── .gitignore
├── index.js               # Inicio del bot y registro de comandos
├── package.json
└── package-lock.json
```

## Solución de problemas

- **Falta `TOKEN` o `CLIENT_ID`:** comprueba que `.env` esté en la carpeta principal y que los nombres de las variables coincidan con `.env.example`.
- **Roblox rechaza una subida:** comprueba que la API key esté activa, que el ID del creador sea correcto y que la clave tenga los permisos de Assets necesarios.
- **`/aichat` indica que falta una clave:** configura `OPENAI_API_KEY` en `.env`. Esta clave es opcional para el resto del bot.
- **No aparece un comando:** mantén el bot conectado durante el inicio para que registre los slash commands y comprueba que lo invitaste con el scope `applications.commands`.

## Seguridad

- Mantén `.env` privado y fuera del control de versiones.
- No pegues tokens ni API keys en issues, pull requests, capturas o chats.
- Si una credencial se expone, revócala o genera una nueva desde el servicio que la emitió.
- Concede a cada API key únicamente los permisos necesarios.

## Licencia

Este proyecto utiliza la licencia MIT. Consulta el archivo [LICENSE](LICENSE).
