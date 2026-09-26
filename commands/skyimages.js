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


// ============================================================
// CONFIGURATION
// ============================================================

const MIN_SIZE = 1;

// Todas las caras finales serán 1024x1024
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
        description: 'Importar cloud1.png'
    },

    {
        id: 'cloud2',
        fileName: 'cloud2.png',
        label: 'cloud2.png',
        description: 'Importar cloud2.png'
    },

    {
        id: 'starfield01',
        fileName: 'starfield01.png',
        label: 'starfield01.png',
        description: 'Importar starfield01.png'
    },

    {
        id: 'starfield02',
        fileName: 'starfield02.png',
        label: 'starfield02.png',
        description: 'Importar starfield02.png'
    },

    {
        id: 'starfield03',
        fileName: 'starfield03.png',
        label: 'starfield03.png',
        description: 'Importar starfield03.png'
    }

];


// ============================================================
// COMMAND
// ============================================================

module.exports = {

    data: new SlashCommandBuilder()

        .setName('skyimages')

        .setDescription(
            'Importa un cielo de un Minecraft Java Resource Pack y genera las 6 imágenes de Roblox.'
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
                '❌ No se proporcionó ningún archivo ZIP.'
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
                '❌ El archivo debe ser un **.zip** de un Minecraft Java Resource Pack.'
            );

        }


        // ====================================================
        // CHECK ROBLOX CONFIG
        // ====================================================

        if (!ROBLOX_API_KEY) {

            return interaction.editReply(
                '❌ Falta `ROBLOX_API_KEY` en el archivo `.env`.'
            );

        }


        if (!ROBLOX_CREATOR_ID) {

            return interaction.editReply(
                '❌ Falta `ROBLOX_CREATOR_ID` en el archivo `.env`.'
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
                '⏳ Descargando el Resource Pack...'
            );


            const response =
                await axios.get(
                    attachment.url,
                    {
                        responseType:
                            'arraybuffer',

                        timeout:
                            120000,

                        maxContentLength:
                            500 * 1024 * 1024,

                        maxBodyLength:
                            500 * 1024 * 1024
                    }
                );


            fs.writeFileSync(
                zipInputPath,
                Buffer.from(
                    response.data
                )
            );


            console.log(
                `[SKYIMAGES] Resource Pack downloaded: ${(
                    response.data.byteLength /
                    1024 /
                    1024
                ).toFixed(2)} MB`
            );


            // =================================================
            // SEARCH INSIDE ZIP
            // =================================================

            await interaction.editReply(
                '⚡ Buscando los cielos directamente dentro del ZIP...'
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
                    'No encontré `cloud1.png`, `cloud2.png`, `starfield01.png`, `starfield02.png` ni `starfield03.png` dentro de `assets/minecraft/mcpatcher/sky/world0`.'
                );

            }


            // =================================================
            // CREATE PREVIEW ATTACHMENTS
            // =================================================

            console.log(
                `[SKYIMAGES] Creating ${availableOptions.length} sky previews...`
            );


            const previewFiles =
                [];


            const previewEmbeds =
                [];


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


                // ---------------------------------------------
                // Crear una preview optimizada.
                //
                // No modificamos el archivo original.
                // Solo hacemos una copia para Discord.
                // ---------------------------------------------

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
                            name:
                                previewFileName
                        }
                    );


                previewFiles.push(
                    attachmentPreview
                );


                const embed =
                    new EmbedBuilder()

                        .setColor(
                            0x00A2FF
                        )

                        .setTitle(
                            option.fileName
                        )

                        .setDescription(
                            `☁️ Preview de **${option.fileName}**`
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
                        'Selecciona el cielo que quieres importar'
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
                '☁️ **¿Qué cielo quieres importar?**\n\n' +

                'Estas son las opciones encontradas en el Resource Pack. ' +

                'Puedes ver la preview de cada una arriba y después seleccionar una en el menú.\n\n' +

                `📦 **Cielos encontrados: ${availableOptions.length}/${SKY_OPTIONS.length}**`;


            if (
                missing.length > 0
            ) {

                menuMessage +=
                    '\n\n⚠️ **No encontrados:** ' +

                    missing
                        .map(
                            x =>
                                `\`${x.fileName}\``
                        )
                        .join(
                            ', '
                        );

            }


            // =================================================
            // SEND PREVIEWS + MENU
            // =================================================

            await interaction.editReply({

                content:
                    menuMessage,

                embeds:
                    previewEmbeds,

                files:
                    previewFiles,

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

                    time:
                        120000

                });


            await selectedInteraction.deferUpdate();


            const selectedId =
                selectedInteraction.values[0];


            const selectedOption =
                SKY_OPTIONS.find(
                    option =>
                        option.id ===
                        selectedId
                );


            if (
                !selectedOption
            ) {

                throw new Error(
                    'La selección del cielo no es válida.'
                );

            }


            const inputPath =
                foundSkies[
                    selectedId
                ];


            if (
                !inputPath ||
                !fs.existsSync(inputPath)
            ) {

                throw new Error(
                    `No se pudo encontrar ${selectedOption.fileName} después de la selección.`
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
                    `☁️ Cielo seleccionado: **${selectedOption.fileName}**\n\n` +

                    `⏳ Procesando el cielo...`,

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
                    'No se pudieron detectar las dimensiones del cielo.'
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
                    `El cielo ${selectedOption.fileName} tiene dimensiones inválidas.\n\n` +

                    `Detectado: ${width}x${height}\n` +

                    `El ancho debe ser divisible entre 3 y el alto entre 2.`
                );

            }


            if (
                tileWidth !== tileHeight
            ) {

                throw new Error(
                    `El cielo ${selectedOption.fileName} no contiene seis caras cuadradas.\n\n` +

                    `Detectado: ${width}x${height}\n` +

                    `Cada cara sería ${tileWidth}x${tileHeight}.`
                );

            }


            if (
                tileWidth < MIN_SIZE
            ) {

                throw new Error(
                    'El cielo es demasiado pequeño.'
                );

            }


            console.log(
                `[SKYIMAGES] Valid Java sky detected.`
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

                `⏳ Dividiendo **${selectedOption.fileName}** en 6 caras y convirtiéndolas a **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}**...`

            );


            await Promise.all(

                faces.map(
                    async face => {

                        const left =
                            face.column *
                            tileWidth;


                        const top =
                            face.row *
                            tileHeight;


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

                                width:
                                    tileWidth,

                                height:
                                    tileHeight

                            })

                            .resize(

                                FINAL_FACE_SIZE,

                                FINAL_FACE_SIZE,

                                {

                                    fit:
                                        'fill',

                                    kernel:
                                        sharp.kernel.lanczos3,

                                    withoutEnlargement:
                                        false

                                }

                            )

                            .png({

                                compressionLevel:
                                    9,

                                adaptiveFiltering:
                                    true,

                                force:
                                    true

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
                    finalMetadata.width !==
                        FINAL_FACE_SIZE ||

                    finalMetadata.height !==
                        FINAL_FACE_SIZE
                ) {

                    throw new Error(
                        `${face.fileName} no quedó en ${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}.`
                    );

                }

            }


            // =================================================
            // UPLOAD SIX IMAGES
            // =================================================

            await interaction.editReply(

                `⏳ Subiendo las 6 caras a Roblox...\n\n` +

                `📐 Resolución final: **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}**`

            );


            const uploadedIds =
                {};


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

                            `⏳ Subiendo las imágenes a Roblox...\n\n` +

                            `Procesando **${index + 1}/6**\n` +

                            `🖼️ **${face.name}**\n\n` +

                            `☁️ Cielo: **${selectedOption.fileName}**\n` +

                            `📐 Resolución: **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}**\n\n` +

                            `🔓 Access: **Open Use by default**`

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
                ] =
                    result.assetId;

            }


            // =================================================
            // CREATE JSON
            // =================================================

            const jsonObject = {

                SkyBack:
                    uploadedIds.SkyBack,

                SkyRight:
                    uploadedIds.SkyRight,

                SkyLeft:
                    uploadedIds.SkyLeft,

                SkyBottom:
                    uploadedIds.SkyBottom,

                SkyTop:
                    uploadedIds.SkyTop,

                SkyFront:
                    uploadedIds.SkyFront

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

                `⏳ Creando ZIP con las 6 imágenes ${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE} y el JSON...`

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
                        name:
                            'minecraft_sky_images.zip'
                    }
                );


            // =================================================
            // FINAL MESSAGE
            // =================================================

            await interaction.editReply({

                content:

                    `✅ **¡Cielo de Minecraft convertido correctamente!**\n\n` +

                    `☁️ Cielo importado: **${selectedOption.fileName}**\n` +

                    `📦 Resource Pack: **${attachment.name}**\n\n` +

                    `Original: **${width}x${height}**\n` +

                    `Face size original: **${tileWidth}x${tileHeight}**\n` +

                    `📐 Face size final: **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}**\n\n` +

                    `🖼️ **Roblox IMAGE IDs:**\n\n` +

                    `**SkyBack:** \`${uploadedIds.SkyBack}\`\n` +

                    `**SkyRight:** \`${uploadedIds.SkyRight}\`\n` +

                    `**SkyLeft:** \`${uploadedIds.SkyLeft}\`\n` +

                    `**SkyBottom:** \`${uploadedIds.SkyBottom}\`\n` +

                    `**SkyTop:** \`${uploadedIds.SkyTop}\`\n` +

                    `**SkyFront:** \`${uploadedIds.SkyFront}\`\n\n` +

                    `🔓 **These are Image assets, not Decals.**\n\n` +

                    `📋 **JSON:**\n` +

                    '```json\n' +

                    jsonText +

                    '\n```\n\n' +

                    `📐 Las 6 imágenes fueron convertidas a **${FINAL_FACE_SIZE}x${FINAL_FACE_SIZE}** antes de subirlas.\n\n` +

                    `📦 El ZIP contiene las 6 imágenes y el JSON.`,

                files: [
                    zipFile
                ],

                embeds: [],

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
                        `❌ **Error procesando el cielo:**\n\`${error.message}\``,

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
                            recursive:
                                true,

                            force:
                                true
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

    const directory =
        await unzipper.Open.file(
            zipPath
        );


    const found =
        {};


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
    // FIND ENTRIES
    // ========================================================

    const matchingEntries =
        [];


    for (
        const entry
        of directory.files
    ) {

        if (
            !entry ||
            !entry.path
        ) {

            continue;

        }


        const normalizedPath =
            normalizeZipPath(
                entry.path
            );


        if (
            entry.type === 'Directory'
        ) {

            continue;

        }


        // =================================================
        // HANDLE ROOT FOLDER
        // =================================================

        const assetsIndex =
            normalizedPath.indexOf(
                '/assets/'
            );


        let relativePath;


        if (
            normalizedPath.startsWith(
                'assets/'
            )
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

            continue;

        }


        // =================================================
        // CHECK REQUIRED PATH
        // =================================================

        if (
            !relativePath.startsWith(
                `${normalizedRequired}/`
            )
        ) {

            continue;

        }


        const fileName =
            relativePath
                .split('/')
                .pop()
                .toLowerCase();


        if (
            !wantedFiles.has(
                fileName
            )
        ) {

            continue;

        }


        const skyId =
            wantedFiles.get(
                fileName
            );


        // =================================================
        // DUPLICATE FILE
        // =================================================

        if (
            found[skyId]
        ) {

            continue;

        }


        matchingEntries.push({

            entry,

            skyId,

            fileName

        });


        console.log(
            `[SKYIMAGES] ZIP match: ${entry.path}`
        );

    }


    if (
        matchingEntries.length === 0
    ) {

        return found;

    }


    // ========================================================
    // EXTRACT ONLY MATCHING FILES
    // ========================================================

    for (
        const match
        of matchingEntries
    ) {

        const outputPath =
            path.join(
                jobDir,
                `sky_${match.skyId}.png`
            );


        console.log(
            `[SKYIMAGES] Extracting ONLY ${match.fileName}...`
        );


        const buffer =
            await match.entry.buffer();


        fs.writeFileSync(
            outputPath,
            buffer
        );


        found[
            match.skyId
        ] =
            outputPath;


        console.log(
            `[SKYIMAGES] Extracted ${match.fileName} (${(
                buffer.length /
                1024
            ).toFixed(1)} KB)`
        );

    }


    return found;

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


    const workers =
        [];


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

        assetType:
            'Image',

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

        JSON.stringify(
            requestData
        )

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

            contentType:
                'image/png'

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

                        'x-api-key':
                            apiKey,

                        ...form.getHeaders()

                    },

                    maxContentLength:
                        25 * 1024 * 1024,

                    maxBodyLength:
                        25 * 1024 * 1024,

                    timeout:
                        60000

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

    const maxAttempts =
        60;


    const delayMs =
        1500;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        await sleep(
            delayMs
        );


        let response;


        try {

            response =
                await axios.get(

                    `https://apis.roblox.com/assets/v1/operations/${operationId}`,

                    {

                        headers: {

                            'x-api-key':
                                apiKey

                        },

                        timeout:
                            30000

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

                    reject(
                        error
                    );

                }

            );


            archive.on(

                'error',

                error => {

                    reject(
                        error
                    );

                }

            );


            archive.pipe(
                output
            );


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