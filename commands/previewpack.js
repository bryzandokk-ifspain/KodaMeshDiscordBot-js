const {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    AttachmentBuilder,
    EmbedBuilder
} = require('discord.js');

const axios = require('axios');
const sharp = require('sharp');
const crypto = require('crypto');
const fzstd = require('fzstd');


// ============================================================
// CONFIGURACIÓN
// ============================================================

const PREVIEW_WIDTH = 1400;

const COLUMNS = 5;

const CARD_WIDTH = 250;
const CARD_HEIGHT = 165;

const GAP = 12;


// ============================================================
// TEXTURAS
//
// IMPORTANTE:
// Cada textura tiene sus propias claves.
//
// NO se asignan por posición.
// ============================================================

const TEXTURE_ITEMS = [

    {
        name: 'Clay Red',
        aliases: [
            'ClayRed',
            'ClayRedTexture'
        ]
    },

    {
        name: 'Clay Blue',
        aliases: [
            'ClayBlue',
            'ClayBlueTexture'
        ]
    },

    {
        name: 'Clay Green',
        aliases: [
            'ClayGreen',
            'ClayGreenTexture'
        ]
    },

    {
        name: 'Clay Yellow',
        aliases: [
            'ClayYellow',
            'ClayYellowTexture'
        ]
    },


    {
        name: 'Wooden Sword',
        aliases: [
            'WoodenSwordTexture',
            'WoodSwordTexture',
            'WoodenSword'
        ]
    },

    {
        name: 'Iron Sword',
        aliases: [
            'IronSwordTexture',
            'IronSword'
        ]
    },

    {
        name: 'Gold Sword',
        aliases: [
            'GoldSwordTexture',
            'GoldenSwordTexture',
            'GoldSword'
        ]
    },

    {
        name: 'Diamond Sword',
        aliases: [
            'DiamondSwordTexture',
            'DiamondSword'
        ]
    },


    {
        name: 'Wooden Pickaxe',
        aliases: [
            'WoodenPicaxeTexture',
            'WoodenPickaxeTexture',
            'WoodPicaxeTexture',
            'WoodPickaxeTexture',
            'WoodenPicaxe',
            'WoodenPickaxe'
        ]
    },

    {
        name: 'Iron Pickaxe',
        aliases: [
            'IronPicaxeTexture',
            'IronPickaxeTexture',
            'IronPicaxe',
            'IronPickaxe'
        ]
    },

    {
        name: 'Gold Pickaxe',
        aliases: [
            'GoldPicaxeTexture',
            'GoldPickaxeTexture',
            'GoldenPickaxeTexture',
            'GoldPicaxe',
            'GoldPickaxe'
        ]
    },

    {
        name: 'Diamond Pickaxe',
        aliases: [
            'DiamondPicaxeTexture',
            'DiamondPickaxeTexture',
            'DiamondPicaxe',
            'DiamondPickaxe'
        ]
    },


    {
        name: 'Bow 0',
        aliases: [
            'Bow0Texture',
            'Bow0',
            'BowTexture0'
        ]
    },

    {
        name: 'Bow 1',
        aliases: [
            'Bow1Texture',
            'Bow1',
            'BowTexture1'
        ]
    },

    {
        name: 'Bow 2',
        aliases: [
            'Bow2Texture',
            'Bow2',
            'BowTexture2'
        ]
    },

    {
        name: 'Bow 3',
        aliases: [
            'Bow3Texture',
            'Bow3',
            'BowTexture3'
        ]
    },


    {
        name: 'Gold Apple',
        aliases: [
            'GoldAppleTexture',
            'GoldenAppleTexture',
            'GoldApple',
            'GoldenApple'
        ]
    },


    {
        name: 'Iron',
        aliases: [
            'IronTexture',
            'Iron'
        ]
    },

    {
        name: 'Diamond',
        aliases: [
            'DiamondTexture',
            'Diamond'
        ]
    },

    {
        name: 'Emerald',
        aliases: [
            'EmeraldTexture',
            'Emerald'
        ]
    },

    {
        name: 'Pearl',
        aliases: [
            'PearlTexture',
            'Pearl'
        ]
    }

];


// ============================================================
// OBJETOS / VPIMAGES
//
// Aquí tampoco usamos posiciones.
// Cada objeto tiene sus propias claves.
// ============================================================

