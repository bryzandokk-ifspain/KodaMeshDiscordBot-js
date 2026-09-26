const {
    SlashCommandBuilder,
    AttachmentBuilder,
    EmbedBuilder
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

            const selectedMapping =
                clayConvert
                    ? CLAY_MAPPING
                    : WOOL_MAPPING;


            const requiredTextures =
                Object.keys(
                    selectedMapping
                );


            console.log(
                clayConvert
                    ? '[WOOLIMAGES] MODE: CLAY CONVERT'
                    : '[WOOLIMAGES] MODE: WOOL CONVERT'
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
                '[WOOLIMAGES] All 8 required textures found.'
            );


            // ------------------------------------------------
            // RESULT JSON
            // ------------------------------------------------

            const resultJSON = {

                ClayGreen: '',

                ClayBlue: '',

                ClayOrange: '',

                ClayGrey: '',

                ClayCyan: '',

                ClayYellow: '',

                ClayPurple: '',

                ClayRed: ''

            };


            // ------------------------------------------------
            // UPLOAD
            // ------------------------------------------------

            let completed = 0;

            const total =
                requiredTextures.length;


            for (
                const textureName
                of requiredTextures
            ) {

                const clayName =
                    selectedMapping[
                        textureName
                    ];


                const originalPath =
                    textureFiles[
                        textureName
                    ];


                completed++;


                console.log(
                    '----------------------------------------'
                );


                console.log(
                    `[WOOLIMAGES] Processing ${completed}/${total}`
                );


                console.log(
                    `[WOOLIMAGES] Texture: ${textureName}`
                );


                console.log(
                    `[WOOLIMAGES] Roblox JSON key: ${clayName}`
                );


                console.log(
                    `[WOOLIMAGES] Original: ${originalPath}`
                );


                // ------------------------------------------------
                // CONVERT TO 1024x1024
                // ------------------------------------------------

                const convertedPath =
                    path.join(
                        convertedDir,
                        `${textureName}_1024.png`
                    );


                console.log(
                    `[WOOLIMAGES] Converting ${textureName} to ${FINAL_SIZE}x${FINAL_SIZE}...`
                );


                await sharp(
                    originalPath
                )

                    .resize(
                        FINAL_SIZE,
                        FINAL_SIZE,
                        {
                            fit: 'fill',
                            kernel: sharp.kernel.nearest
                        }
                    )

                    .png()

                    .toFile(
                        convertedPath
                    );


                console.log(
                    `[WOOLIMAGES] Converted: ${convertedPath}`
                );


                // ------------------------------------------------
                // UPLOAD IMAGE
                // ------------------------------------------------

                const imageId =
                    await uploadImageToRoblox(
                        convertedPath,
                        clayName
                    );


                resultJSON[clayName] =
                    String(
                        imageId
                    );


                console.log(
                    `[WOOLIMAGES] ${clayName} = ${imageId}`
                );
            }


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
            // JSON FILE
            // ------------------------------------------------

            const jsonPath =
                path.join(
                    tempDir,
                    clayConvert
                        ? 'clay_images.json'
                        : 'wool_images.json'
                );


            fs.writeFileSync(
                jsonPath,
                jsonString,
                'utf8'
            );


            // ------------------------------------------------
            // EMBED
            // ------------------------------------------------

            const embed =
                new EmbedBuilder()

                    .setColor(
                        0x00A2FF
                    )

                    .setTitle(
                        clayConvert
                            ? '🧱 Roblox Clay Image IDs'
                            : '🧶 Roblox Wool Image IDs'
                    )

                    .setDescription(
                        clayConvert
                            ? 'All 8 hardened clay textures were converted to 1024×1024 and uploaded successfully.'
                            : 'All 8 wool textures were converted to 1024×1024 and uploaded successfully.'
                    )

                    .addFields(

                        {
                            name: '🟢 ClayGreen',
                            value: `\`${resultJSON.ClayGreen}\``,
                            inline: true
                        },

                        {
                            name: '🔵 ClayBlue',
                            value: `\`${resultJSON.ClayBlue}\``,
                            inline: true
                        },

                        {
                            name: '🟠 ClayOrange',
                            value: `\`${resultJSON.ClayOrange}\``,
                            inline: true
                        },

                        {
                            name: '⚪ ClayGrey',
                            value: `\`${resultJSON.ClayGrey}\``,
                            inline: true
                        },

                        {
                            name: '🩵 ClayCyan',
                            value: `\`${resultJSON.ClayCyan}\``,
                            inline: true
                        },

                        {
                            name: '🟡 ClayYellow',
                            value: `\`${resultJSON.ClayYellow}\``,
                            inline: true
                        },

                        {
                            name: '🟣 ClayPurple',
                            value: `\`${resultJSON.ClayPurple}\``,
                            inline: true
                        },

                        {
                            name: '🔴 ClayRed',
                            value: `\`${resultJSON.ClayRed}\``,
                            inline: true
                        }

                    )

                    .setFooter({
                        text:
                            clayConvert
                                ? 'Roblox Clay Image Converter'
                                : 'Roblox Wool Image Converter'
                    })

                    .setTimestamp();


            // ------------------------------------------------
            // ATTACHMENT
            // ------------------------------------------------

            const jsonAttachment =
                new AttachmentBuilder(
                    jsonPath,
                    {
                        name:
                            clayConvert
                                ? 'clay_images.json'
                                : 'wool_images.json'
                    }
                );


            // ------------------------------------------------
            // SEND RESULT
            // ------------------------------------------------

            await interaction.editReply({

                embeds: [
                    embed
                ],

                files: [
                    jsonAttachment
                ],

                content:
                    '📋 **JSON ready to copy:**\n```json\n' +
                    jsonString +
                    '\n```'

            });


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
                            `❌ **Wool conversion failed.**\n\n\`\`\`\n${message}\n\`\`\``,

                        embeds: []

                    });

                } else {

                    await interaction.reply({

                        content:
                            `❌ **Wool conversion failed.**\n\n\`\`\`\n${message}\n\`\`\``,

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

        assetType: 'Image',

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
                type: 'image/png'
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

                method: 'POST',

                headers: {

                    'x-api-key':
                        ROBLOX_API_KEY

                },

                body: form

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
            2000
        );


        const operationResponse =
            await fetch(
                `https://apis.roblox.com/assets/v1/operations/${operationId}`,
                {

                    method: 'GET',

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