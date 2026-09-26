const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const axios = require('axios');
const FormData = require('form-data');
const path = require('path');


// ============================================================
// CONFIGURACIÓN
// ============================================================

const ROBLOX_API_URL =
    'https://apis.roblox.com/assets/v1/assets';

const ROBLOX_OPERATION_URL =
    'https://apis.roblox.com/assets/v1/operations';

const MAX_FILE_SIZE =
    20 * 1024 * 1024; // 20 MB

const ALLOWED_EXTENSIONS = {
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac'
};


// ============================================================
// COMANDO
// ============================================================

module.exports = {

    data: new SlashCommandBuilder()

        .setName('idsound')

        .setDescription(
            'Sube un audio a Roblox y obtiene su Sound ID.'
        )

        .addAttachmentOption(option =>
            option
                .setName('archivo')
                .setDescription(
                    'Archivo de audio (.mp3, .ogg, .wav o .flac)'
                )
                .setRequired(true)
        ),


    // ========================================================
    // EXECUTE
    // ========================================================

    async execute(interaction) {

        let fileName = 'audio';


        try {

            // ==================================================
            // VARIABLES DE ENTORNO
            // ==================================================

            const apiKey =
                process.env.ROBLOX_API_KEY;

            const creatorId =
                process.env.ROBLOX_CREATOR_ID;

            const isGroup =
                String(
                    process.env.ROBLOX_IS_GROUP || 'false'
                ).toLowerCase() === 'true';


            if (!apiKey) {

                throw new Error(
                    'Falta ROBLOX_API_KEY en el archivo .env.'
                );

            }


            if (!creatorId) {

                throw new Error(
                    'Falta ROBLOX_CREATOR_ID en el archivo .env.'
                );

            }


            // ==================================================
            // OBTENER ARCHIVO
            // ==================================================

            const attachment =
                interaction.options.getAttachment(
                    'archivo'
                );


            if (!attachment) {

                throw new Error(
                    'No se recibió ningún archivo de audio.'
                );

            }


            fileName =
                attachment.name ||
                'audio';


            console.log('');
            console.log(
                '============================================================'
            );

            console.log(
                '[IDSOUND] Nueva solicitud.'
            );

            console.log(
                `[IDSOUND] Usuario Discord: ${interaction.user.tag}`
            );

            console.log(
                `[IDSOUND] Archivo: ${fileName}`
            );

            console.log(
                `[IDSOUND] Tamaño: ${formatBytes(attachment.size)}`
            );

            console.log(
                `[IDSOUND] URL: ${attachment.url}`
            );

            console.log(
                '============================================================'
            );


            // ==================================================
            // EXTENSIÓN
            // ==================================================

            const extension =
                path.extname(fileName)
                    .toLowerCase();


            if (!ALLOWED_EXTENSIONS[extension]) {

                throw new Error(
                    'Formato no compatible.\n\n' +
                    'Formatos permitidos: `.mp3`, `.ogg`, `.wav`, `.flac`.\n' +
                    'Roblox no acepta `.aac` ni `.aiff` mediante esta API.'
                );

            }


            // ==================================================
            // TAMAÑO
            // ==================================================

            if (
                attachment.size >
                MAX_FILE_SIZE
            ) {

                throw new Error(
                    `El archivo pesa ${formatBytes(attachment.size)} y supera el límite de 20 MB de Roblox.`
                );

            }


            // ==================================================
            // DESCARGAR ARCHIVO
            // ==================================================

            await interaction.editReply({
                content:
                    '⬇️ **Descargando el audio...**'
            });


            console.log(
                '[IDSOUND] Descargando archivo...'
            );


            const downloadResponse =
                await axios.get(
                    attachment.url,
                    {
                        responseType:
                            'arraybuffer',

                        timeout:
                            60000,

                        maxContentLength:
                            MAX_FILE_SIZE,

                        maxBodyLength:
                            MAX_FILE_SIZE
                    }
                );


            const audioBuffer =
                Buffer.from(
                    downloadResponse.data
                );


            if (
                audioBuffer.length === 0
            ) {

                throw new Error(
                    'El archivo descargado está vacío.'
                );

            }


            if (
                audioBuffer.length >
                MAX_FILE_SIZE
            ) {

                throw new Error(
                    'El archivo descargado supera el límite de 20 MB.'
                );

            }


            // ==================================================
            // NOMBRE DE DISPLAY
            // ==================================================

            let displayName =
                path.basename(
                    fileName,
                    extension
                );


            displayName =
                displayName
                    .replace(
                        /[^a-zA-Z0-9_\- ]/g,
                        ''
                    )
                    .trim();


            if (!displayName) {

                displayName =
                    'Discord Audio';

            }


            // Roblox permite nombres razonables,
            // pero evitamos nombres excesivamente largos.

            displayName =
                displayName.slice(
                    0,
                    100
                );


            // ==================================================
            // CREATOR
            // ==================================================

            const creator = {};


            if (isGroup) {

                creator.groupId =
                    String(creatorId);

            } else {

                creator.userId =
                    String(creatorId);

            }


            // ==================================================
            // FORM DATA
            // ==================================================

            const form =
                new FormData();


            const requestData = {

                assetType:
                    'Audio',

                displayName:
                    displayName,

                description:
                    `Audio subido mediante /idsound - ${fileName}`,

                creationContext: {

                    creator:
                        creator

                }

            };


            form.append(
                'request',
                JSON.stringify(
                    requestData
                ),
                {
                    contentType:
                        'application/json'
                }
            );


            form.append(
                'fileContent',
                audioBuffer,
                {
                    filename:
                        fileName,

                    contentType:
                        ALLOWED_EXTENSIONS[
                            extension
                        ]
                }
            );


            // ==================================================
            // SUBIR A ROBLOX
            // ==================================================

            await interaction.editReply({
                content:
                    '☁️ **Subiendo el audio a Roblox...**'
            });


            console.log(
                '[IDSOUND] Subiendo audio a Roblox...'
            );


            let uploadResponse;


            try {

                uploadResponse =
                    await axios.post(
                        ROBLOX_API_URL,
                        form,
                        {
                            headers: {

                                'x-api-key':
                                    apiKey,

                                ...form.getHeaders()

                            },

                            maxContentLength:
                                MAX_FILE_SIZE,

                            maxBodyLength:
                                MAX_FILE_SIZE,

                            timeout:
                                120000,

                            validateStatus:
                                () => true
                        }
                    );

            } catch (error) {

                throw new Error(
                    `No se pudo conectar con Roblox: ${error.message}`
                );

            }


            // ==================================================
            // COMPROBAR RESPUESTA
            // ==================================================

            if (
                uploadResponse.status < 200 ||
                uploadResponse.status >= 300
            ) {

                const robloxMessage =
                    extractRobloxError(
                        uploadResponse.data
                    );


                console.error(
                    '[IDSOUND] Roblox rechazó la subida:',
                    uploadResponse.status,
                    uploadResponse.data
                );


                throw new Error(
                    `Roblox rechazó la subida (${uploadResponse.status}).\n\n${robloxMessage}`
                );

            }


            const operationData =
                uploadResponse.data;


            console.log(
                '[IDSOUND] Respuesta de subida:',
                operationData
            );


            if (
                !operationData ||
                !operationData.path
            ) {

                throw new Error(
                    'Roblox no devolvió una operación válida.'
                );

            }


            // ==================================================
            // OBTENER OPERATION ID
            // ==================================================

            const operationPath =
                operationData.path;


            const operationId =
                operationPath
                    .split('/')
                    .pop();


            if (!operationId) {

                throw new Error(
                    'No se pudo obtener el ID de la operación de Roblox.'
                );

            }


            console.log(
                `[IDSOUND] Operation ID: ${operationId}`
            );


            // ==================================================
            // ESPERAR PROCESAMIENTO
            // ==================================================

            await interaction.editReply({
                content:
                    '⏳ **Roblox está procesando/moderando el audio...**'
            });


            const operationResult =
                await waitForOperation(
                    operationId,
                    apiKey
                );


            // ==================================================
            // OBTENER ASSET ID
            // ==================================================

            const assetId =
                operationResult
                    ?.response
                    ?.assetId;


            if (!assetId) {

                console.error(
                    '[IDSOUND] Operación final:',
                    operationResult
                );


                throw new Error(
                    'Roblox terminó la operación pero no devolvió un Asset ID.'
                );

            }


            const moderationState =
                operationResult
                    ?.response
                    ?.moderationResult
                    ?.moderationState ||
                'UNKNOWN';


            // ==================================================
            // EMBED FINAL
            // ==================================================

            const embed =
                new EmbedBuilder()

                    .setColor(
                        0x00A2FF
                    )

                    .setTitle(
                        '🔊 Audio subido a Roblox'
                    )

                    .setDescription(
                        'Tu audio fue enviado correctamente a Roblox.'
                    )

                    .addFields(

                        {
                            name:
                                '📁 Archivo',

                            value:
                                `\`${fileName}\``,

                            inline:
                                false
                        },

                        {
                            name:
                                '🆔 Asset ID',

                            value:
                                `\`${assetId}\``,

                            inline:
                                true
                        },

                        {
                            name:
                                '🎵 Sound ID',

                            value:
                                `\`rbxassetid://${assetId}\``,

                            inline:
                                true
                        },

                        {
                            name:
                                '🛡️ Moderación',

                            value:
                                `\`${formatModerationState(moderationState)}\``,

                            inline:
                                false
                        }

                    )

                    .setFooter({
                        text:
                            'Roblox Audio • /idsound'
                    })

                    .setTimestamp();


            await interaction.editReply({

                content:
                    null,

                embeds:
                    [
                        embed
                    ]

            });


            console.log('');
            console.log(
                '============================================================'
            );

            console.log(
                '[IDSOUND] ✅ AUDIO SUBIDO CORRECTAMENTE'
            );

            console.log(
                `[IDSOUND] Archivo: ${fileName}`
            );

            console.log(
                `[IDSOUND] Asset ID: ${assetId}`
            );

            console.log(
                `[IDSOUND] Sound ID: rbxassetid://${assetId}`
            );

            console.log(
                `[IDSOUND] Moderación: ${moderationState}`
            );

            console.log(
                '============================================================'
            );

            console.log('');


        } catch (error) {

            console.error('');
            console.error(
                '============================================================'
            );

            console.error(
                '[IDSOUND] ❌ ERROR'
            );

            console.error(
                `[IDSOUND] Archivo: ${fileName}`
            );

            console.error(
                error
            );

            console.error(
                '============================================================'
            );


            const message =
                error?.message ||
                'Ocurrió un error inesperado.';


            try {

                await interaction.editReply({

                    content:
                        `❌ **No se pudo subir el audio.**\n\n${message.slice(0, 1800)}`,

                    embeds:
                        []

                });

            } catch (replyError) {

                console.error(
                    '[IDSOUND] No se pudo actualizar Discord:',
                    replyError.message
                );

            }

        }

    }

};