const OBJECT_ITEMS = [

    {
        name: 'Wooden Sword',

        vpAliases: [
            'WoodenSwordVPImage',
            'WoodSwordVPImage'
        ],

        meshAliases: [
            'WoodenSwordMesh',
            'WoodSwordMesh',
            'WoodenSwordMeshId'
        ]
    },


    {
        name: 'Iron Sword',

        vpAliases: [
            'SwordVPImage',
            'IronSwordVPImage'
        ],

        meshAliases: [
            'SwordMesh',
            'IronSwordMesh',
            'SwordMeshId',
            'IronSwordMeshId'
        ]
    },


    {
        name: 'Gold Sword',

        vpAliases: [
            'GoldSwordVPImage',
            'GoldenSwordVPImage'
        ],

        meshAliases: [
            'GoldSwordMesh',
            'GoldenSwordMesh',
            'GoldSwordMeshId'
        ]
    },


    {
        name: 'Diamond Sword',

        vpAliases: [
            'DiamondSwordVPImage'
        ],

        meshAliases: [
            'DiamondSwordMesh',
            'DiamondSwordMeshId'
        ]
    },


    {
        name: 'Wooden Pickaxe',

        vpAliases: [
            'WoodenPickaxeVPImage',
            'WoodenPicaxeVPImage',
            'WoodPickaxeVPImage'
        ],

        meshAliases: [
            'WoodenPickaxeMesh',
            'WoodenPicaxeMesh',
            'WoodPickaxeMesh'
        ]
    },


    {
        name: 'Iron Pickaxe',

        vpAliases: [
            'PickaxeVPImage',
            'IronPickaxeVPImage',
            'IronPicaxeVPImage'
        ],

        meshAliases: [
            'PickaxeMesh',
            'IronPickaxeMesh',
            'IronPicaxeMesh'
        ]
    },


    {
        name: 'Gold Pickaxe',

        vpAliases: [
            'GoldPickaxeVPImage',
            'GoldPicaxeVPImage'
        ],

        meshAliases: [
            'GoldPickaxeMesh',
            'GoldPicaxeMesh'
        ]
    },


    {
        name: 'Diamond Pickaxe',

        vpAliases: [
            'DiamondPickaxeVPImage',
            'DiamondPicaxeVPImage'
        ],

        meshAliases: [
            'DiamondPickaxeMesh',
            'DiamondPicaxeMesh'
        ]
    },


    {
        name: 'Bow 0',

        vpAliases: [
            'Bow0VPImage',
            'DefaultBowVPImage'
        ],

        meshAliases: [
            'Bow0Mesh',
            'DefaultBowMesh'
        ]
    },


    {
        name: 'Bow 1',

        vpAliases: [
            'Bow1VPImage'
        ],

        meshAliases: [
            'Bow1Mesh'
        ]
    },


    {
        name: 'Bow 2',

        vpAliases: [
            'Bow2VPImage'
        ],

        meshAliases: [
            'Bow2Mesh'
        ]
    },


    {
        name: 'Bow 3',

        vpAliases: [
            'Bow3VPImage'
        ],

        meshAliases: [
            'Bow3Mesh'
        ]
    },


    {
        name: 'Gold Apple',

        vpAliases: [
            'GoldAppleVPImage',
            'GoldenAppleVPImage'
        ],

        meshAliases: [
            'GoldAppleMesh',
            'GoldenAppleMesh'
        ]
    },


    {
        name: 'Iron',

        vpAliases: [
            'IronVPImage'
        ],

        meshAliases: [
            'IronMesh'
        ]
    },


    {
        name: 'Diamond',

        vpAliases: [
            'DiamondVPImage'
        ],

        meshAliases: [
            'DiamondMesh'
        ]
    },


    {
        name: 'Emerald',

        vpAliases: [
            'EmeraldVPImage'
        ],

        meshAliases: [
            'EmeraldMesh'
        ]
    }

];


// ============================================================
// COMANDO
// ============================================================

