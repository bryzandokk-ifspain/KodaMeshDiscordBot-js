const {
    SlashCommandBuilder,
    AttachmentBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const FormData = require('form-data');
const unzipper = require('unzipper');

const { Writable } = require('stream');
const { pipeline } = require('stream/promises');


// ============================================================
// CONFIGURATION
// ============================================================

const MIN_SIZE = 1;
const FINAL_FACE_SIZE = 1024;

const ROBLOX_API_KEY =
    process.env.ROBLOX_API_KEY;

const ROBLOX_CREATOR_ID =
    process.env.ROBLOX_CREATOR_ID;

const ROBLOX_IS_GROUP =
    String(
        process.env.ROBLOX_IS_GROUP
    ).toLowerCase() === 'true';


// ============================================================
// SKY FACE NAMES
// ============================================================

const faces = [

    {
        name: 'SkyBottom',
        fileName: 'SkyBottom.png',
        column: 0,
        row: 0
    },

    {
        name: 'SkyTop',
        fileName: 'SkyTop.png',
        column: 1,
        row: 0
    },

    {
        name: 'SkyLeft',
        fileName: 'SkyLeft.png',
        column: 2,
        row: 0
    },

    {
        name: 'SkyBack',
        fileName: 'SkyBack.png',
        column: 0,
        row: 1
    },

    {
        name: 'SkyRight',
        fileName: 'SkyRight.png',
        column: 1,
        row: 1
    },

    {
        name: 'SkyFront',
        fileName: 'SkyFront.png',
        column: 2,
        row: 1
    }

];


// ============================================================
// AVAILABLE SKY FILES
// ============================================================

const SKY_OPTIONS = [

    {
        id: 'cloud1',
        fileName: 'cloud1.png',
        label: 'cloud1.png',
        description: 'Import cloud1.png'
    },

    {
        id: 'cloud2',
        fileName: 'cloud2.png',
        label: 'cloud2.png',
        description: 'Import cloud2.png'
    },

    {
        id: 'starfield01',
        fileName: 'starfield01.png',
        label: 'starfield01.png',
        description: 'Import starfield01.png'
    },

    {
        id: 'starfield02',
        fileName: 'starfield02.png',
        label: 'starfield02.png',
        description: 'Import starfield02.png'
    },

    {
        id: 'starfield03',
        fileName: 'starfield03.png',
        label: 'starfield03.png',
        description: 'Import starfield03.png'
    }

];


// ============================================================
// COMMAND
// ============================================================

module.exports = {

    data: new SlashCommandBuilder()

        .setName('skyimages')

        .setDescription(
            'Import a .zip file and it will give you a sky overlay for BD'
        )

        .addAttachmentOption(option =>
            option
                .setName('pack')
                .setDescription(
                    'Minecraft Java Resource Pack (.zip)'
                )
                .setRequired(true)
        ),


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(interaction) {

        await interaction.deferReply();


        const attachment =
            interaction.options.getAttachment('pack');


        if (!attachment) {

            return interaction.editReply(
                'No ZIP file was provided'
            );

        }


        // ====================================================
        // CHECK ZIP
        // ====================================================

        const attachmentName =
            String(
                attachment.name || ''
            ).toLowerCase();


        const contentType =
            String(
                attachment.contentType || ''
            ).toLowerCase();


        if (
            !attachmentName.endsWith('.zip') &&
            contentType !== 'application/zip' &&
            contentType !== 'application/x-zip-compressed'
        ) {

            return interaction.editReply(
                'The file must be a **.zip** file containing a Minecraft Java TXTPCK.'
            );

        }


        // ====================================================
        // CHECK ROBLOX CONFIG
        // ====================================================

        if (!ROBLOX_API_KEY) {

            return interaction.editReply(
                '`ROBLOX_API_KEY` is missing from the `.env` file (apikey)'
            );

        }


        if (!ROBLOX_CREATOR_ID) {

            return interaction.editReply(
                '`ROBLOX_CREATOR_ID` is missing from the `.env` file (apikey)'
            );

        }


        // ====================================================
        // TEMP DIRECTORIES
        // ====================================================

        const tempDir =
            path.join(
                __dirname,
                '..',
                'temp'
            );


        if (!fs.existsSync(tempDir)) {

            fs.mkdirSync(
                tempDir,
                {
                    recursive: true
                }
            );

        }


        const timestamp =
            Date.now();


        const jobDir =
            path.join(
                tempDir,
                `sky_${timestamp}`
            );


        const zipInputPath =
            path.join(
                jobDir,
                'resourcepack.zip'
            );


        const outputDir =
            path.join(
                jobDir,
                'output'
            );


        const outputZipPath =
            path.join(
                jobDir,
                'minecraft_sky_images.zip'
            );


        fs.mkdirSync(
            jobDir,
            {
                recursive: true
            }
        );


        try {

            // =================================================
            // DOWNLOAD ZIP
            // =================================================

            console.log(
                `[SKYIMAGES] Downloading Resource Pack: ${attachment.name}`
            );


            await interaction.editReply(
                'Downloading the Texture Pack'
            );


            const response =
                await axios.get(
                    attachment.url,
                    {
                        responseType: 'arraybuffer',
                        timeout: 120000,
                        maxContentLength: 500 * 1024 * 1024,
                        maxBodyLength: 500 * 1024 * 1024
                    }
                );


            const zipBuffer =
                Buffer.from(response.data);


            if (zipBuffer.length < 22) {

                throw new Error(
                    'The downloaded ZIP is incomplete or empty.'
                );

            }


            fs.writeFileSync(
                zipInputPath,
                zipBuffer
            );


            console.log(
                `[SKYIMAGES] Resource Pack downloaded: ${(
                    zipBuffer.length /
                    1024 /
                    1024
                ).toFixed(2)} MB`
            );


            // =================================================
            // SEARCH INSIDE ZIP
            // =================================================

            await interaction.editReply(
                'Searching for the skies inside the ZIP'
            );


            const foundSkies =
                await findSkyFilesInZip(
                    zipInputPath,
                    jobDir
                );


            console.log(
                '[SKYIMAGES] ZIP search completed.'
            );


            for (
                const option
                of SKY_OPTIONS
            ) {

                if (
                    foundSkies[option.id]
                ) {

                    console.log(
                        `[SKYIMAGES] Found ${option.fileName}: ${foundSkies[option.id]}`
                    );

                } else {

                    console.log(
                        `[SKYIMAGES] Missing ${option.fileName}`
                    );

                }

            }


            const availableOptions =
                SKY_OPTIONS.filter(
                    option =>
                        foundSkies[
                            option.id
                        ]
                );


            if (
                availableOptions.length === 0
            ) {

                throw new Error(
                    'KodaMesh did not find `cloud1.png`, `cloud2.png`, `starfield01.png`, `starfield02.png` or `starfield03.png` inside `assets/minecraft/mcpatcher/sky/world0`.'
                );

            }


            // =================================================
            // CREATE PREVIEW ATTACHMENTS
            // =================================================

            console.log(
                `[SKYIMAGES] Creating ${availableOptions.length} sky previews...`
            );


            const previewFiles = [];
            const previewEmbeds = [];


            for (
                const option
                of availableOptions
            ) {

                const sourcePath =
                    foundSkies[
                        option.id
                    ];


                const previewFileName =
                    `preview_${option.id}.png`;


                const previewPath =
                    path.join(
                        jobDir,
                        previewFileName
                    );


                await sharp(sourcePath)

                    .resize(
                        512,
                        512,
                        {
                            fit: 'inside',
                            withoutEnlargement: false,
                            kernel: sharp.kernel.lanczos3
                        }
                    )

                    .png()

                    .toFile(
                        previewPath
                    );


                const attachmentPreview =
                    new AttachmentBuilder(
                        previewPath,
                        {
                            name: previewFileName
                        }
                    );


                previewFiles.push(
                    attachmentPreview
                );


                const embed =
                    new EmbedBuilder()

                        .setColor(0x00A2FF)

                        .setTitle(
                            option.fileName
                        )

                        .setDescription(
                            `Preview of **${option.fileName}**`
                        )

                        .setImage(
                            `attachment://${previewFileName}`
                        );


                previewEmbeds.push(
                    embed
                );


                console.log(
                    `[SKYIMAGES] Preview created: ${option.fileName}`
                );

            }


            // =================================================
            // CREATE SELECT MENU
            // =================================================

            const selectMenu =
                new StringSelectMenuBuilder()

                    .setCustomId(
                        `skyimages_select_${interaction.id}`
                    )

                    .setPlaceholder(
                        'Select the sky you want to import'
                    )

                    .setMinValues(1)

                    .setMaxValues(1);


            for (
                const option
                of availableOptions
            ) {

                selectMenu.addOptions(

                    new StringSelectMenuOptionBuilder()

                        .setLabel(
                            option.label
                        )

                        .setDescription(
                            option.description
                        )

                        .setValue(
                            option.id
                        )

                );

            }


            const selectRow =
                new ActionRowBuilder()
                    .addComponents(
                        selectMenu
                    );


            const missing =
                SKY_OPTIONS.filter(
                    option =>
                        !foundSkies[
                            option.id
                        ]
                );


            let menuMessage =
                '**Which sky do you want to import?**\n\n' +

                'These are the options found in the Resource Pack.\n\n' +

                'You can view a preview of each one above and then select one from the menu.\n\n' +

                `**Skies found: ${availableOptions.length}/${SKY_OPTIONS.length}**`;


            if (
                missing.length > 0
            ) {

                menuMessage +=
                    '\n\n**Not found:** ' +

                    missing
                        .map(
                            x =>
                                `\`${x.fileName}\``
                        )
                        .join(', ');

            }


            // =================================================
            // SEND PREVIEWS + MENU
            // =================================================

            await interaction.editReply({

                content: menuMessage,

                embeds: previewEmbeds,

                files: previewFiles,

                components: [
                    selectRow
                ]

            });


            // =================================================
            // WAIT FOR USER SELECTION
            // =================================================

            const selectedInteraction =
                await interaction.channel.awaitMessageComponent({

                    filter:
                        component =>

                            component.customId ===
                                `skyimages_select_${interaction.id}` &&

                            component.user.id ===
                                interaction.user.id,

                    time: 120000

                });


            await selectedInteraction.deferUpdate();


            const selectedId =
                selectedInteraction.values[0];


            const selectedOption =
                SKY_OPTIONS.find(
                    option =>
                        option.id === selectedId
                );


            if (!selectedOption) {

                throw new Error(
                    'The sky selection is invalid'
                );

            }


            const inputPath =
                foundSkies[selectedId];


            if (
                !inputPath ||
                !fs.existsSync(inputPath)
            ) {

                throw new Error(
                    `Could not find ${selectedOption.fileName} after the selection`
                );

            }


            console.log(
                `[SKYIMAGES] Selected sky: ${selectedOption.fileName}`
            );


            // =================================================
            // REMOVE MENU + PREVIEWS
            // =================================================

            await interaction.editReply({

                content:
                    `Selected sky: **${selectedOption.fileName}**\n\n` +
                    'Processing the sky',

                embeds: [],

                files: [],

                components: []

            });


            // =================================================
            // READ IMAGE
            // =================================================

            const metadata =
                await sharp(inputPath)
                    .metadata();


            const width =
                metadata.width;


            const height =
                metadata.height;


            if (
                !width ||
                !height
            ) {

                throw new Error(
                    'The dimensions of the sky could not be determined'
                );

            }


            console.log(
                `[SKYIMAGES] Selected image: ${width}x${height}`
            );


            // =================================================
            // JAVA SKY = 3 x 2
            // =================================================

            const tileWidth =
                width / 3;


            const tileHeight =
                height / 2;


            if (
                !Number.isInteger(tileWidth) ||
                !Number.isInteger(tileHeight)
            ) {

                throw new Error(
                    `The image ${selectedOption.fileName} has invalid dimensions\n\n` +
                    `Detected: ${width}x${height}\n` +
                    'The width must be divisible by 3, and the height must be divisible by 2'
                );

            }


            if (
                tileWidth !== tileHeight
            ) {

                throw new Error(
                    `The sky ${selectedOption.fileName} does not have six square faces\n\n` +
                    `Detected: ${width}x${height}\n` +
                    `Each face would be ${tileWidth}x${tileHeight}.`
                );

            }


            if (
                tileWidth < MIN_SIZE
            ) {

                throw new Error(
                    'The sky is too small'
                );

            }


            console.log(
                '[SKYIMAGES] Valid Java sky detected.'
            );


            console.log(
                `[SKYIMAGES] Original face size: ${tileWidth}x${tileHeight}`
            );


            console.log(
                `[SKYIMAGES] Final face size: ${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}`
            );


            // =================================================
            // CREATE OUTPUT DIRECTORY
            // =================================================

            fs.mkdirSync(
                outputDir,
                {
                    recursive: true
                }
            );


            // =================================================
            // SPLIT SIX FACES + RESIZE 1024x1024
            // =================================================

            await interaction.editReply(

                `Cutting **${selectedOption.fileName}** in 6 faces and converting to **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}**...`

            );


            await Promise.all(

                faces.map(
                    async face => {

                        const left =
                            face.column * tileWidth;


                        const top =
                            face.row * tileHeight;


                        const outputPath =
                            path.join(
                                outputDir,
                                face.fileName
                            );


                        console.log(
                            `[SKYIMAGES] Creating ${face.name}`
                        );


                        await sharp(inputPath)

                            .extract({

                                left,

                                top,

                                width: tileWidth,

                                height: tileHeight

                            })

                            .resize(

                                FINAL_FACE_SIZE,

                                FINAL_FACE_SIZE,

                                {

                                    fit: 'fill',

                                    kernel: sharp.kernel.lanczos3,

                                    withoutEnlargement: false

                                }

                            )

                            .png({

                                compressionLevel: 9,

                                adaptiveFiltering: true,

                                force: true

                            })

                            .toFile(
                                outputPath
                            );


                        console.log(
                            `[SKYIMAGES] Created ${face.fileName} -> ${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}`
                        );

                    }
                )

            );


            // =================================================
            // VERIFY FINAL IMAGES
            // =================================================

            for (
                const face
                of faces
            ) {

                const filePath =
                    path.join(
                        outputDir,
                        face.fileName
                    );


                const finalMetadata =
                    await sharp(filePath)
                        .metadata();


                console.log(
                    `[SKYIMAGES] Verified ${face.fileName}: ${finalMetadata.width}x${finalMetadata.height}`
                );


                if (
                    finalMetadata.width !== FINAL_FACE_SIZE ||
                    finalMetadata.height !== FINAL_FACE_SIZE
                ) {

                    throw new Error(
                        `${face.fileName} did not become ${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}.`
                    );

                }

            }


            // =================================================
            // UPLOAD SIX IMAGES
            // =================================================

            await interaction.editReply(

                `KodaMesh is working\n\n` +
                `Final Resolution: **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}**`

            );


            const uploadedIds = {};


            // =================================================
            // CONCURRENCY
            // =================================================

            const uploadResults =
                await runWithConcurrency(

                    faces,

                    3,

                    async (
                        face,
                        index
                    ) => {

                        const filePath =
                            path.join(
                                outputDir,
                                face.fileName
                            );


                        console.log(
                            `[SKYIMAGES] Uploading ${face.name} as IMAGE...`
                        );


                        await interaction.editReply(

                            `KodaMesh is uploading the images to Roblox\n\n` +

                            `Processing **${index + 1}/6**\n` +

                            `**${face.name}**\n\n` +

                            `Sky: **${selectedOption.fileName}**\n` +

                            `Resolution: **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}**\n\n` +

                            `Access: **Open use (27 api keys) by default**`

                        );


                        const assetId =
                            await uploadImage(

                                filePath,

                                face.name,

                                ROBLOX_API_KEY,

                                ROBLOX_CREATOR_ID,

                                ROBLOX_IS_GROUP

                            );


                        console.log(
                            `[SKYIMAGES] ${face.name} IMAGE uploaded: ${assetId}`
                        );


                        return {
                            face,
                            assetId
                        };

                    }

                );


            for (
                const result
                of uploadResults
            ) {

                uploadedIds[
                    result.face.name
                ] = result.assetId;

            }


            // =================================================
            // CREATE JSON
            // =================================================

            const jsonObject = {

                SkyBack: uploadedIds.SkyBack,

                SkyRight: uploadedIds.SkyRight,

                SkyLeft: uploadedIds.SkyLeft,

                SkyBottom: uploadedIds.SkyBottom,

                SkyTop: uploadedIds.SkyTop,

                SkyFront: uploadedIds.SkyFront

            };


            const jsonText =
                JSON.stringify(
                    jsonObject,
                    null,
                    2
                );


            const jsonPath =
                path.join(
                    outputDir,
                    'sky.json'
                );


            fs.writeFileSync(
                jsonPath,
                jsonText,
                'utf8'
            );


            // =================================================
            // CREATE ZIP
            // =================================================

            await interaction.editReply(

                `KodaMesh is creating the ${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE} images and the JSON...`

            );


            await createZip(
                outputDir,
                outputZipPath
            );


            // =================================================
            // CREATE DISCORD FILE
            // =================================================

            const zipFile =
                new AttachmentBuilder(
                    outputZipPath,
                    {
                        name: 'minecraft_sky_images.zip'
                    }
                );


            // =================================================
            // FINAL MESSAGE - PURPLE EMBED
            // =================================================

            const finalEmbed =
                new EmbedBuilder()

                    .setColor(0x9146FF)

                    .setDescription(

                        `✅ **KodaMesh finished the task yahh**\n\n` +

                        `imported sky: **${selectedOption.fileName}**\n` +

                        `pack: **${attachment.name}**\n\n` +

                        `original: **${width}x${height}**\n` +

                        `face size original: **${tileWidth}x${tileHeight}**\n` +

                        `face size final: **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}**\n\n` +

                        '**✅ sky json:**\n' +

                        '```json\n' +

                        jsonText +

                        '\n```'

                    );


            await interaction.editReply({

                content: null,

                embeds: [
                    finalEmbed
                ],

                files: [
                    zipFile
                ],

                components: []

            });


            console.log(
                '[SKYIMAGES] Everything completed successfully.'
            );


        } catch (error) {

            console.error(
                '[SKYIMAGES ERROR]',
                error
            );


            try {

                await interaction.editReply({

                    content:
                        `**Error processing the sky:**\n\`${error.message}\``,

                    embeds: [],

                    components: []

                });

            } catch (replyError) {

                console.error(
                    '[SKYIMAGES] Could not send error:',
                    replyError.message
                );

            }

        } finally {

            // =================================================
            // CLEAN EVERYTHING
            // =================================================

            try {

                if (
                    fs.existsSync(jobDir)
                ) {

                    fs.rmSync(
                        jobDir,
                        {
                            recursive: true,
                            force: true
                        }
                    );

                }

            } catch (error) {

                console.warn(
                    '[SKYIMAGES] Could not delete temporary files:',
                    error.message
                );

            }

        }

    }

};


// ============================================================
// FIND SKY FILES DIRECTLY INSIDE ZIP
// ============================================================

async function findSkyFilesInZip(
    zipPath,
    jobDir
) {

    const found = {};


    const wantedFiles =
        new Map();


    for (
        const option
        of SKY_OPTIONS
    ) {

        wantedFiles.set(
            option.fileName.toLowerCase(),
            option.id
        );

    }


    // ========================================================
    // REQUIRED DIRECTORY
    // ========================================================

    const requiredDirectory =
        'assets/minecraft/mcpatcher/sky/world0';


    const normalizedRequired =
        normalizeZipPath(
            requiredDirectory
        );


    console.log(
        `[SKYIMAGES] Searching only inside: ${normalizedRequired}`
    );


    // ========================================================
    // OPEN ZIP AS STREAM
    // ========================================================

    const zipStream =
        fs.createReadStream(zipPath);


    const parser =
        unzipper.Parse({
            forceStream: true
        });


    // Forward input errors to the parser so the async iterator
    // can catch them instead of silently stopping.

    zipStream.on(
        'error',
        error => {

            parser.destroy(error);

        }
    );


    zipStream.pipe(parser);


    // ========================================================
    // CONSUME ZIP ENTRIES
    // ========================================================

    try {

        for await (
            const entry
            of parser
        ) {

            if (
                !entry ||
                !entry.path
            ) {

                await drainEntry(entry);

                continue;

            }


            const normalizedPath =
                normalizeZipPath(
                    entry.path
                );


            if (
                entry.type === 'Directory'
            ) {

                await drainEntry(entry);

                continue;

            }


            // ================================================
            // HANDLE ROOT FOLDER
            // ================================================

            const assetsIndex =
                normalizedPath.indexOf(
                    '/assets/'
                );


            let relativePath;


            if (
                normalizedPath.startsWith('assets/')
            ) {

                relativePath =
                    normalizedPath;

            } else if (
                assetsIndex !== -1
            ) {

                relativePath =
                    normalizedPath.slice(
                        assetsIndex + 1
                    );

            } else {

                await drainEntry(entry);

                continue;

            }


            // ================================================
            // CHECK REQUIRED PATH
            // ================================================

            if (
                !relativePath.startsWith(
                    `${normalizedRequired}/`
                )
            ) {

                await drainEntry(entry);

                continue;

            }


            const fileName =
                relativePath
                    .split('/')
                    .pop()
                    .toLowerCase();


            if (
                !wantedFiles.has(fileName)
            ) {

                await drainEntry(entry);

                continue;

            }


            const skyId =
                wantedFiles.get(fileName);


            // ================================================
            // DUPLICATE FILE
            // ================================================

            if (
                found[skyId]
            ) {

                console.log(
                    `[SKYIMAGES] Duplicate ignored: ${entry.path}`
                );

                await drainEntry(entry);

                continue;

            }


            // ================================================
            // EXTRACT MATCHING FILE
            // ================================================

            const outputPath =
                path.join(
                    jobDir,
                    `sky_${skyId}.png`
                );


            console.log(
                `[SKYIMAGES] Extracting ${fileName}...`
            );


            // Consume the entry directly as a stream.
            // No entry.buffer() or delayed ZIP entry reading.

            await pipeline(

                entry,

                fs.createWriteStream(
                    outputPath
                )

            );


            const stats =
                fs.statSync(outputPath);


            if (
                stats.size === 0
            ) {

                fs.unlinkSync(outputPath);

                throw new Error(
                    `The extracted file ${fileName} is empty.`
                );

            }


            found[skyId] =
                outputPath;


            console.log(
                `[SKYIMAGES] Extracted ${fileName} (${(
                    stats.size /
                    1024
                ).toFixed(1)} KB)`
            );

        }

    } catch (error) {

        console.error(
            '[SKYIMAGES] ZIP streaming extraction failed:',
            error
        );


        throw new Error(
            `Could not read the Resource Pack ZIP: ${error.message}`
        );

    }


    console.log(
        `[SKYIMAGES] ZIP extraction finished. Found ${Object.keys(found).length} sky files.`
    );


    return found;

}


// ============================================================
// DRAIN ZIP ENTRY
// ============================================================

async function drainEntry(
    entry
) {

    if (
        !entry ||
        entry.destroyed
    ) {

        return;

    }


    // Consume irrelevant entries completely.
    // This prevents the ZIP parser from advancing while
    // a previous entry is still unread.

    await pipeline(

        entry,

        new Writable({

            write(
                chunk,
                encoding,
                callback
            ) {

                callback();

            }

        })

    );

}


// ============================================================
// NORMALIZE ZIP PATH
// ============================================================

function normalizeZipPath(
    input
) {

    return String(
        input || ''
    )

        .replace(
            /\\/g,
            '/'
        )

        .replace(
            /^\/+/,
            ''
        )

        .replace(
            /\/+/g,
            '/'
        )

        .toLowerCase();

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
                index >= items.length
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
// ROBLOX IMAGE UPLOAD
// ============================================================

async function uploadImage(
    filePath,
    displayName,
    apiKey,
    creatorId,
    isGroup
) {

    const form =
        new FormData();


    const creator =
        isGroup

            ? {

                groupId:
                    String(
                        creatorId
                    )

            }

            : {

                userId:
                    String(
                        creatorId
                    )

            };


    const requestData = {

        assetType: 'Image',

        displayName:
            `SkyImages_${displayName}_${Date.now()}`,

        description:
            `Minecraft Java sky Image generated by RobloxImageBot - ${displayName}`,

        creationContext: {

            creator

        }

    };


    form.append(
        'request',
        JSON.stringify(requestData)
    );


    form.append(
        'fileContent',

        fs.createReadStream(
            filePath
        ),

        {

            filename:
                path.basename(
                    filePath
                ),

            contentType: 'image/png'

        }
    );


    let response;


    try {

        response =
            await axios.post(

                'https://apis.roblox.com/assets/v1/assets',

                form,

                {

                    headers: {

                        'x-api-key': apiKey,

                        ...form.getHeaders()

                    },

                    maxContentLength:
                        25 * 1024 * 1024,

                    maxBodyLength:
                        25 * 1024 * 1024,

                    timeout: 60000

                }

            );

    } catch (error) {

        let message =
            error.message;


        if (
            error.response
        ) {

            message +=
                `\nRoblox HTTP: ${error.response.status}`;


            if (
                error.response.data
            ) {

                message +=
                    `\nRoblox response: ${JSON.stringify(
                        error.response.data
                    )}`;

            }

        }


        throw new Error(
            `Roblox rejected ${displayName} IMAGE upload:\n${message}`
        );

    }


    const operationPath =
        response.data?.path;


    if (
        !operationPath
    ) {

        throw new Error(

            `Roblox did not return an operation path for ${displayName}.\n` +

            JSON.stringify(
                response.data
            )

        );

    }


    console.log(
        `[ROBLOX] ${displayName} IMAGE operation created: ${operationPath}`
    );


    const operationId =
        operationPath
            .split('/')
            .pop();


    if (
        !operationId
    ) {

        throw new Error(
            `Could not extract operation ID for ${displayName}.`
        );

    }


    const result =
        await waitForAssetOperation(

            operationId,

            apiKey,

            displayName

        );


    const assetId =
        result?.response?.assetId;


    if (
        !assetId
    ) {

        throw new Error(

            `Roblox completed the ${displayName} IMAGE operation but did not return an assetId.\n` +

            JSON.stringify(
                result
            )

        );

    }


    console.log(
        `[ROBLOX] ${displayName} IMAGE ID: ${assetId}`
    );


    return String(
        assetId
    );

}


// ============================================================
// WAIT FOR ASSET OPERATION
// ============================================================

async function waitForAssetOperation(
    operationId,
    apiKey,
    displayName
) {

    const maxAttempts = 60;
    const delayMs = 1500;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        await sleep(delayMs);


        let response;


        try {

            response =
                await axios.get(

                    `https://apis.roblox.com/assets/v1/operations/${operationId}`,

                    {

                        headers: {

                            'x-api-key': apiKey

                        },

                        timeout: 30000

                    }

                );

        } catch (error) {

            let message =
                error.message;


            if (
                error.response
            ) {

                message +=
                    `\nHTTP: ${error.response.status}`;


                if (
                    error.response.data
                ) {

                    message +=
                        `\nRoblox: ${JSON.stringify(
                            error.response.data
                        )}`;

                }

            }


            throw new Error(

                `Could not check ${displayName} upload operation:\n${message}`

            );

        }


        const data =
            response.data;


        console.log(

            `[ROBLOX] ${displayName} IMAGE upload check ${attempt}/${maxAttempts}:`,

            data.done

        );


        if (
            data.done === true
        ) {

            if (
                data.error
            ) {

                throw new Error(

                    `Roblox failed ${displayName} IMAGE upload:\n` +

                    JSON.stringify(
                        data.error
                    )

                );

            }


            if (
                !data.response
            ) {

                throw new Error(

                    `Roblox finished ${displayName} IMAGE upload but returned no asset response.\n` +

                    JSON.stringify(
                        data
                    )

                );

            }


            const moderationState =
                data.response
                    ?.moderationResult
                    ?.moderationState;


            if (
                moderationState
            ) {

                console.log(

                    `[ROBLOX] ${displayName} moderation state: ${moderationState}`

                );

            }


            console.log(

                `[ROBLOX] ${displayName} IMAGE asset created successfully.`

            );


            return data;

        }

    }


    throw new Error(

        `Timed out waiting for Roblox to finish uploading ${displayName}.`

    );

}


// ============================================================
// CREATE ZIP
// ============================================================

function createZip(
    sourceDir,
    outputPath
) {

    return new Promise(

        (
            resolve,
            reject
        ) => {

            const output =
                fs.createWriteStream(
                    outputPath
                );


            const archive =
                archiver(
                    'zip',
                    {

                        zlib: {
                            level: 9
                        }

                    }
                );


            output.on(
                'close',
                () => {

                    console.log(
                        `[SKYIMAGES] ZIP created: ${archive.pointer()} bytes`
                    );

                    resolve();

                }
            );


            output.on(
                'error',
                error => {
                    reject(error);
                }
            );


            archive.on(
                'error',
                error => {
                    reject(error);
                }
            );


            archive.pipe(output);


            archive.directory(
                sourceDir,
                false
            );


            archive.finalize();

        }

    );

}


// ============================================================
// SLEEP
// ============================================================

function sleep(
    ms
) {

    return new Promise(

        resolve =>

            setTimeout(
                resolve,
                ms
            )

    );

}