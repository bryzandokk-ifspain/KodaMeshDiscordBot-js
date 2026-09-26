const {
    SlashCommandBuilder
} = require('discord.js');

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const unzipper = require('unzipper');

const {
    compress
} = require('@mongodb-js/zstd');

const {
    exec
} = require('child_process');

const util = require('util');

const execPromise =
    util.promisify(exec);


// ============================================================
// CONFIGURACIÓN
// ============================================================

const VALID_SIZES = [
    16,
    32,
    64,
    128,
    256,
    512
];


// ============================================================
// TEXTURA FINAL
// ============================================================

const FINAL_SIZE = 1024;


// ============================================================
// CONCURRENCIA GENERAL
// ============================================================

const CONCURRENCY = 3;


// ============================================================
// REINTENTOS GENERALES
// ============================================================

const MAX_RETRIES = 4;

const RETRY_BASE_DELAY = 2000;


// ============================================================
// LUAU
// ============================================================
//
// IMPORTANTE:
//
// Roblox limita la creación de tareas Luau.
//
// Por eso las tareas Luau:
//
// 1. Nunca se crean simultáneamente.
// 2. Se procesan mediante una cola global.
// 3. Si Roblox devuelve 429, esperamos.
// 4. Después volvemos a intentar.
//
// ============================================================

const LUAU_RETRY_DELAY_MS = 120000;

// Tiempo mínimo entre creaciones de tareas Luau.
// Esto evita volver a golpear el rate limit.
const LUAU_MIN_INTERVAL_MS = 120000;


// Cola global de Luau.
//
// Todas las llamadas a extractMeshIdWithLuau()
// pasan por aquí.
let luauQueue =
    Promise.resolve();


// Último momento en que se creó una tarea Luau.
let lastLuauTaskCreation =
    0;


// ============================================================
// BLENDER
// ============================================================

const BLENDER_PATH =
    'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe';


// ============================================================
// ROBLOX
// ============================================================

const UNIVERSE_ID =
    process.env.ROBLOX_UNIVERSE_ID;

const PLACE_ID =
    process.env.ROBLOX_PLACE_ID;

if (!UNIVERSE_ID || !PLACE_ID) {
    throw new Error('Faltan ROBLOX_UNIVERSE_ID o ROBLOX_PLACE_ID en .env.');
}


// ============================================================
// ROTACIÓN
// ============================================================

const ROTATION_X = 90;

const ROTATION_Y = -45;

const ROTATION_Z = 0;


// ============================================================
// RESOURCE PACK
// ============================================================

const ITEMS_PATH =
    'assets/minecraft/textures/items';


// ============================================================
// TEXTURAS REQUERIDAS
// ============================================================

const REQUIRED_IMAGES = [

    'apple_golden.png',

    'bow_pulling_0.png',
    'bow_pulling_1.png',
    'bow_pulling_2.png',
    'bow_standby.png',

    'diamond.png',
    'diamond_sword.png',
    'diamond_pickaxe.png',

    'emerald.png',

    'gold_sword.png',
    'gold_pickaxe.png',

    'iron_ingot.png',
    'iron_sword.png',
    'iron_pickaxe.png',

    'wood_pickaxe.png',
    'wood_sword.png'

];


// ============================================================
// MAPEO
// ============================================================

const IMAGE_MAPPINGS = {

    'bow_standby.png': {

        mesh: [
            'Bow0Mesh'
        ],

        texture: [
            'Bow0Texture'
        ]

    },


    'bow_pulling_0.png': {

        mesh: [
            'Bow1Mesh'
        ],

        texture: [
            'Bow1Texture'
        ]

    },


    'bow_pulling_1.png': {

        mesh: [
            'Bow2Mesh'
        ],

        texture: [
            'Bow2Texture'
        ]

    },


    'bow_pulling_2.png': {

        mesh: [
            'Bow3Mesh'
        ],

        texture: [
            'Bow3Texture'
        ]

    },


    'diamond.png': {

        mesh: [
            'DiamondMesh'
        ],

        texture: [
            'DiamondTexture',
            'DiamondVPImage'
        ]

    },


    'diamond_sword.png': {

        mesh: [
            'SwordMesh'
        ],

        texture: [
            'DiamondSwordTexture',
            'DiamondSwordVPImage'
        ]

    },


    'emerald.png': {

        mesh: [
            'EmeraldMesh'
        ],

        texture: [
            'EmeraldTexture',
            'EmeraldVPImage'
        ]

    },


    'gold_sword.png': {

        mesh: [],

        texture: [
            'GoldSwordTexture',
            'GoldSwordVPImage'
        ]

    },


    'iron_sword.png': {

        mesh: [],

        texture: [
            'SwordTexture',
            'SwordVPImage'
        ]

    },


    'wood_sword.png': {

        mesh: [],

        texture: [
            'WoodenSwordTexture',
            'WoodenSwordVPImage'
        ]

    },


    'diamond_pickaxe.png': {

        mesh: [
            'PickaxeMesh'
        ],

        texture: [
            'DiamondPickaxeTexture',
            'DiamondPickaxeVPImage'
        ]

    },


    'gold_pickaxe.png': {

        mesh: [],

        texture: [
            'GoldPickaxeTexture',
            'GoldPickaxeVPImage'
        ]

    },


    'iron_pickaxe.png': {

        mesh: [],

        texture: [
            'PickaxeTexture',
            'PickaxeVPImage'
        ]

    },


    'wood_pickaxe.png': {

        mesh: [],

        texture: [
            'WoodenPickaxeTexture',
            'WoodenPickaxeVPImage'
        ]

    },


    'apple_golden.png': {

        mesh: [
            'GoldAppleMesh'
        ],

        texture: [
            'GoldAppleTexture',
            'GoldAppleVPImage'
        ]

    },


    'iron_ingot.png': {

        mesh: [
            'IronMesh'
        ],

        texture: [
            'IronTexture',
            'IronVPImage'
        ]

    }

};


// ============================================================
// BASE PACK
// ============================================================

