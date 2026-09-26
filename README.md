# RobloxImageBot

Discord bot to convert and process Minecraft/Roblox resources and work with Roblox Open Cloud and OpenAI

## Included commands

* `/idsound` — processes audio and works with Roblox sound assets.  
* `/imageresolution` — checks/processes image resolutions.  
* `/imagetomesh3id` — converts an image into a 3D mesh and gets its MeshId.  
* `/portpack` — converts a Minecraft Resource Pack into a JSON for Bridge Duels.  
* `/previewpack` — generates a preview of a JSON pack.  
* `/rblxavatarzip` — downloads a 3D Roblox avatar and packages it.  
* `/robloxavatar3d` — tools related to 3D avatars.  
* `/robloximageid` — tools for Roblox images.  
* `/skyimages` — processes sky textures from a Resource Pack.  
* `/woolimages` — processes wool textures.

## Requirements

* Node.js 20+ recommended.  
* Windows if you're going to use the functions that depend on Blender.  
* Blender 4.4 installed in the path configured in the commands that use it.  
* A Discord app/bot.  
* A Roblox Open Cloud API Key with the necessary permissions.  
* A Roblox Universe and Place set up for the functions that run Luau.

## Installation

1. Clone the repository:

```bash

git clone https://github.com/YOUR-USERNAME/RobloxImageBot.git

cd RobloxImageBot

```

2\. Install dependencies:

```bash

npm install

```

3\. Copy `.env.example` to `.env`.

4\. Fill in `.env` with your real credentials. Never upload `.env` to GitHub.

5\. Check the Blender path in the commands that generate FBX if your installation is in a different folder.

6\. Start the bot:

```bash

npm start

```

## Environment variables

|Variable|Use|
|-|-|
|`TOKEN`|Private Discord bot token|
|`CLIENT\\\_ID`|Bot Application ID|
|`GUILD\\\_ID`|Server to register commands during development|
|`ROBLOX\\\_API\\\_KEY`|Roblox Open Cloud API Key|
|`ROBLOX\\\_CREATOR\\\_ID`|User or group that owns the assets|
|`ROBLOX\\\_IS\\\_GROUP`|`true` if the creator is a group|
|`ROBLOX\\\_UNIVERSE\\\_ID`|Universe used by Luau tasks|
|`ROBLOX\\\_PLACE\\\_ID`|Place used for Luau tasks|

## Security

Don't post tokens, API keys, cookies, `.env` files, or other secrets. If a real credential was exposed, revoke it and generate a new one before posting the repository.

## Estructura

```text
RobloxImageBot/
├── commands/
├── create\\\_image\\\_mesh.py
├── convert\\\_obj\\\_to\\\_fbx.py
├── index.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

## License

MIT License



Copyright (c) 2026 \[@bryzando-ifspain]



This project is published under MIT. Check the licenses of the npm dependencies and any third-party resources you distribute along with the bot.