module.exports = {

    data: new SlashCommandBuilder()

        .setName('previewpack')

        .setDescription(
            'Genera una preview visual de un Texture Pack de Bridge Duels.'
        ),


    // ========================================================
    // ABRIR MODAL
    // ========================================================

    async execute(interaction) {

        const modal =
            new ModalBuilder()
                .setCustomId(
                    'previewpack_modal'
                )
                .setTitle(
                    'Bridge Duels • Preview Pack'
                );


        const jsonInput =
            new TextInputBuilder()

                .setCustomId(
                    'previewpack_json'
                )

                .setLabel(
                    'Pega aquí el JSON del Texture Pack'
                )

                .setStyle(
                    TextInputStyle.Paragraph
                )

                .setPlaceholder(
                    '{"m":null,"t":"buffer","zbase64":"KLUv..."}'
                )

                .setRequired(true)

                .setMaxLength(4000);


        const row =
            new ActionRowBuilder()
                .addComponents(
                    jsonInput
                );


        modal.addComponents(
            row
        );


        await interaction.showModal(
            modal
        );
    },


    // ========================================================
    // PROCESAR MODAL
    // ========================================================

    async handleModal(interaction) {

        await interaction.deferReply();


        try {

            // ==================================================
            // OBTENER JSON
            // ==================================================

            const rawJson =
                interaction.fields
                    .getTextInputValue(
                        'previewpack_json'
                    )
                    .trim();


            console.log(
                '[PREVIEWPACK] JSON recibido.'
            );


            // ==================================================
            // PARSEAR JSON
            // ==================================================

            let pack;

            try {

                pack =
                    JSON.parse(
                        rawJson
                    );

            } catch (error) {

                return interaction.editReply({

                    content:
                        '❌ **El JSON no es válido.**\n\n' +
                        'Asegúrate de copiar el Texture Pack completo.'

                });
            }


            // ==================================================
            // VALIDAR
            // ==================================================

            if (
                !pack ||
                typeof pack !== 'object' ||
                typeof pack.zbase64 !== 'string'
            ) {

                return interaction.editReply({

                    content:
                        '❌ **Este JSON no parece ser un Texture Pack válido de Bridge Duels.**\n\n' +
                        'No encontré una propiedad `zbase64` válida.'

                });
            }


            // ==================================================
            // BASE64
            // ==================================================

            let compressed;

            try {

                compressed =
                    Buffer.from(
                        pack.zbase64,
                        'base64'
                    );

            } catch (error) {

                return interaction.editReply({

                    content:
                        '❌ No pude decodificar el `zbase64`.'

                });
            }


            if (
                !compressed ||
                !compressed.length
            ) {

                return interaction.editReply({

                    content:
                        '❌ El `zbase64` está vacío.'

                });
            }


            console.log(
                `[PREVIEWPACK] Comprimido: ${compressed.length} bytes`
            );


            // ==================================================
            // ZSTANDARD
            // ==================================================

            let decompressed;

            try {

                decompressed =
                    Buffer.from(
                        fzstd.decompress(
                            compressed
                        )
                    );

            } catch (error) {

                console.error(
                    '[PREVIEWPACK] Error ZSTD:',
                    error
                );


                return interaction.editReply({

                    content:
                        '❌ **No pude descomprimir el Texture Pack.**\n\n' +
                        'Comprueba que el JSON pertenece a Bridge Duels.'

                });
            }


            console.log(
                `[PREVIEWPACK] Descomprimido: ${decompressed.length} bytes`
            );


            // ==================================================
            // JSON INTERNO
            // ==================================================

            let textureData;

            try {

                textureData =
                    JSON.parse(
                        decompressed.toString(
                            'utf8'
                        )
                    );

            } catch (error) {

                console.error(
                    '[PREVIEWPACK] Error JSON interno:',
                    error
                );


                return interaction.editReply({

                    content:
                        '❌ El contenido comprimido no contiene un JSON válido.'

                });
            }


            console.log(
                '[PREVIEWPACK] JSON interno leído correctamente.'
            );


            // ==================================================
            // PACK ID
            // ==================================================

            const packId =
                crypto
                    .createHash(
                        'sha256'
                    )
                    .update(
                        rawJson
                    )
                    .digest(
                        'hex'
                    )
                    .substring(
                        0,
                        12
                    )
                    .toUpperCase();


            // ==================================================
            // EXTRAER TEXTURAS POR NOMBRE
            // ==================================================

            console.log(
                '[PREVIEWPACK] Buscando texturas por nombre...'
            );


            const textures =
                [];


            for (
                const definition
                of TEXTURE_ITEMS
            ) {

                const found =
                    findValueByAliases(
                        textureData,
                        definition.aliases
                    );


                const id =
                    normalizeAssetId(
                        found
                    );


                textures.push({

                    name:
                        definition.name,

                    id,

                    imageBuffer:
                        null

                });


                console.log(

                    `[PREVIEWPACK] ${definition.name}: ` +

                    `${id || 'NO ENCONTRADO'}`

                );
            }


            // ==================================================
            // EXTRAER OBJETOS
            // ==================================================

            console.log(
                '[PREVIEWPACK] Buscando objetos por nombre...'
            );


            const objects =
                [];


            for (
                const definition
                of OBJECT_ITEMS
            ) {

                const vpValue =
                    findValueByAliases(
                        textureData,
                        definition.vpAliases
                    );


                const meshValue =
                    findValueByAliases(
                        textureData,
                        definition.meshAliases
                    );


                const vpImageId =
                    normalizeAssetId(
                        vpValue
                    );


                const meshId =
                    normalizeAssetId(
                        meshValue
                    );


                objects.push({

                    name:
                        definition.name,

                    vpImageId,

                    meshId,

                    imageBuffer:
                        null

                });


                console.log(

                    `[PREVIEWPACK] ${definition.name}: ` +

                    `VP=${vpImageId || 'N/A'} ` +

                    `MESH=${meshId || 'N/A'}`

                );
            }


            // ==================================================
            // DESCARGAR TEXTURAS
            //
            // IMPORTANTE:
            //
            // Cada resultado se guarda dentro del mismo objeto
            // que contiene name + id.
            //
            // Nunca usamos push() dependiendo del orden en
            // que terminen las descargas.
            // ==================================================

            console.log(
                '[PREVIEWPACK] Descargando imágenes de texturas...'
            );


            await Promise.all(

                textures.map(
                    async texture => {

                        if (
                            !texture.id
                        ) {

                            return;
                        }


                        console.log(

                            `[PREVIEWPACK] Descargando ${texture.name} ` +

                            `(${texture.id})...`

                        );


                        try {

                            texture.imageBuffer =
                                await downloadRobloxImage(
                                    texture.id
                                );


                            if (
                                texture.imageBuffer
                            ) {

                                console.log(

                                    `[PREVIEWPACK] ✅ ${texture.name} ` +

                                    `(${texture.id})`

                                );

                            } else {

                                console.log(

                                    `[PREVIEWPACK] ❌ ${texture.name} ` +

                                    `(${texture.id})`

                                );
                            }

                        } catch (error) {

                            console.log(

                                `[PREVIEWPACK] ❌ Error en ${texture.name}:`,

                                error.message

                            );

                            texture.imageBuffer =
                                null;
                        }
                    }
                )
            );


            // ==================================================
            // DESCARGAR VPIMAGES DE OBJETOS
            // ==================================================

            console.log(
                '[PREVIEWPACK] Descargando imágenes de objetos...'
            );


            await Promise.all(

                objects.map(
                    async object => {

                        let imageBuffer =
                            null;


                        // --------------------------------------
                        // PRIMERO VPIMAGE
                        // --------------------------------------

                        if (
                            object.vpImageId
                        ) {

                            console.log(

                                `[PREVIEWPACK] VPImage ${object.name}: ` +

                                `${object.vpImageId}`

                            );


                            try {

                                imageBuffer =
                                    await downloadRobloxImage(
                                        object.vpImageId
                                    );

                            } catch (error) {

                                console.log(

                                    `[PREVIEWPACK] VPImage falló ${object.name}:`,

                                    error.message

                                );
                            }
                        }


                        // --------------------------------------
                        // SI NO FUNCIONA, MESH
                        // --------------------------------------

                        if (
                            !imageBuffer &&
                            object.meshId
                        ) {

                            console.log(

                                `[PREVIEWPACK] Intentando Mesh ` +

                                `${object.name}: ${object.meshId}`

                            );


                            try {

                                imageBuffer =
                                    await downloadRobloxImage(
                                        object.meshId
                                    );

                            } catch (error) {

                                console.log(

                                    `[PREVIEWPACK] Mesh falló ${object.name}:`,

                                    error.message

                                );
                            }
                        }


                        object.imageBuffer =
                            imageBuffer;
                    }
                )
            );


            // ==================================================
            // GENERAR PREVIEW
            // ==================================================

            console.log(
                '[PREVIEWPACK] Generando preview...'
            );


            const preview =
                await createPreviewImage(
                    textures,
                    objects,
                    packId
                );


            // ==================================================
            // ATTACHMENT
            // ==================================================

            const attachmentName =
                `previewpack-${packId}.png`;


            const attachment =
                new AttachmentBuilder(
                    preview,
                    {
                        name:
                            attachmentName
                    }
                );


            // ==================================================
            // ESTADÍSTICAS
            // ==================================================

            const textureCount =
                textures.length;


            const objectCount =
                objects.length;


            const loadedTextures =
                textures.filter(
                    item =>
                        Boolean(
                            item.imageBuffer
                        )
                ).length;


            const loadedObjects =
                objects.filter(
                    item =>
                        Boolean(
                            item.imageBuffer
                        )
                ).length;


            // ==================================================
            // EMBED
            // ==================================================

            const embed =
                new EmbedBuilder()

                    .setColor(
                        0x4D8DFF
                    )

                    .setTitle(
                        '🖼️ Bridge Duels • Texture Pack Preview'
                    )

                    .setDescription(
                        'Preview generada automáticamente desde el JSON de Bridge Duels.'
                    )

                    .addFields(

                        {
                            name:
                                '📦 Pack ID',

                            value:
                                `\`${packId}\``,

                            inline:
                                true
                        },

                        {
                            name:
                                '🎨 Texturas',

                            value:
                                `${loadedTextures}/${textureCount}`,

                            inline:
                                true
                        },

                        {
                            name:
                                '🧱 Objetos',

                            value:
                                `${loadedObjects}/${objectCount}`,

                            inline:
                                true
                        }

                    )

                    .setImage(
                        `attachment://${attachmentName}`
                    );


            // ==================================================
            // ENVIAR
            // ==================================================

            await interaction.editReply({

                embeds: [
                    embed
                ],

                files: [
                    attachment
                ]

            });


            console.log(
                '[PREVIEWPACK] ✅ Preview enviada correctamente.'
            );


        } catch (error) {

            console.error(
                '================================================'
            );

            console.error(
                '[PREVIEWPACK] ERROR'
            );

            console.error(
                '================================================'
            );

            console.error(
                error
            );

            console.error(
                '================================================'
            );


            try {

                await interaction.editReply({

                    content:
                        `❌ **Ocurrió un error generando la preview.**\n\n` +
                        `\`${error.message}\``

                });

            } catch (replyError) {

                console.error(
                    '[PREVIEWPACK] No se pudo enviar el error:',
                    replyError.message
                );
            }
        }
    }
};