const BASE_PACK = {

    "BlocksVPImage": "0",

    "BowVPImage": "0",

    "Bow0Mesh": "92849804961177",
    "Bow0Texture": "106315283135757",

    "Bow1Mesh": "113841984909100",
    "Bow1Texture": "117405975573361",

    "Bow2Mesh": "117114136945069",
    "Bow2Texture": "136738607219656",

    "Bow3Mesh": "83076991106180",
    "Bow3Texture": "108462418050816",

    "DefaultBowRotation": [
        3,
        10,
        0
    ],

    "DefaultBowScale": [
        2.25,
        2.25,
        2.25
    ],

    "DefaultBowVPImage": "125562846132623",

    "DiamondMesh": "89942433665877",

    "DiamondPickaxeTexture": "100600191665018",

    "DiamondPickaxeVPImage": "79286119024383",

    "DiamondRotation": [
        0,
        0,
        35
    ],

    "DiamondScale": [
        1.75,
        1.75,
        1.75
    ],

    "DiamondSwordTexture": "70607247755398",

    "DiamondSwordVPImage": "121813241620253",

    "DiamondTexture": "110971495548600",

    "DiamondVPImage": "80980212931542",

    "EmeraldMesh": "103144736944926",

    "EmeraldRotation": [
        0,
        0,
        35
    ],

    "EmeraldScale": [
        1.75,
        1.75,
        1.75
    ],

    "EmeraldTexture": "76814700693963",

    "EmeraldVPImage": "114574104351628",

    "GoldAppleEatingScale": [
        2,
        2,
        2
    ],

    "GoldAppleMesh": "102080395642844",

    "GoldAppleRotation": [
        0,
        -90,
        0
    ],

    "GoldAppleScale": [
        2,
        2,
        2
    ],

    "GoldAppleTexture": "134804404631534",

    "GoldAppleVPImage": "87840797652428",

    "GoldPickaxeTexture": "100702988360136",

    "GoldPickaxeVPImage": "93648784178538",

    "GoldSwordTexture": "128274654568144",

    "GoldSwordVPImage": "102241119116435",

    "IronMesh": "140129701237490",

    "IronRotation": [
        0,
        0,
        35
    ],

    "IronScale": [
        1.5,
        1.5,
        1.5
    ],

    "IronTexture": "92208499998673",

    "IronVPImage": "75536662764889",

    "PickaxeMesh": "125989025789786",

    "PickaxeRotation": [
        0,
        0,
        0
    ],

    "PickaxeScale": [
        2,
        2,
        2
    ],

    "PickaxeTexture": "133923679754669",

    "PickaxeVPImage": "85938952726145",

    "ReducedBlockLag": true,

    "SwordBlockingRotation": [
        -45,
        110,
        -30
    ],

    "SwordBlockingScale": [
        2,
        2,
        2
    ],

    "SwordMesh": "122647348621426",

    "SwordRotation": [
        0,
        -180,
        0
    ],

    "SwordScale": [
        2,
        2,
        2
    ],

    "SwordTexture": "97652904601266",

    "SwordVPImage": "85738183333201",

    "WoodenPickaxeTexture": "130067289543263",

    "WoodenPickaxeVPImage": "81722050094564",

    "WoodenSwordTexture": "95597552216546",

    "WoodenSwordVPImage": "137681027313560"

};