// ============================================================
// ESPERAR OPERACIÓN DE ROBLOX
// ============================================================

async function waitForOperation(
    operationId,
    apiKey
) {

    const maxAttempts =
        60;

    const delay =
        3000;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        console.log(
            `[IDSOUND] Comprobando operación... ${attempt}/${maxAttempts}`
        );


        let response;


        try {

            response =
                await axios.get(
                    `${ROBLOX_OPERATION_URL}/${operationId}`,
                    {
                        headers: {

                            'x-api-key':
                                apiKey

                        },

                        timeout:
                            30000,

                        validateStatus:
                            () => true
                    }
                );

        } catch (error) {

            console.error(
                '[IDSOUND] Error consultando operación:',
                error.message
            );


            if (
                attempt === maxAttempts
            ) {

                throw new Error(
                    `No se pudo consultar el procesamiento de Roblox: ${error.message}`
                );

            }


            await sleep(
                delay
            );

            continue;

        }


        if (
            response.status < 200 ||
            response.status >= 300
        ) {

            const robloxMessage =
                extractRobloxError(
                    response.data
                );


            throw new Error(
                `Roblox devolvió ${response.status} al consultar la operación.\n\n${robloxMessage}`
            );

        }


        const operation =
            response.data;


        console.log(
            '[IDSOUND] Estado:',
            JSON.stringify(
                operation
            )
        );


        // ======================================================
        // TODAVÍA PROCESANDO
        // ======================================================

        if (
            !operation.done
        ) {

            await sleep(
                delay
            );

            continue;

        }


        // ======================================================
        // OPERACIÓN TERMINADA CON ERROR
        // ======================================================

        if (
            operation.error ||
            operation.status
        ) {

            const status =
                operation.status ||
                operation.error;


            if (
                typeof status === 'object'
            ) {

                throw new Error(
                    status.message ||
                    JSON.stringify(
                        status
                    )
                );

            }


            throw new Error(
                String(status)
            );

        }


        // ======================================================
        // RESPUESTA DEL ASSET
        // ======================================================

        if (
            operation.response
        ) {

            return operation;

        }


        throw new Error(
            'Roblox terminó la operación pero no devolvió información del asset.'
        );

    }


    throw new Error(
        'Roblox tardó demasiado en procesar el audio. La operación superó el tiempo de espera.'
    );

}