// ============================================================
// NORMALIZAR ID
// ============================================================

function normalizeAssetId(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;
    }


    if (
        typeof value === 'number'
    ) {

        if (
            Number.isSafeInteger(value)
        ) {

            return String(value);
        }

        return null;
    }


    if (
        typeof value === 'string'
    ) {

        const match =
            value.match(
                /\d{8,18}/
            );


        if (
            match
        ) {

            return match[0];
        }
    }


    return null;
}


// ============================================================
// BUSCAR UNA CLAVE EXACTA POR ALIAS
// ============================================================

function findValueByAliases(
    object,
    aliases
) {

    if (
        !object ||
        typeof object !== 'object'
    ) {

        return null;
    }


    const wanted =
        new Set(
            aliases.map(
                normalizeKey
            )
        );


    let result =
        null;


    function walk(
        value
    ) {

        if (
            result !== null
        ) {

            return;
        }


        if (
            !value ||
            typeof value !== 'object'
        ) {

            return;
        }


        if (
            Array.isArray(value)
        ) {

            for (
                const item
                of value
            ) {

                walk(
                    item
                );


                if (
                    result !== null
                ) {

                    return;
                }
            }


            return;
        }


        for (
            const [
                key,
                child
            ]
            of Object.entries(
                value
            )
        ) {

            const normalized =
                normalizeKey(
                    key
                );


            if (
                wanted.has(
                    normalized
                )
            ) {

                const id =
                    normalizeAssetId(
                        child
                    );


                if (
                    id
                ) {

                    result =
                        id;

                    return;
                }
            }
        }


        for (
            const child
            of Object.values(
                value
            )
        ) {

            if (
                child &&
                typeof child === 'object'
            ) {

                walk(
                    child
                );


                if (
                    result !== null
                ) {

                    return;
                }
            }
        }
    }


    walk(
        object
    );


    return result;
}