// ============================================================
// COMANDO
// ============================================================

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName(
                'portpack'
            )

            .setDescription(
                'Convierte un Minecraft Resource Pack en un JSON de Bridge Duels'
            )

            .addAttachmentOption(
                option =>
                    option

                        .setName(
                            'pack'
                        )

                        .setDescription(
                            'Resource Pack .zip'
                        )

                        .setRequired(
                            true
                        )
            ),


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(
        interaction
    ) {

        console.log();
        console.log(
            '============================================================'
        );
        console.log(
            '[PORTPACK] Starting...'
        );
        console.log(
            '============================================================'
        );


        // ====================================================
        // VALIDAR INTERACCIÓN
        // ====================================================

        if (
            !interaction.deferred &&
            !interaction.replied
        ) {

            throw new Error(
                'La interacción no fue reconocida por Discord antes de ejecutar el comando.'
            );

        }


        // ====================================================
        // OBTENER ZIP
        // ====================================================

        const attachment =
            interaction.options.getAttachment(
                'pack'
            );


        if (
            !attachment
        ) {

            await safeEditReply(
                interaction,
                '❌ No se proporcionó ningún Resource Pack.'
            );

            return;

        }


        const fileName =
            String(
                attachment.name ||
                ''
            ).toLowerCase();


        if (
            !fileName.endsWith(
                '.zip'
            )
        ) {

            await safeEditReply(
                interaction,
                '❌ El archivo debe ser un **Resource Pack .zip**.'
            );

            return;

        }


        // ====================================================
        // TEMP
        // ====================================================

        const tempRoot =
            path.join(
                __dirname,
                '..',
                'temp'
            );


        fs.mkdirSync(
            tempRoot,
            {
                recursive: true
            }
        );


        const jobId =
            `portpack_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`;


        const tempDir =
            path.join(
                tempRoot,
                jobId
            );


        fs.mkdirSync(
            tempDir,
            {
                recursive: true
            }
        );


        const zipPath =
            path.join(
                tempDir,
                'resourcepack.zip'
            );


        try {

            // =================================================
            // PROGRESO
            // =================================================

            await updateProgress(
                interaction,
                1,
                'Descargando Resource Pack...'
            );


            // =================================================
            // DESCARGAR ZIP
            // =================================================

            console.log(
                `[PORTPACK] Downloading: ${attachment.url}`
            );


            const response =
                await retryOperation(

                    async () => {

                        return axios.get(

                            attachment.url,

                            {

                                responseType:
                                    'arraybuffer',

                                timeout:
                                    180000,

                                maxContentLength:
                                    150 * 1024 * 1024,

                                maxBodyLength:
                                    150 * 1024 * 1024

                            }

                        );

                    },

                    'descarga del Resource Pack',

                    MAX_RETRIES

                );


            fs.writeFileSync(

                zipPath,

                Buffer.from(
                    response.data
                )

            );


            console.log(
                `[PORTPACK] ZIP saved: ${zipPath}`
            );


            // =================================================
            // ABRIR ZIP
            // =================================================

            await updateProgress(
                interaction,
                5,
                'Abriendo Resource Pack y buscando las texturas...'
            );


            const directory =
                await unzipper.Open.file(
                    zipPath
                );


            // =================================================
            // BUSCAR ARCHIVOS
            // =================================================

            const filesByName =
                new Map();


            for (
                const file of directory.files
            ) {

                if (
                    !file ||
                    !file.path
                ) {

                    continue;

                }


                const normalized =
                    normalizeZipPath(
                        file.path
                    );


                if (
                    normalized.endsWith('/')
                ) {

                    continue;

                }


                const lower =
                    normalized.toLowerCase();


                if (
                    lower.startsWith(
                        `${ITEMS_PATH.toLowerCase()}/`
                    )
                ) {

                    filesByName.set(
                        lower,
                        file
                    );

                }

            }


            const foundFiles = {};

            const missingImages = [];


            for (
                const imageName of REQUIRED_IMAGES
            ) {

                const wantedPath =
                    `${ITEMS_PATH}/${imageName}`
                        .toLowerCase();


                const file =
                    filesByName.get(
                        wantedPath
                    );


                if (
                    !file
                ) {

                    missingImages.push(
                        imageName
                    );

                    continue;

                }


                foundFiles[
                    imageName
                ] = file;

            }


            // =================================================
            // VALIDAR
            // =================================================

            if (
                missingImages.length > 0
            ) {

                throw new Error(

                    `El Resource Pack no contiene todas las ` +
                    `texturas necesarias.\n\n` +

                    `❌ Faltan:\n` +

                    missingImages
                        .map(
                            name =>
                                `• ${name}`
                        )
                        .join('\n') +

                    `\n\nRuta esperada:\n` +

                    `assets/minecraft/textures/items/`

                );

            }


            console.log(
                `[PORTPACK] All ${REQUIRED_IMAGES.length} required images found.`
            );


            await updateProgress(
                interaction,
                10,
                `Encontradas las ${REQUIRED_IMAGES.length} texturas necesarias.`
            );


            // =================================================
            // CARPETA IMÁGENES
            // =================================================

            const imagesDir =
                path.join(
                    tempDir,
                    'images'
                );


            fs.mkdirSync(
                imagesDir,
                {
                    recursive: true
                }
            );


            // =================================================
            // EXTRAER
            // =================================================

            await Promise.all(

                REQUIRED_IMAGES.map(
                    async imageName => {

                        const file =
                            foundFiles[
                                imageName
                            ];


                        const imageBuffer =
                            await retryOperation(

                                async () => {

                                    return file.buffer();

                                },

                                `extracción de ${imageName}`,

                                MAX_RETRIES

                            );


                        const outputImagePath =
                            path.join(
                                imagesDir,
                                imageName
                            );


                        fs.writeFileSync(
                            outputImagePath,
                            imageBuffer
                        );


                        console.log(
                            `[PORTPACK] Extracted: ${imageName}`
                        );

                    }
                )

            );


            await updateProgress(
                interaction,
                12,
                'Texturas extraídas. Iniciando procesamiento...'
            );


            // =================================================
            // ASSETS GENERADOS
            // =================================================

            const generatedAssets = {};

            let completed =
                0;


            const total =
                REQUIRED_IMAGES.length;


            const progressLock = {
                promise: Promise.resolve()
            };


            // =================================================
            // PROCESAR UNA TEXTURA
            // =================================================

            const processOne =
                async imageName => {

                    console.log();
                    console.log(
                        `[PORTPACK] ============================================`
                    );
                    console.log(
                        `[PORTPACK] ${completed + 1}/${total}: ${imageName}`
                    );
                    console.log(
                        `[PORTPACK] ============================================`
                    );


                    const imagePath =
                        path.join(
                            imagesDir,
                            imageName
                        );


                    // -----------------------------------------
                    // METADATA
                    // -----------------------------------------

                    const metadata =
                        await sharp(
                            imagePath
                        ).metadata();


                    const width =
                        metadata.width;


                    const height =
                        metadata.height;


                    if (
                        !width ||
                        !height
                    ) {

                        throw new Error(
                            `No se pudo detectar la resolución de ${imageName}.`
                        );

                    }


                    if (
                        width !== height
                    ) {

                        throw new Error(

                            `${imageName} no es cuadrada.\n` +

                            `Resolución encontrada: ` +

                            `${width}x${height}`

                        );

                    }


                    if (
                        !VALID_SIZES.includes(
                            width
                        )
                    ) {

                        throw new Error(

                            `${imageName} tiene una resolución no válida.\n\n` +

                            `Resoluciones permitidas: ` +

                            `${VALID_SIZES
                                .map(
                                    size =>
                                        `${size}x${size}`
                                )
                                .join(', ')}\n\n` +

                            `Resolución encontrada: ` +

                            `${width}x${height}`

                        );

                    }


                    // -----------------------------------------
                    // TEXTURA 1024
                    // -----------------------------------------

                    const texturePath =
                        path.join(

                            tempDir,

                            `texture_${sanitizeFileName(
                                imageName
                            )}`

                        );


                    await retryOperation(

                        async () => {

                            await sharp(
                                imagePath
                            )

                                .ensureAlpha()

                                .resize(

                                    FINAL_SIZE,

                                    FINAL_SIZE,

                                    {

                                        kernel:
                                            sharp.kernel.nearest

                                    }

                                )

                                .png()

                                .toFile(
                                    texturePath
                                );

                        },

                        `procesamiento de textura ${imageName}`,

                        MAX_RETRIES

                    );


                    // -----------------------------------------
                    // FBX
                    // -----------------------------------------

                    const baseName =
                        path.basename(
                            imageName,
                            '.png'
                        );


                    const fbxPath =
                        path.join(

                            tempDir,

                            `${baseName}.fbx`

                        );


                    const blendPath =
                        path.join(

                            tempDir,

                            `${baseName}.blend`

                        );


                    // -----------------------------------------
                    // BLENDER
                    // -----------------------------------------

                    await retryOperation(

                        async () => {

                            try {

                                if (
                                    fs.existsSync(
                                        fbxPath
                                    )
                                ) {

                                    fs.rmSync(
                                        fbxPath,
                                        {
                                            force:
                                                true
                                        }
                                    );

                                }

                            } catch {}


                            await generateMeshWithBlender(

                                texturePath,

                                imagePath,

                                fbxPath,

                                blendPath,

                                width,

                                ROTATION_X,

                                ROTATION_Y,

                                ROTATION_Z

                            );

                        },

                        `generación Blender de ${imageName}`,

                        MAX_RETRIES

                    );


                    if (
                        !fs.existsSync(
                            fbxPath
                        )
                    ) {

                        throw new Error(

                            `Blender no creó el FBX de ${imageName}.`

                        );

                    }


                    // -----------------------------------------
                    // SUBIR TEXTURA
                    // -----------------------------------------

                    const textureId =
                        await uploadAsset(

                            texturePath,

                            'Image',

                            `PortPack_${baseName}_Texture_${Date.now()}`

                        );


                    // -----------------------------------------
                    // SUBIR MODELO
                    // -----------------------------------------

                    const modelId =
                        await uploadAsset(

                            fbxPath,

                            'Model',

                            `PortPack_${baseName}_Mesh_${Date.now()}`

                        );


                    // -----------------------------------------
                    // MESH ID
                    // -----------------------------------------
                    //
                    // IMPORTANTE:
                    //
                    // Esta función ahora entra en una cola
                    // global y NO puede ejecutarse junto con
                    // otra tarea Luau.
                    //
                    // -----------------------------------------

                    const meshId =
                        await extractMeshIdWithLuau(
                            modelId
                        );


                    generatedAssets[
                        imageName
                    ] = {

                        meshId:
                            String(
                                meshId
                            ),

                        textureId:
                            String(
                                textureId
                            )

                    };


                    completed++;


                    // -----------------------------------------
                    // PROGRESO
                    // -----------------------------------------

                    const progress =
                        Math.min(

                            97,

                            Math.round(

                                12 +

                                (
                                    completed /
                                    total
                                ) * 85

                            )

                        );


                    progressLock.promise =
                        progressLock.promise.then(

                            () =>
                                updateProgress(

                                    interaction,

                                    progress,

                                    `Procesadas ${completed}/${total} texturas.`

                                )

                        );


                    await progressLock.promise;


                    console.log(
                        `[PORTPACK] COMPLETE ${imageName}`
                    );


                    console.log(
                        `  TextureId: ${textureId}`
                    );


                    console.log(
                        `  MeshId: ${meshId}`
                    );

                };


            // =================================================
            // WORKERS
            // =================================================
            //
            // Blender + uploads pueden seguir usando
            // concurrencia.
            //
            // Luau está protegido por la cola global.
            //
            // =================================================

            await runWithConcurrency(

                REQUIRED_IMAGES,

                CONCURRENCY,

                processOne

            );


            // =================================================
            // VERIFICAR
            // =================================================

            if (
                Object.keys(
                    generatedAssets
                ).length !== total
            ) {

                throw new Error(

                    `Solo se generaron ` +

                    `${Object.keys(
                        generatedAssets
                    ).length}/${total} texturas.`

                );

            }


            // =================================================
            // JSON
            // =================================================

            await updateProgress(

                interaction,

                98,

                'Construyendo el JSON de Bridge Duels...'

            );


            const finalPack =
                buildFinalPack(
                    generatedAssets
                );


            const jsonString =
                JSON.stringify(
                    finalPack,
                    null,
                    4
                );


            console.log(
                '[PORTPACK] Final JSON built.'
            );


            // =================================================
            // ZSTD
            // =================================================

            await updateProgress(

                interaction,

                99,

                'Comprimiendo JSON con Zstandard...'

            );


            const jsonBuffer =
                Buffer.from(
                    jsonString,
                    'utf8'
                );


            const compressedBuffer =
                await compress(

                    jsonBuffer,

                    10

                );


            const zbase64 =
                compressedBuffer.toString(
                    'base64'
                );


            const compressedObject = {

                m: null,

                t: "buffer",

                zbase64

            };


            const compressedJson =
                JSON.stringify(
                    compressedObject
                );


            console.log();
            console.log(
                '[PORTPACK] ============================================'
            );
            console.log(
                '[PORTPACK] ZSTD COMPLETE'
            );
            console.log(
                `[PORTPACK] Original JSON: ${jsonBuffer.length} bytes`
            );
            console.log(
                `[PORTPACK] Compressed: ${compressedBuffer.length} bytes`
            );
            console.log(
                `[PORTPACK] Base64: ${zbase64.length} characters`
            );
            console.log(
                '[PORTPACK] ============================================'
            );


            // =================================================
            // FINAL
            // =================================================

            await updateProgress(

                interaction,

                100,

                '¡PortPack terminado!'

            );


            await sendCopyableJson(

                interaction,

                compressedJson

            );


            console.log(
                '[PORTPACK] Completed successfully.'
            );


        } catch (error) {

            console.error();
            console.error(
                '[ERROR] /portpack:'
            );
            console.error(
                error
            );


            await safeEditReply(

                interaction,

                `❌ **Error en /portpack:**\n\n` +

                `\`${String(
                    error?.message ||
                    'Ocurrió un error desconocido.'
                ).slice(0, 1800)}\``

            );


        } finally {

            // =================================================
            // LIMPIEZA
            // =================================================

            try {

                if (
                    fs.existsSync(
                        tempDir
                    )
                ) {

                    fs.rmSync(

                        tempDir,

                        {

                            recursive:
                                true,

                            force:
                                true

                        }

                    );


                    console.log(
                        `[CLEANUP] Deleted ${tempDir}`
                    );

                }

            } catch (cleanupError) {

                console.warn(

                    '[CLEANUP] No se pudo eliminar temp:',

                    cleanupError.message

                );

            }

        }

    }

};


