const {
    SlashCommandBuilder,
    AttachmentBuilder,
    EmbedBuilder,
    ChannelType
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const sharp = require('sharp');


// ============================================================
// CONFIG
// ============================================================

const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const ROBLOX_CREATOR_ID = process.env.ROBLOX_CREATOR_ID;

const ROBLOX_IS_GROUP =
    String(process.env.ROBLOX_IS_GROUP).toLowerCase() === 'true';


// ============================================================
// IMAGE SIZE
// ============================================================

const FINAL_SIZE = 1024;


// ============================================================
// WOOL MAPPING
// ============================================================

const WOOL_MAPPING = {

    wool_colored_green: 'ClayGreen',
    wool_colored_blue: 'ClayBlue',
    wool_colored_orange: 'ClayOrange',
    wool_colored_gray: 'ClayGrey',
    wool_colored_cyan: 'ClayCyan',
    wool_colored_yellow: 'ClayYellow',
    wool_colored_purple: 'ClayPurple',
    wool_colored_red: 'ClayRed'

};


// ============================================================
// CLAY MAPPING
// ============================================================

const CLAY_MAPPING = {

    hardened_clay_stained_green: 'ClayGreen',
    hardened_clay_stained_blue: 'ClayBlue',
    hardened_clay_stained_orange: 'ClayOrange',
    hardened_clay_stained_gray: 'ClayGrey',
    hardened_clay_stained_cyan: 'ClayCyan',
    hardened_clay_stained_yellow: 'ClayYellow',
    hardened_clay_stained_purple: 'ClayPurple',
    hardened_clay_stained_red: 'ClayRed'

};


// ============================================================
// BRIDGE OVERLAY MAPPINGS
// ============================================================

const BRIDGE_OVERLAY_WOOL_MAPPING = {

    wool_colored_blue: 'ClayBlue',
    wool_colored_red: 'ClayRed'

};


const BRIDGE_OVERLAY_CLAY_MAPPING = {

    hardened_clay_stained_blue: 'ClayBlue',
    hardened_clay_stained_red: 'ClayRed'

};


// ============================================================
// DISCORD COMMAND
// ============================================================

module.exports = {

    data: new SlashCommandBuilder()

        .setName('woolimages')

        .setDescription(
            'Convert Minecraft Java wool or clay textures into Roblox Image IDs.'
        )

        .addAttachmentOption(option =>
            option
                .setName('zip')
                .setDescription(
                    'Upload the Minecraft Java texture pack ZIP.'
                )
                .setRequired(true)
        )

        .addBooleanOption(option =>
            option
                .setName('clayconvert')
                .setDescription(
                    'Use hardened_clay_stained_* textures instead of wool_colored_* textures.'
                )
                .setRequired(false)
        )

        .addBooleanOption(option =>
            option
                .setName('bridgeoverlay')
                .setDescription(
                    'Only convert the blue and red textures for Bridge Overlay.'
                )
                .setRequired(false)
        ),


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(interaction) {

        let tempDir = null;

        try {

            console.log(
                '[WOOLIMAGES] Command started.'
            );


            // ------------------------------------------------
            // ENV CHECK
            // ------------------------------------------------

            if (!ROBLOX_API_KEY) {

                throw new Error(
                    'ROBLOX_API_KEY is missing from .env'
                );
            }


            if (!ROBLOX_CREATOR_ID) {

                throw new Error(
                    'ROBLOX_CREATOR_ID is missing from .env'
                );
            }


            // ------------------------------------------------
            // OPTIONS
            // ------------------------------------------------

            const attachment =
                interaction.options.getAttachment('zip');

            const clayConvert =
                interaction.options.getBoolean('clayconvert') || false;

            const bridgeOverlay =
                interaction.options.getBoolean('bridgeoverlay') || false;


            if (!attachment) {

                throw new Error(
                    'No ZIP file was provided.'
                );
            }


            console.log(
                `[WOOLIMAGES] ZIP: ${attachment.name}`
            );

            console.log(
                `[WOOLIMAGES] Size: ${attachment.size} bytes`
            );

            console.log(
                `[WOOLIMAGES] Clay Convert: ${clayConvert}`
            );

            console.log(
                `[WOOLIMAGES] Bridge Overlay: ${bridgeOverlay}`
            );


            // ------------------------------------------------
            // VALIDATE ZIP
            // ------------------------------------------------

            const extension =
                path.extname(
                    attachment.name
                ).toLowerCase();


            if (extension !== '.zip') {

                throw new Error(
                    'The uploaded file must be a .zip file.'
                );
            }


            // ------------------------------------------------
            // DEFER
            // ------------------------------------------------

            await interaction.deferReply();


            // ------------------------------------------------
            // TEMP DIRECTORY
            // ------------------------------------------------

            tempDir =
                fs.mkdtempSync(
                    path.join(
                        os.tmpdir(),
                        'roblox-woolimages-'
                    )
                );


            const zipPath =
                path.join(
                    tempDir,
                    'texturepack.zip'
                );


            const extractDir =
                path.join(
                    tempDir,
                    'extracted'
                );


            const convertedDir =
                path.join(
                    tempDir,
                    'converted'
                );


            fs.mkdirSync(
                extractDir,
                {
                    recursive: true
                }
            );


            fs.mkdirSync(
                convertedDir,
                {
                    recursive: true
                }
            );


            // ------------------------------------------------
            // DOWNLOAD ZIP
            // ------------------------------------------------

            console.log(
                '[WOOLIMAGES] Downloading ZIP...'
            );


            const zipResponse =
                await fetch(
                    attachment.url
                );


            if (!zipResponse.ok) {

                throw new Error(
                    `Could not download ZIP. HTTP ${zipResponse.status}`
                );
            }


            const zipBuffer =
                Buffer.from(
                    await zipResponse.arrayBuffer()
                );


            fs.writeFileSync(
                zipPath,
                zipBuffer
            );


            console.log(
                '[WOOLIMAGES] ZIP downloaded.'
            );


            // ------------------------------------------------
            // EXTRACT ZIP
            // ------------------------------------------------

            console.log(
                '[WOOLIMAGES] Extracting ZIP...'
            );


            const zip =
                new AdmZip(zipPath);


            const entries =
                zip.getEntries();


            // ------------------------------------------------
            // ZIP SECURITY
            // ------------------------------------------------

            for (const entry of entries) {

                const entryName =
                    entry.entryName
                        .replace(/\\/g, '/');


                if (
                    entryName.startsWith('/') ||
                    entryName.includes('../') ||
                    entryName.includes('..\\')
                ) {

                    throw new Error(
                        `Unsafe ZIP path detected: ${entryName}`
                    );
                }
            }


            zip.extractAllTo(
                extractDir,
                true
            );


            // ------------------------------------------------
            // PACK HISTORY IMAGE
            // ------------------------------------------------

            const packImagePath = path.join(
                extractDir,
                'pack.png'
            );


            if (fs.existsSync(packImagePath)) {

                console.log(
                    '[BLOCKS-OVERLAY-HISTORY] pack.png found at ZIP root.'
                );

            } else {

                console.log(
                    '[BLOCKS-OVERLAY-HISTORY] pack.png not found at ZIP root. History post will be skipped.'
                );
            }


            console.log(
                '[WOOLIMAGES] ZIP extracted.'
            );


            // ------------------------------------------------
            // FIND BLOCKS
            // ------------------------------------------------

            const blocksFolder =
                path.join(
                    extractDir,
                    'assets',
                    'minecraft',
                    'textures',
                    'blocks'
                );


            if (!fs.existsSync(blocksFolder)) {

                throw new Error(
                    'The ZIP does not contain assets/minecraft/textures/blocks/'
                );
            }


            console.log(
                `[WOOLIMAGES] Blocks folder found: ${blocksFolder}`
            );


            // ------------------------------------------------
            // SELECT MAPPING
            // ------------------------------------------------

            let selectedMapping;

            if (bridgeOverlay) {

                if (clayConvert) {

                    selectedMapping =
                        BRIDGE_OVERLAY_CLAY_MAPPING;

                    console.log(
                        '[WOOLIMAGES] MODE: BRIDGE OVERLAY + CLAY CONVERT'
                    );

                } else {

                    selectedMapping =
                        BRIDGE_OVERLAY_WOOL_MAPPING;

                    console.log(
                        '[WOOLIMAGES] MODE: BRIDGE OVERLAY'
                    );
                }

            } else {

                selectedMapping =
                    clayConvert
                        ? CLAY_MAPPING
                        : WOOL_MAPPING;

                console.log(
                    clayConvert
                        ? '[WOOLIMAGES] MODE: CLAY CONVERT'
                        : '[WOOLIMAGES] MODE: WOOL CONVERT'
                );
            }


            const requiredTextures =
                Object.keys(
                    selectedMapping
                );


            // ------------------------------------------------
            // FIND TEXTURES
            // ------------------------------------------------

            const textureFiles = {};


            for (
                const textureName
                of requiredTextures
            ) {

                const file =
                    findImageFile(
                        blocksFolder,
                        textureName
                    );


                if (!file) {

                    throw new Error(
                        `Missing required texture: ${textureName}.png`
                    );
                }


                textureFiles[textureName] =
                    file;


                console.log(
                    `[WOOLIMAGES] Found ${textureName}: ${file}`
                );
            }


            console.log(
                `[WOOLIMAGES] All ${requiredTextures.length} required textures found.`
            );


            // ------------------------------------------------
            // RESULT JSON
            // ------------------------------------------------

            let resultJSON;


            if (bridgeOverlay) {

                resultJSON = {

                    ClayBlue: '',

                    ClayRed: ''

                };

            } else {

                resultJSON = {

                    ClayGreen: '',

                    ClayBlue: '',

                    ClayOrange: '',

                    ClayGrey: '',

                    ClayCyan: '',

                    ClayYellow: '',

                    ClayPurple: '',

                    ClayRed: ''

                };
            }


            // ------------------------------------------------
            // CONVERT ALL TEXTURES IN PARALLEL
            // ------------------------------------------------

            const total =
                requiredTextures.length;


            console.log(
                `[WOOLIMAGES] Converting all ${total} textures in parallel...`
            );


            const conversionResults =
                await Promise.all(
                    requiredTextures.map(
                        async textureName => {

                            const convertedPath =
                                path.join(
                                    convertedDir,
                                    `${textureName}_1024.png`
                                );


                            const originalPath =
                                textureFiles[textureName];


                            await sharp(originalPath)
                                .resize(
                                    FINAL_SIZE,
                                    FINAL_SIZE,
                                    {
                                        fit: 'fill',
                                        kernel: sharp.kernel.nearest
                                    }
                                )
                                .png()
                                .toFile(convertedPath);


                            return {

                                textureName,

                                clayName:
                                    selectedMapping[textureName],

                                convertedPath

                            };
                        }
                    )
                );


            console.log(
                `[WOOLIMAGES] All ${total} textures converted.`
            );


            // ------------------------------------------------
            // UPLOAD ALL IMAGES CONCURRENTLY
            // ------------------------------------------------

            const UPLOAD_CONCURRENCY = 4;


            const uploadResults =
                await runWithConcurrency(
                    conversionResults,
                    UPLOAD_CONCURRENCY,
                    async item => {

                        console.log(
                            `[WOOLIMAGES] Uploading ${item.textureName} -> ${item.clayName}...`
                        );


                        const imageId =
                            await uploadImageToRoblox(
                                item.convertedPath,
                                item.clayName
                            );


                        return {

                            clayName:
                                item.clayName,

                            imageId

                        };
                    }
                );


            // ------------------------------------------------
            // COLLECT TEXTURE IDS
            // ------------------------------------------------

            for (const result of uploadResults) {

                resultJSON[result.clayName] =
                    String(
                        result.imageId
                    );


                console.log(
                    `[WOOLIMAGES] TextureId ${result.clayName} = ${result.imageId}`
                );
            }


            console.log(
                `[WOOLIMAGES] All ${total} TextureIds obtained.`
            );


            // ------------------------------------------------
            // JSON
            // ------------------------------------------------

            const jsonString =
                JSON.stringify(
                    resultJSON,
                    null,
                    2
                );


            console.log(
                '========================================'
            );


            console.log(
                '[WOOLIMAGES] FINAL JSON'
            );


            console.log(
                jsonString
            );


            console.log(
                '========================================'
            );


            // ------------------------------------------------
            // PURPLE JSON EMBED
            // ------------------------------------------------

            const embed =
                new EmbedBuilder()

                    .setColor(0x9146FF)

.setDescription(
    '**✅ blocks json:**\n' +
    '```json\n' +
    jsonString +
    '\n```'
);


            // ------------------------------------------------
            // SEND RESULT
            // ------------------------------------------------

            await interaction.editReply({

                content: null,

                embeds: [
                    embed
                ],

                attachments: []

            });


            // ------------------------------------------------
            // BLOCKS OVERLAY HISTORY FORUM
            // ------------------------------------------------

            // pack.png is only used for the forum history post.

            if (fs.existsSync(packImagePath)) {

                try {

                    const historyChannel =
                        interaction.guild?.channels?.cache?.find(
                            channel =>
                                channel.name === '🧶・blocks-overlay-history' &&
                                channel.type === ChannelType.GuildForum
                        );


                    if (!historyChannel) {

                        console.warn(
                            '[BLOCKS-OVERLAY-HISTORY] Forum channel #🧶・blocks-overlay-history was not found.'
                        );

                    } else {

                        const historyEmbed =
                            EmbedBuilder.from(embed)
                                .setImage(
                                    'attachment://pack.png'
                                );


                        const historyPackImage =
                            new AttachmentBuilder(
                                packImagePath,
                                {
                                    name: 'pack.png'
                                }
                            );


                        await historyChannel.threads.create({

                            name:
                                attachment.name.replace(
                                    /\.zip$/i,
                                    ''
                                ),

                            message: {

                                embeds: [
                                    historyEmbed
                                ],

                                files: [
                                    historyPackImage
                                ]

                            }

                        });


                        console.log(
                            `[BLOCKS-OVERLAY-HISTORY] History post created: ${attachment.name}`
                        );
                    }


                } catch (historyError) {

                    console.error(
                        '[BLOCKS-OVERLAY-HISTORY] Could not create history post:',
                        historyError
                    );
                }
            }


            console.log(
                '[WOOLIMAGES] Finished successfully.'
            );


        } catch (error) {

            console.error(
                '[WOOLIMAGES ERROR]',
                error
            );


            const message =
                error?.message ||
                'Unknown error.';


            try {

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {

                    await interaction.editReply({

                        content:
                            `**Wool conversion failed**\n\n\`\`\`\n${message}\n\`\`\``,

                        embeds: [],

                        attachments: []

                    });

                } else {

                    await interaction.reply({

                        content:
                            `**Wool conversion failed**\n\n\`\`\`\n${message}\n\`\`\``,

                        ephemeral: true

                    });
                }


            } catch (replyError) {

                console.error(
                    '[WOOLIMAGES] Could not send error:',
                    replyError
                );
            }


        } finally {

            // ------------------------------------------------
            // CLEAN TEMP
            // ------------------------------------------------

            if (tempDir) {

                try {

                    fs.rmSync(
                        tempDir,
                        {
                            recursive: true,
                            force: true
                        }
                    );


                    console.log(
                        '[WOOLIMAGES] Temporary files cleaned.'
                    );


                } catch (cleanupError) {

                    console.error(
                        '[WOOLIMAGES] Cleanup error:',
                        cleanupError
                    );
                }
            }
        }
    }
};


// ============================================================
// FIND IMAGE FILE
// ============================================================

function findImageFile(
    rootDir,
    targetName
) {

    const entries =
        fs.readdirSync(
            rootDir,
            {
                withFileTypes: true
            }
        );


    for (
        const entry
        of entries
    ) {

        const fullPath =
            path.join(
                rootDir,
                entry.name
            );


        if (entry.isDirectory()) {

            const result =
                findImageFile(
                    fullPath,
                    targetName
                );


            if (result) {

                return result;
            }


            continue;
        }


        if (!entry.isFile()) {

            continue;
        }


        const extension =
            path.extname(
                entry.name
            ).toLowerCase();


        if (
            extension !== '.png' &&
            extension !== '.jpg' &&
            extension !== '.jpeg'
        ) {

            continue;
        }


        const baseName =
            path.basename(
                entry.name,
                extension
            ).toLowerCase();


        if (
            baseName ===
            targetName.toLowerCase()
        ) {

            return fullPath;
        }
    }


    return null;
}


// ============================================================
// RUN WITH CONCURRENCY
// ============================================================

async function runWithConcurrency(
    items,
    concurrency,
    worker
) {

    const results =
        new Array(
            items.length
        );


    let nextIndex = 0;


    async function runner() {

        while (true) {

            const index =
                nextIndex++;


            if (
                index >=
                items.length
            ) {

                return;
            }


            results[index] =
                await worker(
                    items[index],
                    index
                );
        }
    }


    const workers = [];


    const workerCount =
        Math.min(
            concurrency,
            items.length
        );


    for (
        let i = 0;
        i < workerCount;
        i++
    ) {

        workers.push(
            runner()
        );
    }


    await Promise.all(
        workers
    );


    return results;
}


// ============================================================
// UPLOAD IMAGE TO ROBLOX
// ============================================================

async function uploadImageToRoblox(
    imagePath,
    displayName
) {

    const fileBuffer =
        fs.readFileSync(
            imagePath
        );


    // --------------------------------------------------------
    // CREATOR
    // --------------------------------------------------------

    let creator;


    if (ROBLOX_IS_GROUP) {

        creator = {

            groupId:
                String(
                    ROBLOX_CREATOR_ID
                )

        };

    } else {

        creator = {

            userId:
                String(
                    ROBLOX_CREATOR_ID
                )
        };
    }


    // --------------------------------------------------------
    // REQUEST DATA
    // --------------------------------------------------------

    const requestData = {

        assetType:
            'Image',

        displayName:
            `Wool_${displayName}`,

        description:
            'Minecraft texture converted by RobloxImageBot.',

        creationContext: {

            creator

        }

    };


    // --------------------------------------------------------
    // FORM DATA
    // --------------------------------------------------------

    const form =
        new FormData();


    form.append(
        'request',
        JSON.stringify(
            requestData
        )
    );


    form.append(
        'fileContent',
        new Blob(
            [
                fileBuffer
            ],
            {
                type:
                    'image/png'
            }
        ),
        path.basename(
            imagePath
        )
    );


    // --------------------------------------------------------
    // CREATE IMAGE
    // --------------------------------------------------------

    console.log(
        `[ROBLOX] Creating Image: ${displayName}`
    );


    const response =
        await fetch(
            'https://apis.roblox.com/assets/v1/assets',
            {

                method:
                    'POST',

                headers: {

                    'x-api-key':
                        ROBLOX_API_KEY

                },

                body:
                    form

            }
        );


    const responseText =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(
                responseText
            );

    } catch {

        throw new Error(
            `Roblox returned invalid JSON. HTTP ${response.status}\n${responseText.slice(0, 500)}`
        );
    }


    if (!response.ok) {

        throw new Error(
            `Roblox image upload failed for ${displayName}. HTTP ${response.status}\n${JSON.stringify(data, null, 2)}`
        );
    }


    console.log(
        `[ROBLOX] Create response: ${JSON.stringify(data)}`
    );


    // --------------------------------------------------------
    // OPERATION
    // --------------------------------------------------------

    if (!data.path) {

        throw new Error(
            `Roblox did not return an operation path for ${displayName}.\n${JSON.stringify(data, null, 2)}`
        );
    }


    const operationId =
        data.path
            .split('/')
            .pop();


    if (!operationId) {

        throw new Error(
            `Could not extract Roblox operation ID for ${displayName}.`
        );
    }


    console.log(
        `[ROBLOX] Operation: ${operationId}`
    );


    // --------------------------------------------------------
    // WAIT
    // --------------------------------------------------------

    for (
        let attempt = 1;
        attempt <= 60;
        attempt++
    ) {

        await sleep(
            1000
        );


        const operationResponse =
            await fetch(
                `https://apis.roblox.com/assets/v1/operations/${operationId}`,
                {

                    method:
                        'GET',

                    headers: {

                        'x-api-key':
                            ROBLOX_API_KEY

                    }

                }
            );


        const operationText =
            await operationResponse.text();


        let operationData;


        try {

            operationData =
                JSON.parse(
                    operationText
                );

        } catch {

            throw new Error(
                `Invalid operation response for ${displayName}. HTTP ${operationResponse.status}\n${operationText.slice(0, 500)}`
            );
        }


        if (!operationResponse.ok) {

            throw new Error(
                `Could not check Roblox operation for ${displayName}. HTTP ${operationResponse.status}\n${JSON.stringify(operationData, null, 2)}`
            );
        }


        console.log(
            `[ROBLOX] ${displayName} attempt ${attempt}/60 - done=${operationData.done}`
        );


        // ----------------------------------------------------
        // COMPLETE
        // ----------------------------------------------------

        if (operationData.done) {

            if (operationData.error) {

                throw new Error(
                    `Roblox failed processing ${displayName}:\n${JSON.stringify(operationData.error, null, 2)}`
                );
            }


            const asset =
                operationData.response;


            if (
                !asset ||
                !asset.assetId
            ) {

                throw new Error(
                    `Roblox completed ${displayName}, but no assetId was returned.\n${JSON.stringify(operationData, null, 2)}`
                );
            }


            console.log(
                `[ROBLOX] SUCCESS ${displayName}: ${asset.assetId}`
            );


            return String(
                asset.assetId
            );
        }
    }


    throw new Error(
        `Roblox upload timed out for ${displayName}.`
    );
}


// ============================================================
// SLEEP
// ============================================================

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}