// ============================================================
// NORMALIZAR NOMBRE DE CLAVE
//
// Permite que:
//
// WoodenSwordTexture
//
// y:
//
// wooden_sword_texture
//
// sean comparables.
// ============================================================

function normalizeKey(
    key
) {

    return String(
        key
            ?? ''
    )
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ''
        );
}


// ============================================================
// DESCARGAR IMAGEN DE ROBLOX
// ============================================================

async function downloadRobloxImage(
    assetId
) {

    if (
        !assetId ||
        !/^\d+$/.test(
            String(assetId)
        )
    ) {

        return null;
    }


    const id =
        String(
            assetId
        );


    const maxAttempts =
        5;


    // ========================================================
    // THUMBNAILS API
    // ========================================================

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        try {

            console.log(

                `[PREVIEWPACK] Thumbnail ${id} ` +

                `- intento ${attempt}/${maxAttempts}`

            );


            const response =
                await axios.get(

                    'https://thumbnails.roblox.com/v1/assets',

                    {

                        params: {

                            assetIds:
                                id,

                            returnPolicy:
                                'PlaceHolder',

                            size:
                                '420x420',

                            format:
                                'Png',

                            isCircular:
                                false

                        },

                        timeout:
                            15000,

                        headers: {

                            'User-Agent':
                                'RobloxImageBot/1.0',

                            'Accept':
                                'application/json'

                        }
                    }
                );


            const result =
                response
                    .data
                    ?.data
                    ?.[0];


            if (
                result
            ) {

                console.log(

                    `[PREVIEWPACK] ${id}: ` +

                    `state=${result.state}`

                );


                if (
                    result.state ===
                        'Completed' &&
                    result.imageUrl
                ) {

                    try {

                        const imageResponse =
                            await axios.get(

                                result.imageUrl,

                                {

                                    responseType:
                                        'arraybuffer',

                                    timeout:
                                        15000,

                                    headers: {

                                        'User-Agent':
                                            'RobloxImageBot/1.0'

                                    }
                                }
                            );


                        const buffer =
                            Buffer.from(
                                imageResponse.data
                            );


                        if (
                            await isValidImage(
                                buffer
                            )
                        ) {

                            return buffer;
                        }

                    } catch (error) {

                        console.log(

                            `[PREVIEWPACK] Error descargando thumbnail ${id}:`,

                            error.message

                        );
                    }
                }
            }


        } catch (error) {

            console.log(

                `[PREVIEWPACK] Thumbnail API ${id}:`,

                error.response?.status ||
                error.message

            );
        }


        // ====================================================
        // ESPERAR
        // ====================================================

        if (
            attempt <
            maxAttempts
        ) {

            await sleep(
                1200
            );
        }
    }


    // ========================================================
    // FALLBACK ROBLOX ASSET THUMBNAIL
    // ========================================================

    try {

        console.log(

            `[PREVIEWPACK] ${id}: intentando fallback...`

        );


        const url =
            `https://www.roblox.com/asset-thumbnail/image` +

            `?assetId=${id}` +

            `&width=420` +

            `&height=420` +

            `&format=png`;


        const response =
            await axios.get(

                url,

                {

                    responseType:
                        'arraybuffer',

                    timeout:
                        15000,

                    headers: {

                        'User-Agent':
                            'Mozilla/5.0',

                        'Accept':
                            'image/png,image/*'

                    }
                }
            );


        const buffer =
            Buffer.from(
                response.data
            );


        if (
            await isValidImage(
                buffer
            )
        ) {

            console.log(

                `[PREVIEWPACK] ${id}: ✅ fallback correcto`

            );


            return buffer;
        }


    } catch (error) {

        console.log(

            `[PREVIEWPACK] Fallback ${id}:`,

            error.response?.status ||
            error.message

        );
    }


    // ========================================================
    // ASSET DELIVERY
    // ========================================================

    try {

        console.log(

            `[PREVIEWPACK] ${id}: intentando Asset Delivery...`

        );


        const response =
            await axios.get(

                `https://assetdelivery.roblox.com/v2/assetId/${id}`,

                {

                    responseType:
                        'arraybuffer',

                    timeout:
                        15000,

                    maxRedirects:
                        5

                }
            );


        const buffer =
            Buffer.from(
                response.data
            );


        if (
            await isValidImage(
                buffer
            )
        ) {

            console.log(

                `[PREVIEWPACK] ${id}: ✅ Asset Delivery correcto`

            );


            return buffer;
        }


    } catch (error) {

        console.log(

            `[PREVIEWPACK] Asset Delivery ${id}:`,

            error.response?.status ||
            error.message

        );
    }


    console.log(

        `[PREVIEWPACK] ❌ No se pudo obtener ${id}`

    );


    return null;
}