// ============================================================
// CONSTRUIR JSON FINAL
// ============================================================

function buildFinalPack(
    generatedAssets
) {

    const result =
        JSON.parse(
            JSON.stringify(
                BASE_PACK
            )
        );


    for (
        const imageName of REQUIRED_IMAGES
    ) {

        const mapping =
            IMAGE_MAPPINGS[
                imageName
            ];


        const generated =
            generatedAssets[
                imageName
            ];


        if (
            !mapping ||
            !generated
        ) {

            continue;

        }


        // ====================================================
        // MESH
        // ====================================================

        for (
            const field of mapping.mesh
        ) {

            result[field] =
                String(
                    generated.meshId
                );

        }


        // ====================================================
        // TEXTURE
        // ====================================================

        for (
            const field of mapping.texture
        ) {

            result[field] =
                String(
                    generated.textureId
                );

        }

    }


    return result;

}


// ============================================================
// BLENDER
// ============================================================

async function generateMeshWithBlender(

    texturePath,

    originalImagePath,

    fbxPath,

    blendPath,

    originalSize,

    rotationX,

    rotationY,

    rotationZ

) {

    const scriptPath =
        path.join(

            __dirname,

            '..',

            'create_image_mesh.py'

        );


    if (
        !fs.existsSync(
            scriptPath
        )
    ) {

        throw new Error(

            `No existe create_image_mesh.py:\n${scriptPath}`

        );

    }


    if (
        !fs.existsSync(
            BLENDER_PATH
        )
    ) {

        throw new Error(

            `No se encontró Blender en:\n${BLENDER_PATH}`

        );

    }


    console.log(
        '[BLENDER] Starting...'
    );


    const command =

        `"${BLENDER_PATH}" ` +

        `--factory-startup ` +

        `--background ` +

        `--python "${scriptPath}" ` +

        `-- ` +

        `"${texturePath}" ` +

        `"${originalImagePath}" ` +

        `"${fbxPath}" ` +

        `"${blendPath}" ` +

        `${originalSize} ` +

        `${rotationX} ` +

        `${rotationY} ` +

        `${rotationZ}`;


    console.log(
        '[BLENDER] Command prepared.'
    );


    let stdout = '';

    let stderr = '';


    try {

        const result =
            await execPromise(

                command,

                {

                    timeout:
                        180000,

                    maxBuffer:
                        50 * 1024 * 1024

                }

            );


        stdout =
            result.stdout ||
            '';


        stderr =
            result.stderr ||
            '';


    } catch (error) {

        stdout =
            error.stdout ||
            '';


        stderr =
            error.stderr ||
            '';


        console.error(
            '[BLENDER] Process error.'
        );


        if (
            stdout
        ) {

            console.error(
                '[BLENDER STDOUT]',
                stdout
            );

        }


        if (
            stderr
        ) {

            console.error(
                '[BLENDER STDERR]',
                stderr
            );

        }


        throw new Error(

            `Blender falló durante la generación del mesh.\n\n` +

            `${error.message || 'Error desconocido'}\n\n` +

            `Revisa la consola para ver el error de Python.`

        );

    }


    if (
        stdout
    ) {

        console.log(
            '[BLENDER STDOUT]',
            stdout
        );

    }


    if (
        stderr
    ) {

        console.log(
            '[BLENDER STDERR]',
            stderr
        );

    }


    const blenderOutput =
        `${stdout}\n${stderr}`;


    if (
        /create_image_mesh\.py.*SyntaxError:/is.test(
            blenderOutput
        )
    ) {

        throw new Error(

            `create_image_mesh.py tiene un error de Python:\n\n` +

            blenderOutput.slice(
                -8000
            )

        );

    }


    if (
        /File ".*create_image_mesh\.py".*line/i.test(
            blenderOutput
        ) &&

        /Traceback \(most recent call last\):/i.test(
            blenderOutput
        )
    ) {

        throw new Error(

            `El script de Blender produjo un error:\n\n` +

            blenderOutput.slice(
                -8000
            )

        );

    }


    if (
        !fs.existsSync(
            fbxPath
        )
    ) {

        throw new Error(

            `Blender terminó pero NO creó el FBX:\n` +

            `${fbxPath}`

        );

    }


    const stats =
        fs.statSync(
            fbxPath
        );


    if (
        stats.size <= 0
    ) {

        throw new Error(
            'El FBX fue creado pero está vacío.'
        );

    }


    console.log(

        `[BLENDER] FBX successfully created: ` +

        `${stats.size} bytes`

    );

}