// ============================================================
// SLEEP
// ============================================================

function sleep(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


// ============================================================
// FORMATEAR BYTES
// ============================================================

function formatBytes(
    bytes
) {

    if (
        !bytes ||
        bytes <= 0
    ) {

        return '0 Bytes';

    }


    const units = [
        'Bytes',
        'KB',
        'MB',
        'GB'
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        parseFloat(
            (
                bytes /
                Math.pow(
                    1024,
                    index
                )
            ).toFixed(2)
        ) +
        ' ' +
        units[index]
    );

}


// ============================================================
// EXTRAER ERROR DE ROBLOX
// ============================================================

function extractRobloxError(
    data
) {

    if (!data) {

        return 'Roblox no proporcionó detalles adicionales.';

    }


    if (
        typeof data === 'string'
    ) {

        return data;

    }


    if (
        data.message
    ) {

        return data.message;

    }


    if (
        data.error
    ) {

        if (
            typeof data.error === 'string'
        ) {

            return data.error;

        }


        if (
            data.error.message
        ) {

            return data.error.message;

        }

    }


    if (
        data.status
    ) {

        if (
            typeof data.status === 'string'
        ) {

            return data.status;

        }


        if (
            data.status.message
        ) {

            return data.status.message;

        }

    }


    try {

        return JSON.stringify(
            data
        ).slice(
            0,
            1200
        );

    } catch {

        return 'Roblox no proporcionó detalles adicionales.';

    }

}


// ============================================================
// FORMATEAR MODERACIÓN
// ============================================================

function formatModerationState(
    state
) {

    const states = {

        MODERATION_STATE_APPROVED:
            'Aprobado',

        MODERATION_STATE_REJECTED:
            'Rechazado',

        MODERATION_STATE_REVIEWING:
            'En revisión',

        MODERATION_STATE_PENDING:
            'Pendiente',

        UNKNOWN:
            'Desconocido'

    };


    return (
        states[state] ||
        state
    );

}