// ============================================================
// COMPROBAR SI BUFFER ES IMAGEN
// ============================================================

async function isValidImage(
    buffer
) {

    try {

        const metadata =
            await sharp(
                buffer
            )
                .metadata();


        return Boolean(

            metadata &&

            metadata.width &&

            metadata.height &&

            metadata.format

        );

    } catch {

        return false;
    }
}


// ============================================================
// ESPERAR
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


// ============================================================
// CREAR PREVIEW
// ============================================================

async function createPreviewImage(
    textures,
    objects,
    packId
) {

    // ========================================================
    // DIMENSIONES
    // ========================================================

    const WIDTH =
        PREVIEW_WIDTH;


    const HEADER_HEIGHT =
        105;


    const SECTION_TITLE_HEIGHT =
        48;


    const SECTION_PADDING =
        10;


    const SECTION_GAP =
        25;


    const FOOTER_HEIGHT =
        65;


    // ========================================================
    // CALCULAR ALTURA DE SECCIÓN
    // ========================================================

    function calculateSectionHeight(
        itemCount
    ) {

        const rows =
            Math.max(

                1,

                Math.ceil(
                    itemCount /
                    COLUMNS
                )

            );


        return (

            SECTION_TITLE_HEIGHT +

            SECTION_PADDING +

            rows *
                (
                    CARD_HEIGHT +
                    GAP
                ) +

            SECTION_PADDING

        );
    }


    const textureSectionHeight =
        calculateSectionHeight(
            textures.length
        );


    const objectSectionHeight =
        calculateSectionHeight(
            objects.length
        );


    const texturesY =
        HEADER_HEIGHT;


    const objectsY =
        texturesY +
        textureSectionHeight +
        SECTION_GAP;


    const footerY =
        objectsY +
        objectSectionHeight +
        SECTION_GAP;


    const HEIGHT =
        footerY +
        FOOTER_HEIGHT;


    // ========================================================
    // SVG PRINCIPAL
    // ========================================================

    let svg = `

<svg
    xmlns="http://www.w3.org/2000/svg"

    width="${WIDTH}"

    height="${HEIGHT}"

    viewBox="0 0 ${WIDTH} ${HEIGHT}"
>

    <!-- FONDO -->

    <rect
        x="0"
        y="0"
        width="${WIDTH}"
        height="${HEIGHT}"
        fill="#071223"
    />


    <!-- ================================================== -->
    <!-- HEADER -->
    <!-- ================================================== -->

    <text
        x="30"
        y="55"

        font-family="Arial, Helvetica, sans-serif"

        font-size="43"

        font-weight="700"

        fill="#F5F7FB"
    >Bridge</text>


    <text
        x="160"
        y="55"

        font-family="Arial, Helvetica, sans-serif"

        font-size="43"

        font-weight="700"

        fill="#66A5FF"
    >Duels</text>


    <text
        x="30"
        y="91"

        font-family="Arial, Helvetica, sans-serif"

        font-size="22"

        fill="#92A5BF"
    >Texture Pack Preview</text>


    <!-- PACK ID -->

    <text
        x="${WIDTH - 30}"
        y="42"

        text-anchor="end"

        font-family="Arial, Helvetica, sans-serif"

        font-size="14"

        fill="#92A5BF"
    >Pack ID: ${escapeXml(packId)}</text>


    <!-- ================================================== -->
    <!-- TEXTURES -->
    <!-- ================================================== -->

    ${createSectionSvg(
        'Textures',
        textures,
        texturesY,
        textureSectionHeight
    )}


    <!-- ================================================== -->
    <!-- OBJECTS -->
    <!-- ================================================== -->

    ${createSectionSvg(
        'Objects / VPImages',
        objects,
        objectsY,
        objectSectionHeight
    )}


    <!-- ================================================== -->
    <!-- FOOTER -->
    <!-- ================================================== -->

    <rect
        x="0"
        y="${footerY}"
        width="${WIDTH}"
        height="${FOOTER_HEIGHT}"

        fill="#081426"
    />


    <rect
        x="0"
        y="${footerY}"

        width="${WIDTH}"
        height="2"

        fill="#5B9CFF"
    />


    <text
        x="30"
        y="${footerY + 39}"

        font-family="Arial, Helvetica, sans-serif"

        font-size="14"

        fill="#879BB5"
    >PreviewPack • Bridge Duels</text>


    <text
        x="${WIDTH - 30}"
        y="${footerY + 39}"

        text-anchor="end"

        font-family="Arial, Helvetica, sans-serif"

        font-size="14"

        fill="#879BB5"
    >Textures: ${textures.length} • Objects: ${objects.length}</text>

</svg>

`;


    // ========================================================
    // CREAR COMPOSITE
    //
    // Las imágenes se insertan después del SVG para que
    // Sharp pueda manejar correctamente los PNG.
    // ========================================================

    const composites = [

        {
            input:
                Buffer.from(
                    svg
                ),

            left:
                0,

            top:
                0
        }

    ];


    // ========================================================
    // AÑADIR IMÁGENES
    // ========================================================

    await addImageComposites(
        composites,
        textures,
        texturesY,
        textureSectionHeight
    );


    await addImageComposites(
        composites,
        objects,
        objectsY,
        objectSectionHeight
    );


    // ========================================================
    // RENDER FINAL
    // ========================================================

    return await sharp({

        create: {

            width:
                WIDTH,

            height:
                HEIGHT,

            channels:
                4,

            background: {

                r:
                    7,

                g:
                    18,

                b:
                    35,

                alpha:
                    1

            }

        }

    })

        .composite(
            composites
        )

        .png()

        .toBuffer();
}