// ============================================================
// ROBLOX ASSET UPLOAD
// ============================================================

async function uploadAsset(

    filePath,

    assetType,

    name

) {

    const apiKey =
        process.env.ROBLOX_API_KEY;


    const creatorId =
        process.env.ROBLOX_CREATOR_ID;


    const isGroup =
        String(
            process.env.ROBLOX_IS_GROUP
        ).toLowerCase() === 'true';


    if (
        !apiKey ||
        !creatorId
    ) {

        throw new Error(

            'Faltan ROBLOX_API_KEY o ROBLOX_CREATOR_ID en .env.'

        );

    }


    if (
        !fs.existsSync(
            filePath
        )
    ) {

        throw new Error(

            `No existe el archivo:\n${filePath}`

        );

    }


    const stats =
        fs.statSync(
            filePath
        );


    if (
        stats.size <= 0
    ) {

        throw new Error(

            `El archivo está vacío:\n${filePath}`

        );

    }


    let createRes;


    // ========================================================
    // CREAR ASSET
    // ========================================================

    createRes =
        await retryOperation(

            async () => {

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

                    assetType,

                    displayName:
                        name,

                    description:
                        'Generado automáticamente por RobloxImageBot',

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


                let contentType;


                if (
                    assetType === 'Model'
                ) {

                    contentType =
                        'model/fbx';

                } else if (
                    assetType === 'Image'
                ) {

                    contentType =
                        'image/png';

                } else {

                    throw new Error(

                        `AssetType no soportado: ${assetType}`

                    );

                }


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

                        contentType

                    }

                );


                try {

                    return await axios.post(

                        'https://apis.roblox.com/assets/v1/assets',

                        form,

                        {

                            headers: {

                                ...form.getHeaders(),

                                'x-api-key':
                                    apiKey

                            },

                            maxContentLength:
                                Infinity,

                            maxBodyLength:
                                Infinity,

                            timeout:
                                60000

                        }

                    );

                } catch (error) {

                    const details =
                        error.response?.data

                            ? JSON.stringify(
                                error.response.data
                            )

                            : error.message;


                    throw new Error(

                        `Roblox rechazó ${assetType}:\n${details}`

                    );

                }

            },

            `subida ${assetType} ${name}`,

            MAX_RETRIES

        );


    const operationPath =
        createRes.data?.path;


    if (
        !operationPath
    ) {

        throw new Error(

            `Roblox no devolvió operation path:\n` +

            JSON.stringify(
                createRes.data
            )

        );

    }


    const operationId =
        operationPath
            .split('/')
            .pop();


    console.log(
        `[ROBLOX] Operation: ${operationId}`
    );


    // ========================================================
    // ESPERAR OPERACIÓN
    // ========================================================

    let assetId = null;


    for (
        let i = 0;
        i < 40;
        i++
    ) {

        await sleep(
            1500
        );


        try {

            const statusRes =
                await retryOperation(

                    async () => {

                        return axios.get(

                            `https://apis.roblox.com/assets/v1/operations/${operationId}`,

                            {

                                headers: {

                                    'x-api-key':
                                        apiKey

                                },

                                timeout:
                                    15000

                            }

                        );

                    },

                    `consulta de operación ${operationId}`,

                    2

                );


            const data =
                statusRes.data;


            console.log(

                `[ROBLOX] ${assetType} ${name} ` +

                `check ${i + 1}/40: ${data.done}`

            );


            if (
                data.done === true
            ) {

                if (
                    data.error
                ) {

                    throw new Error(

                        data.error.message ||

                        JSON.stringify(
                            data.error
                        )

                    );

                }


                assetId =
                    data.response?.assetId;


                if (
                    !assetId
                ) {

                    throw new Error(

                        `Roblox terminó pero no devolvió assetId:\n` +

                        JSON.stringify(
                            data
                        )

                    );

                }


                break;

            }


        } catch (error) {

            console.warn(

                `[ROBLOX] Error checking operation ` +

                `${i + 1}/40: ${error.message}`

            );


            if (
                /Roblox terminó pero no devolvió assetId/i.test(
                    error.message
                )
            ) {

                throw error;

            }

        }

    }


    if (
        !assetId
    ) {

        throw new Error(

            `Tiempo de espera agotado subiendo ${name}.`

        );

    }


    console.log(
        `[ROBLOX] Asset created: ${assetId}`
    );


    // ========================================================
    // OPEN USE
    // ========================================================

    await applyOpenUse(
        assetId,
        apiKey
    );


    return String(
        assetId
    );

}


