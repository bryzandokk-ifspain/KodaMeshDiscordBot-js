# KodaMesh Discord Bot

A Discord bot for working with Roblox assets and Minecraft-style texture packs. It includes image and audio uploads, texture-pack conversion, avatar tools, and optional AI chat.

## Features

| Command | Description |
| --- | --- |
| `/aichat` | Chat with the configured OpenAI model. Requires `OPENAI_API_KEY`. |
| `/idsound` | Upload an audio file to Roblox and return its Sound ID. |
| `/imageresolution` | Convert an image to 1024 × 1024 while preserving its pixel-art appearance. |
| `/imagetomesh3id` | Convert a transparent image into a Roblox 3D MeshPart workflow. |
| `/portpack` | Convert a Minecraft 1.8.9 texture pack into Bridge Duels JSON. |
| `/previewpack` | Generate a visual preview of a Bridge Duels texture pack. |
| `/rblxavatarzip` | Download a Roblox avatar as a ZIP file. |
| `/robloxavatar3d` | Display a Roblox user's 3D avatar. |
| `/robloximageid` | Upload an image to Roblox and return its asset ID. |
| `/skyimages` | Import sky textures from a ZIP file. |
| `/woolimages` | Convert Minecraft Java wool/clay textures into Roblox image IDs. |

Some commands use Roblox Open Cloud. `/aichat` is optional and only works when an OpenAI API key is configured.

## Requirements

- Node.js **22.15.0 or newer**.
- A Discord application and bot.
- A Roblox account with permission to upload/manage assets for the target experience.
- A Roblox Open Cloud API key with the permissions required by the features you intend to use.
- An OpenAI API key only if you want to use `/aichat`.

## Installation

1. Download or clone this repository.
2. Open a terminal in the project folder.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Create your environment file by copying `.env.example` to `.env`.
5. Fill in the values described below.
6. Start the bot:

   ```bash
   npm start
   ```

The bot loads command files from `commands/` and registers its slash commands globally when it starts. Global command updates can take some time to appear in Discord.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `TOKEN` | Yes | Discord bot token. |
| `CLIENT_ID` | Yes | Discord application ID. |
| `GUILD_ID` | No | Optional server ID used for logging and clearing a previous guild-specific command registration. |
| `ROBLOX_API_KEY` | For Roblox upload commands | Roblox Open Cloud API key. |
| `ROBLOX_CREATOR_ID` | For Roblox upload commands | Your Roblox user ID, or the group ID if uploading under a group. |
| `ROBLOX_IS_GROUP` | For Roblox upload commands | Set to `true` when `ROBLOX_CREATOR_ID` is a group ID; otherwise use `false`. |
| `ROBLOX_UNIVERSE_ID` | For `/portpack` and `/imagetomesh3id` | Universe ID of the experience used by the mesh workflow. |
| `ROBLOX_PLACE_ID` | For `/portpack` and `/imagetomesh3id` | Start Place ID used by the mesh workflow. |
| `OPENAI_API_KEY` | No | OpenAI API key for `/aichat`. |
| `OPENAI_MODEL` | No | Optional model override for `/aichat`. |

Do not put real credentials in `.env.example`, source files, screenshots, issues, or public messages.

## Creating a Discord bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select **New Application** and give it a name.
3. Open the application's **Bot** section and create the bot if necessary.
4. Copy the bot token and place it in `.env` as `TOKEN`.
5. Copy the application's **Application ID** from **General Information** and place it in `.env` as `CLIENT_ID`.
6. Under **OAuth2 → URL Generator**, select the scopes `bot` and `applications.commands`.
7. Select the bot permissions it needs, generate the invite URL, and invite it to your server.

Treat the bot token like a password. Never publish it.

## Creating a Roblox Open Cloud API key

Roblox API keys are created in the Creator Dashboard:

1. Open the [Roblox Creator Dashboard API Keys page](https://create.roblox.com/dashboard/credentials).
2. Select **Create API Key**.
3. Give the key a recognizable name, such as `RobloxImageBot`.
4. Under **Access Permissions**, add the API systems and operations required by the commands you plan to use. This project uses Roblox asset upload/management endpoints and, for the mesh workflow, Cloud Luau execution-session endpoints. Check the current Roblox API documentation for the exact permissions required by each endpoint.
5. Restrict the key to the intended experience whenever the selected API system supports experience-level restrictions.
6. Use the minimum permissions necessary. Add IP restrictions where practical, and set an expiration date if it fits your key-rotation process.
7. Select **Save & Generate key**, then copy the generated key.
8. Put the key in `.env` as `ROBLOX_API_KEY`.

The API key is a secret credential. Do not commit it to Git, share it in public support channels, or include it in screenshots.

For group-owned experiences, make sure the account that creates the key has the required group role and permissions. Consider using a dedicated account with only the access needed for the bot.

### Roblox IDs

Set the following values in `.env`:

- `ROBLOX_CREATOR_ID`: your Roblox user ID when uploading under your account, or the group ID when uploading under a group.
- `ROBLOX_IS_GROUP`: `true` for a group ID; `false` for a user ID.
- `ROBLOX_UNIVERSE_ID`: the experience's Universe ID.
- `ROBLOX_PLACE_ID`: the experience's Start Place ID.

You can find the Universe ID and Start Place ID in the Creator Dashboard by opening the experience's overflow menu. Roblox's [Cloud API documentation](https://create.roblox.com/docs/cloud) explains the Open Cloud APIs and resource identifiers.

## Optional: OpenAI setup

To enable `/aichat`:

1. Create an API key in the [OpenAI API platform](https://platform.openai.com/api-keys).
2. Add it to `.env` as `OPENAI_API_KEY`.
3. Optionally set `OPENAI_MODEL` to a model available to your API account.

If you do not configure `OPENAI_API_KEY`, the rest of the bot can still be used; `/aichat` will not be available for successful AI requests.

## Project structure

```text
RobloxImageBot/
├── commands/
│   ├── aichat.js
│   ├── idsound.js
│   ├── imageresolution.js
│   ├── imagetomesh3id.js
│   ├── portpack.js
│   ├── previewpack.js
│   ├── rblxavatarzip.js
│   ├── robloxavatar3d.js
│   ├── robloximageid.js
│   ├── skyimages.js
│   └── woolimages.js
├── systems/
│   └── mesh-generator/
├── .env.example
├── .gitignore
├── index.js
├── package-lock.json
└── package.json
```

## Security

- `.env` is ignored by Git. Keep your real credentials there.
- Never commit `.env`, bot tokens, API keys, private keys, or other secrets.
- If a credential is exposed, revoke or rotate it immediately.
- Before publishing changes, review the staged files and repository history for accidental secrets.
- Do not grant the Roblox API key broader permissions than the bot needs.

## Troubleshooting

- **The bot does not start:** check that Node.js is at least 22.15.0, run `npm install`, and verify that `TOKEN` and `CLIENT_ID` are set.
- **Slash commands do not appear:** confirm the bot was invited with the `applications.commands` scope, check the startup logs for command-loading errors, and allow time for global command registration to propagate.
- **Roblox uploads fail:** verify the API key is active, the creator ID and group setting are correct, and the key has the required API permissions for the endpoint.
- **Mesh workflow fails:** verify `ROBLOX_UNIVERSE_ID` and `ROBLOX_PLACE_ID`, and confirm the API key has access to the target experience and the required Cloud Luau execution permissions.
- **AI chat fails:** check `OPENAI_API_KEY` and ensure the configured model is available to your API account.

## Official documentation

- [Roblox: Manage API keys](https://create.roblox.com/docs/cloud/auth/api-keys)
- [Roblox: Cloud API reference](https://create.roblox.com/docs/cloud)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.js Guide](https://discordjs.guide/)
- [OpenAI API keys](https://platform.openai.com/api-keys)

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE).