// ============================================================
// CREAR SECCIÓN SVG
// ============================================================

function createSectionSvg(
    title,
    items,
    startY,
    sectionHeight
) {

    const sectionX =
        30;


    const sectionWidth =
        PREVIEW_WIDTH -
        60;


    const innerX =
        sectionX +
        10;


    const innerY =
        startY +
        48;


    const totalCardsWidth =
        COLUMNS *
            CARD_WIDTH +

        (
            COLUMNS -
            1
        ) *
            GAP;


    const leftOffset =
        Math.max(

            0,

            (
                sectionWidth -
                totalCardsWidth
            ) / 2

        );


    let result = `

        <rect

            x="${sectionX}"

            y="${startY}"

            width="${sectionWidth}"

            height="${sectionHeight}"

            rx="18"

            fill="#0F1D31"

            stroke="#34577E"

            stroke-width="2"

        />


        <text

            x="${sectionX + 20}"

            y="${startY + 34}"

            font-family="Arial, Helvetica, sans-serif"

            font-size="21"

            font-weight="700"

            fill="#F3F6FB"

        >${escapeXml(title)}</text>

    `;


    // ========================================================
    // CARDS
    // ========================================================

    for (
        let i = 0;
        i < items.length;
        i++
    ) {

        const column =
            i %
            COLUMNS;


        const row =
            Math.floor(
                i /
                COLUMNS
            );


        const x =
            innerX +
            leftOffset +

            column *
                (
                    CARD_WIDTH +
                    GAP
                );


        const y =
            innerY +

            row *
                (
                    CARD_HEIGHT +
                    GAP
                );


        result +=
            createCardSvg(
                items[i],
                x,
                y
            );
    }


    return result;
}


// ============================================================
// CREAR CARD SVG
// ============================================================