// ============================================================
// OPEN USE
// ============================================================

async function applyOpenUse(

    assetId,

    apiKey

) {

    try {

        await retryOperation(

            async () => {

                try {

                    await axios.patch(

                        'https://apis.roblox.com/asset-permissions-api/v1/assets/permissions',

                        {

                            subjectType:
                                'All',

                            subjectId:
                                null,

                            action:
                                'Use',

                            requests: [

                                {

                                    assetId:
                                        Number(
                                            assetId
                                        )

                                }

                            ]

                        },

                        {

                            headers: {

                                'x-api-key':
                                    apiKey,

                                'Content-Type':
                                    'application/json'

                            },

                            timeout:
                                15000

                        }

                    );

                } catch (error) {

                    throw new Error(

                        error.response?.data

                            ? JSON.stringify(
                                error.response.data
                            )

                            : error.message

                    );

                }

            },

            `Open Use ${assetId}`,

            MAX_RETRIES

        );


        console.log(
            `[ROBLOX] Open Use applied: ${assetId}`
        );


    } catch (error) {

        console.warn(

            '[ROBLOX] No se pudo aplicar Open Use:',

            error.message

        );

    }

}


// ============================================================
// LUAU → MESH ID
// ============================================================
//
// ESTA ES LA PARTE IMPORTANTE DE LA CORRECCIÓN.
//
// Antes:
//
// Textura 1 ──┐
// Textura 2 ──┼──> varias tareas Luau simultáneas
// Textura 3 ──┘
//
// Ahora:
//
// Textura 1 ──> [COLA] ──> Luau
// Textura 2 ──> [COLA] ──> Luau
// Textura 3 ──> [COLA] ──> Luau
//
// Solo una tarea se crea a la vez.
//
// ============================================================

async function extractMeshIdWithLuau(
    modelId
) {

    // --------------------------------------------------------
    // Meter la operación en la cola global.
    // --------------------------------------------------------

    const previous =
        luauQueue;


    let release;

    const current =
        new Promise(
            resolve => {
                release = resolve;
            }
        );


    luauQueue =
        previous
            .catch(() => {})
            .then(
                () => current
            );


    await previous.catch(() => {});


    try {

        console.log();
        console.log(
            `[LUAU] ============================================`
        );
        console.log(
            `[LUAU] Esperando turno para ModelId ${modelId}`
        );
        console.log(
            `[LUAU] ============================================`
        );


        const result =
            await extractMeshIdWithLuauInternal(
                modelId
            );


        return result;


    } finally {

        release();

    }

}


// ============================================================
// LUAU INTERNO
// ============================================================