function createCardSvg(
    item,
    x,
    y
) {

    const imageBoxSize =
        120;


    const imageX =
        x +
        Math.round(
            (
                CARD_WIDTH -
                imageBoxSize
            ) / 2
        );


    const imageY =
        y +
        10;


    let imagePlaceholder = `

        <rect

            x="${imageX}"

            y="${imageY}"

            width="${imageBoxSize}"

            height="${imageBoxSize}"

            rx="7"

            fill="#0B1629"

        />


        <text

            x="${imageX + imageBoxSize / 2}"

            y="${imageY + 76}"

            text-anchor="middle"

            font-size="34"

            font-family="Arial, Helvetica, sans-serif"

            fill="#6E809D"

        >?</text>

    `;


    // ========================================================
    // NOMBRE
    // ========================================================

    const name =
        escapeXml(
            item.name
        );


    let details =
        '';


    // ========================================================
    // TEXTURA
    // ========================================================

    if (
        item.id
    ) {

        details += `

            <text

                x="${x + 10}"

                y="${y + 145}"

                font-size="10"

                font-family="Arial, Helvetica, sans-serif"

                fill="#71839F"

            >Texture ID: ${escapeXml(item.id)}</text>

        `;

    } else if (
        item.vpImageId ||
        item.meshId
    ) {

        // -----------------------------------------------
        // OBJETO
        // -----------------------------------------------

        if (
            item.meshId
        ) {

            details += `

                <text

                    x="${x + 10}"

                    y="${y + 137}"

                    font-size="9"

                    font-family="Arial, Helvetica, sans-serif"

                    fill="#71839F"

                >Mesh ID: ${escapeXml(item.meshId)}</text>

            `;
        }


        if (
            item.vpImageId
        ) {

            details += `

                <text

                    x="${x + 10}"

                    y="${y + 151}"

                    font-size="9"

                    font-family="Arial, Helvetica, sans-serif"

                    fill="#71839F"

                >VPImage: ${escapeXml(item.vpImageId)}</text>

            `;
        }

    }


    return `

        <g>

            <rect

                x="${x}"

                y="${y}"

                width="${CARD_WIDTH}"

                height="${CARD_HEIGHT}"

                rx="16"

                fill="#182A43"

                stroke="#34577E"

                stroke-width="2"

            />


            ${imagePlaceholder}


            <text

                x="${x + 10}"

                y="${y + 131}"

                font-size="14"

                font-weight="700"

                font-family="Arial, Helvetica, sans-serif"

                fill="#F2F5FA"

            >${name}</text>


            ${details}

        </g>

    `;
}


// ============================================================
// INSERTAR IMÁGENES EN SUS CARDS
// ============================================================

async function addImageComposites(
    composites,
    items,
    startY,
    sectionHeight
) {

    const sectionX =
        30;


    const sectionWidth =
        PREVIEW_WIDTH -
        60;


    const innerX =
        sectionX +
        10;


    const innerY =
        startY +
        48;


    const totalCardsWidth =
        COLUMNS *
            CARD_WIDTH +

        (
            COLUMNS -
            1
        ) *
            GAP;


    const leftOffset =
        Math.max(

            0,

            (
                sectionWidth -
                totalCardsWidth
            ) / 2

        );


    for (
        let i = 0;
        i < items.length;
        i++
    ) {

        const item =
            items[i];


        if (
            !item.imageBuffer
        ) {

            continue;
        }


        const column =
            i %
            COLUMNS;


        const row =
            Math.floor(
                i /
                COLUMNS
            );


        const x =
            innerX +
            leftOffset +

            column *
                (
                    CARD_WIDTH +
                    GAP
                );


        const y =
            innerY +

            row *
                (
                    CARD_HEIGHT +
                    GAP
                );


        try {

            // ==================================================
            // TAMAÑO DE IMAGEN
            // ==================================================

            const image =
                await sharp(
                    item.imageBuffer
                )

                    .resize(

                        120,

                        120,

                        {

                            fit:
                                'contain',

                            background: {

                                r:
                                    0,

                                g:
                                    0,

                                b:
                                    0,

                                alpha:
                                    0

                            }

                        }

                    )

                    .png()

                    .toBuffer();


            composites.push({

                input:
                    image,

                left:
                    x +
                    Math.round(
                        (
                            CARD_WIDTH -
                            120
                        ) / 2
                    ),

                top:
                    y +
                    10

            });


        } catch (error) {

            console.log(

                `[PREVIEWPACK] No se pudo preparar imagen ${item.name}:`,

                error.message

            );
        }
    }
}


// ============================================================
// ESCAPAR XML
// ============================================================

function escapeXml(
    text
) {

    return String(
        text ??
        ''
    )

        .replace(
            /&/g,
            '&amp;'
        )

        .replace(
            /</g,
            '&lt;'
        )

        .replace(
            />/g,
            '&gt;'
        )

        .replace(
            /"/g,
            '&quot;'
        )

        .replace(
            /'/g,
            '&apos;'
        );
}