async function extractMeshIdWithLuauInternal(
    modelId
) {

    const apiKey =
        process.env.ROBLOX_API_KEY;


    if (
        !apiKey
    ) {

        throw new Error(
            'Falta ROBLOX_API_KEY.'
        );

    }


    const luauScript = `

local InsertService = game:GetService("InsertService")

local success, result = pcall(function()

    local model = InsertService:LoadAsset(${modelId})

    if not model then
        error("InsertService no devolvió Model")
    end

    local meshPart =
        model:FindFirstChildWhichIsA(
            "MeshPart",
            true
        )

    if not meshPart then
        error("No se encontró ningún MeshPart")
    end

    local meshId = meshPart.MeshId

    local id =
        string.match(
            tostring(meshId),
            "%d+"
        )

    if not id then
        error("No se pudo extraer el MeshId")
    end

    return id

end)

if success then
    return result
else
    error(tostring(result))
end

`;


    // ========================================================
    // REINTENTAR CREACIÓN LUau
    // ========================================================

    let taskPath =
        null;


    let lastCreationError =
        null;


    const MAX_LUAU_ATTEMPTS =
        5;


    for (
        let attempt = 1;
        attempt <= MAX_LUAU_ATTEMPTS;
        attempt++
    ) {

        try {

            // ------------------------------------------------
            // RESPETAR INTERVALO MÍNIMO
            // ------------------------------------------------

            const now =
                Date.now();


            const elapsed =
                now -
                lastLuauTaskCreation;


            if (
                lastLuauTaskCreation > 0 &&
                elapsed < LUAU_MIN_INTERVAL_MS
            ) {

                const waitTime =
                    LUAU_MIN_INTERVAL_MS -
                    elapsed;


                console.log(

                    `[LUAU] ⏳ Esperando ${waitTime}ms ` +

                    `antes de crear la siguiente tarea...`

                );


                await sleep(
                    waitTime
                );

            }


            console.log(

                `[LUAU] Creando tarea para ModelId ${modelId} ` +

                `(intento ${attempt}/${MAX_LUAU_ATTEMPTS})`

            );


            const createRes =
                await axios.post(

                    `https://apis.roblox.com/cloud/v2/universes/${UNIVERSE_ID}/places/${PLACE_ID}/luau-execution-session-tasks`,

                    {

                        script:
                            luauScript

                    },

                    {

                        headers: {

                            'x-api-key':
                                apiKey,

                            'Content-Type':
                                'application/json'

                        },

                        timeout:
                            30000

                    }

                );


            // ------------------------------------------------
            // SOLO ACTUALIZAMOS EL TIMESTAMP SI ROBLOX
            // ACEPTÓ LA CREACIÓN.
            // ------------------------------------------------

            lastLuauTaskCreation =
                Date.now();


            taskPath =
                createRes.data?.path;


            if (
                !taskPath
            ) {

                throw new Error(

                    'Roblox no devolvió task path para Luau.'

                );

            }


            console.log(
                `[LUAU] ✅ Task creada: ${taskPath}`
            );


            break;


        } catch (error) {

            lastCreationError =
                error;


            const status =
                error.response?.status;


            const responseData =
                error.response?.data;


            console.error(
                `[LUAU] Error creando tarea para ${modelId}.`
            );


            console.error(
                `[LUAU] HTTP: ${status || 'desconocido'}`
            );


            console.error(
                `[LUAU] Response:`,
                responseData
                    ? JSON.stringify(
                        responseData
                    )
                    : error.message
            );


            // =================================================
            // RATE LIMIT 429
            // =================================================

            if (
                status === 429
            ) {

                console.warn(
                    '[LUAU] ⚠️ Roblox devolvió HTTP 429.'
                );


                // ---------------------------------------------
                // Intentar obtener Retry-After
                // ---------------------------------------------

                let retryAfter =
                    null;


                const headers =
                    error.response?.headers;


                if (
                    headers
                ) {

                    const headerValue =
                        headers['retry-after'] ||
                        headers['Retry-After'];


                    if (
                        headerValue !== undefined
                    ) {

                        const numeric =
                            Number(
                                headerValue
                            );


                        if (
                            Number.isFinite(
                                numeric
                            )
                        ) {

                            // Retry-After puede venir en segundos.
                            retryAfter =
                                numeric * 1000;

                        }

                    }

                }


                // ---------------------------------------------
                // Roblox puede no mandar Retry-After.
                //
                // En ese caso usamos 120 segundos.
                // ---------------------------------------------

                const waitTime =
                    retryAfter &&
                    retryAfter > 0

                        ? Math.max(
                            retryAfter,
                            LUAU_RETRY_DELAY_MS
                        )

                        : LUAU_RETRY_DELAY_MS;


                console.warn(

                    `[LUAU] ⏳ Esperando ${waitTime}ms ` +

                    `antes del siguiente intento...`

                );


                await sleep(
                    waitTime
                );


                continue;

            }


            // =================================================
            // OTROS ERRORES
            // =================================================

            if (
                attempt >= MAX_LUAU_ATTEMPTS
            ) {

                break;

            }


            const waitTime =
                RETRY_BASE_DELAY *
                Math.pow(
                    2,
                    attempt - 1
                );


            console.warn(

                `[LUAU] Reintentando en ${waitTime}ms...`

            );


            await sleep(
                waitTime
            );

        }

    }


    if (
        !taskPath
    ) {

        throw new Error(

            `Roblox rechazó la creación de la tarea Luau.\n` +

            `${lastCreationError?.response?.data
                ? JSON.stringify(
                    lastCreationError.response.data
                )
                : lastCreationError?.message ||
                    'Error desconocido.'}`

        );

    }


    // ========================================================
    // ESPERAR TASK
    // ========================================================

    let meshId =
        null;


    for (
        let i = 0;
        i < 30;
        i++
    ) {

        await sleep(
            2000
        );


        try {

            const statusRes =
                await retryOperation(

                    async () => {

                        return axios.get(

                            `https://apis.roblox.com/cloud/v2/${taskPath}`,

                            {

                                headers: {

                                    'x-api-key':
                                        apiKey

                                },

                                timeout:
                                    15000

                            }

                        );

                    },

                    `consulta Luau ${i + 1}/30`,

                    2

                );


            const data =
                statusRes.data;


            const state =
                data?.state;


            console.log(
                `[LUAU] ${i + 1}/30: ${state}`
            );


            // =================================================
            // COMPLETE
            // =================================================

            if (
                state === 'COMPLETE'
            ) {

                const results =
                    data
                        ?.output
                        ?.results;


                if (
                    results &&
                    results[0] !== undefined &&
                    results[0] !== null
                ) {

                    meshId =
                        String(
                            results[0]
                        );

                    break;

                }


                throw new Error(
                    'Luau terminó pero no devolvió MeshId.'
                );

            }


            // =================================================
            // FAILED
            // =================================================

            if (
                state === 'FAILED' ||
                state === 'CANCELLED'
            ) {

                throw new Error(

                    `Luau falló: ` +

                    `${data?.error?.message ||

                        JSON.stringify(
                            data?.error ||
                            data
                        )}`

                );

            }


        } catch (error) {

            console.warn(

                `[LUAU] Error ${i + 1}/30: ${error.message}`

            );


            if (
                /Luau falló:/i.test(
                    error.message
                )
            ) {

                throw error;

            }


            if (
                /Luau terminó pero no devolvió MeshId/i.test(
                    error.message
                )
            ) {

                throw error;

            }

        }

    }


    if (
        !meshId
    ) {

        throw new Error(
            'Tiempo de espera agotado en Luau.'
        );

    }


    console.log(
        `[LUAU] MeshId extracted: ${meshId}`
    );


    // ========================================================
    // OPEN USE MESH
    // ========================================================

    await applyOpenUse(
        meshId,
        apiKey
    );


    return meshId;

}


// ============================================================
// PROCESAMIENTO CON CONCURRENCIA
// ============================================================

async function runWithConcurrency(

    items,

    concurrency,

    worker

) {

    let nextIndex = 0;


    let firstError = null;


    async function runner() {

        while (true) {

            const index =
                nextIndex++;


            if (
                index >= items.length
            ) {

                return;

            }


            try {

                await worker(
                    items[index]
                );

            } catch (error) {

                if (
                    !firstError
                ) {

                    firstError =
                        error;

                }


                return;

            }

        }

    }


    const workers =
        Math.min(
            concurrency,
            items.length
        );


    await Promise.all(

        Array.from(

            {

                length:
                    workers

            },

            () =>
                runner()

        )

    );


    if (
        firstError
    ) {

        throw firstError;

    }

}


// ============================================================
// NORMALIZAR PATH
// ============================================================

function normalizeZipPath(
    filePath
) {

    return String(
        filePath
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

        );

}


// ============================================================
// SANITIZAR
// ============================================================

function sanitizeFileName(
    name
) {

    return String(
        name
    )

        .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
        );

}


// ============================================================
// REINTENTOS
// ============================================================

async function retryOperation(

    operation,

    label,

    maxRetries = MAX_RETRIES

) {

    let lastError =
        null;


    for (
        let attempt = 0;
        attempt <= maxRetries;
        attempt++
    ) {

        try {

            if (
                attempt > 0
            ) {

                const delay =
                    RETRY_BASE_DELAY *
                    Math.pow(
                        2,
                        attempt - 1
                    );


                console.log(

                    `[RETRY] ${label} ` +

                    `→ intento ${attempt + 1}/${maxRetries + 1} ` +

                    `en ${delay}ms`

                );


                await sleep(
                    delay
                );

            }


            const result =
                await operation();


            if (
                attempt > 0
            ) {

                console.log(

                    `[RETRY] ${label} ` +

                    `→ recuperado correctamente ` +

                    `en intento ${attempt + 1}`

                );

            }


            return result;


        } catch (error) {

            lastError =
                error;


            console.warn(

                `[RETRY] ${label} ` +

                `→ fallo en intento ${attempt + 1}/${maxRetries + 1}: ` +

                `${error.message}`

            );


            if (
                attempt >= maxRetries
            ) {

                break;

            }

        }

    }


    throw new Error(

        `${label} falló después de ` +

        `${maxRetries + 1} intentos.\n\n` +

        `${lastError?.message ||

            'Error desconocido.'}`

    );

}


// ============================================================
// PROGRESO
// ============================================================

async function updateProgress(

    interaction,

    percent,

    status

) {

    const safePercent =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    percent
                )
            )
        );


    const filled =
        Math.round(
            safePercent / 5
        );


    const empty =
        20 -
        filled;


    const bar =
        '█'.repeat(
            filled
        ) +

        '░'.repeat(
            empty
        );


    const content =

        `## 📦 PortPack\n\n` +

        `**${safePercent}%**\n` +

        `\`${bar}\`\n\n` +

        `${status}`;


    return safeEditReply(
        interaction,
        content
    );

}


// ============================================================
// JSON COPIABLE
// ============================================================

async function sendCopyableJson(

    interaction,

    json

) {

    const singleMessage =

        '```json\n' +

        json +

        '\n```';


    if (
        singleMessage.length <= 2000
    ) {

        await safeEditReply(

            interaction,

            singleMessage

        );


        return;

    }


    await safeEditReply(

        interaction,

        '⚠️ El JSON supera el límite de un solo mensaje de Discord. Se enviará dividido en partes.'

    );


    const chunks =
        splitText(
            json,
            1800
        );


    for (
        let i = 0;
        i < chunks.length;
        i++
    ) {

        const content =

            '```json\n' +

            chunks[i] +

            '\n```';


        try {

            await interaction.followUp({

                content

            });

        } catch (error) {

            console.error(

                '[DISCORD] Error enviando parte JSON:',

                error.message

            );

            break;

        }

    }

}


// ============================================================
// SPLIT TEXT
// ============================================================

function splitText(

    text,

    maxLength

) {

    const chunks = [];


    for (
        let i = 0;
        i < text.length;
        i += maxLength
    ) {

        chunks.push(

            text.slice(

                i,

                i + maxLength

            )

        );

    }


    return chunks;

}


// ============================================================
// SAFE EDIT REPLY
// ============================================================

async function safeEditReply(

    interaction,

    content,

    files = undefined

) {

    try {

        if (
            !interaction.deferred &&
            !interaction.replied
        ) {

            console.warn(
                '[DISCORD] Interaction no reconocida.'
            );

            return false;

        }


        const payload = {

            content

        };


        if (
            files !== undefined
        ) {

            payload.files =
                files;

        }


        await interaction.editReply(
            payload
        );


        return true;


    } catch (error) {

        if (
            error?.code === 10062
        ) {

            console.error(
                '[DISCORD] Unknown interaction en editReply().'
            );

        } else {

            console.error(

                '[DISCORD] Error editReply():',

                error.message

            );

        }


        return false;

    }

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