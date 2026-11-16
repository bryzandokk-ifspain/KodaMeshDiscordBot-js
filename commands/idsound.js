const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================

const ROBLOX_API_URL = 'https://apis.roblox.com/assets/v1/assets';
const ROBLOX_OPERATION_URL = 'https://apis.roblox.com/assets/v1/operations';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 1024 * 1024; // Allow multipart overhead.
const EMBED_COLOR = 0x9B59B6; // Purple sidebar.

const ALLOWED_EXTENSIONS = {
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac'
};

// ============================================================
// COMMAND
// ============================================================

module.exports = {
    data: new SlashCommandBuilder()
        .setName('idsound')
        .setDescription('Upload an audio file to Roblox and get its Sound ID')
        .addAttachmentOption(option =>
            option
                .setName('archivo')
                .setDescription('Audio file (.mp3, .ogg, .wav or .flac)')
                .setRequired(true)
        ),

    async execute(interaction) {
        let fileName = 'audio';

        try {
            // Ensure editReply() is available even if the command handler
            // did not defer the interaction globally.
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply();
            }

            // ====================================================
            // ENVIRONMENT VARIABLES
            // ====================================================

            const apiKey = process.env.ROBLOX_API_KEY;
            const creatorId = process.env.ROBLOX_CREATOR_ID;
            const isGroup = String(process.env.ROBLOX_IS_GROUP || 'false').toLowerCase() === 'true';

            if (!apiKey) {
                throw new Error('ROBLOX_API_KEY is missing in the .env file');
            }

            if (!creatorId) {
                throw new Error('ROBLOX_CREATOR_ID is missing in the .env file');
            }

            // ====================================================
            // GET ATTACHMENT
            // ====================================================

            // The registered slash-command option is named "archivo".
            const attachment = interaction.options.getAttachment('archivo');

            if (!attachment) {
                throw new Error('No audio file was received');
            }

            fileName = attachment.name || 'audio';

            console.log('\n============================================================');
            console.log('[IDSOUND] New request');
            console.log(`[IDSOUND] Discord user: ${interaction.user.tag || interaction.user.id}`);
            console.log(`[IDSOUND] File: ${fileName}`);
            console.log(`[IDSOUND] Size: ${formatBytes(attachment.size)}`);
            console.log(`[IDSOUND] URL: ${attachment.url}`);
            console.log('============================================================');

            // ====================================================
            // VALIDATE FILE TYPE AND SIZE
            // ====================================================

            const extension = path.extname(fileName).toLowerCase();
            const contentType = ALLOWED_EXTENSIONS[extension];

            if (!contentType) {
                throw new Error(
                    'Unsupported audio format. Allowed formats: .mp3, .ogg, .wav and .flac.'
                );
            }

            if (attachment.size <= 0) {
                throw new Error('The attached file is empty');
            }

            if (attachment.size > MAX_FILE_SIZE) {
                throw new Error(`The file is ${formatBytes(attachment.size)} and exceeds Roblox\'s 20 MB limit`);
            }

            // ====================================================
            // DOWNLOAD FILE
            // ====================================================

            await interaction.editReply({ content: '**Downloading audio...**', embeds: [] });
            console.log('[IDSOUND] Downloading audio...');

            const downloadResponse = await axios.get(attachment.url, {
                responseType: 'arraybuffer',
                timeout: 60000,
                maxContentLength: MAX_FILE_SIZE,
                maxBodyLength: MAX_FILE_SIZE
            });

            const audioBuffer = Buffer.from(downloadResponse.data);

            if (audioBuffer.length === 0) {
                throw new Error('The downloaded file is empty');
            }

            if (audioBuffer.length > MAX_FILE_SIZE) {
                throw new Error('The downloaded file exceeds Roblox\'s 20 MB limit');
            }

            // ====================================================
            // DISPLAY NAME AND CREATOR
            // ====================================================

            let displayName = path.basename(fileName, extension)
                .replace(/[^a-zA-Z0-9_\- ]/g, '')
                .trim();

            if (!displayName) displayName = 'Discord Audio';
            displayName = displayName.slice(0, 100);

            const creator = isGroup
                ? { groupId: String(creatorId) }
                : { userId: String(creatorId) };

            // ====================================================
            // FORM DATA
            // ====================================================

            const form = new FormData();
            const requestData = {
                assetType: 'Audio',
                displayName,
                description: `Audio uploaded via /idsound - ${fileName}`,
                creationContext: { creator }
            };

            form.append('request', JSON.stringify(requestData), {
                contentType: 'application/json'
            });

            form.append('fileContent', audioBuffer, {
                filename: path.basename(fileName),
                contentType
            });

            // ====================================================
            // UPLOAD TO ROBLOX
            // ====================================================

            await interaction.editReply({ content: '**Uploading audio to Roblox...**', embeds: [] });
            console.log('[IDSOUND] Uploading audio to Roblox...');

            let uploadResponse;
            try {
                uploadResponse = await axios.post(ROBLOX_API_URL, form, {
                    headers: {
                        ...form.getHeaders(),
                        'x-api-key': apiKey
                    },
                    // The 20 MB limit applies to the audio itself. Multipart
                    // boundaries and metadata add a small amount to the request.
                    maxContentLength: MAX_REQUEST_SIZE,
                    maxBodyLength: MAX_REQUEST_SIZE,
                    timeout: 120000,
                    validateStatus: () => true
                });
            } catch (error) {
                throw new Error(`Could not connect to Roblox: ${error.message}`);
            }

            if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
                const robloxMessage = extractRobloxError(uploadResponse.data);
                console.error('[IDSOUND] Roblox rejected the upload:', uploadResponse.status, uploadResponse.data);
                throw new Error(`Roblox rejected the upload (${uploadResponse.status}).\n\n${robloxMessage}`);
            }

            const operationData = uploadResponse.data;
            console.log('[IDSOUND] Upload response:', operationData);

            if (!operationData || typeof operationData.path !== 'string') {
                throw new Error('Roblox did not return a valid operation path');
            }

            // Roblox returns a path such as "operations/{operationId}".
            const operationId = operationData.path.split('/').filter(Boolean).pop();
            if (!operationId) {
                throw new Error('Could not extract the Roblox operation ID');
            }

            console.log(`[IDSOUND] Operation ID: ${operationId}`);

            // ====================================================
            // WAIT FOR PROCESSING
            // ====================================================

            await interaction.editReply({ content: '**Roblox is processing and moderating the audio...**', embeds: [] });

            const operationResult = await waitForOperation(operationId, apiKey);
            const assetId = operationResult?.response?.assetId;

            if (!assetId) {
                console.error('[IDSOUND] Final operation response:', operationResult);
                throw new Error('Roblox completed the operation but did not return an Asset ID');
            }

            const moderationState =
                operationResult?.response?.moderationResult?.moderationState || 'UNKNOWN';

            // ====================================================
            // FINAL SUCCESS EMBED
            // ====================================================

            const safeFileName = fileName.replace(/[`*_~|]/g, '\\$&').slice(0, 900);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setTitle('Audio uploaded to Roblox')
                .setDescription('Your audio was successfully uploaded to Roblox.')
                .addFields(
                    { name: 'File', value: `\`${safeFileName}\``, inline: false },
                    { name: 'Asset ID', value: `\`${assetId}\``, inline: true },
                    { name: 'Sound ID', value: `\`rbxassetid://${assetId}\``, inline: true },
                    { name: 'Moderation', value: `\`${formatModerationState(moderationState)}\``, inline: false }
                )
                .setFooter({ text: 'Roblox Audio • /idsound' })
                .setTimestamp();

            await interaction.editReply({ content: null, embeds: [embed] });

            console.log('\n============================================================');
            console.log('[IDSOUND] AUDIO UPLOADED SUCCESSFULLY');
            console.log(`[IDSOUND] File: ${fileName}`);
            console.log(`[IDSOUND] Asset ID: ${assetId}`);
            console.log(`[IDSOUND] Sound ID: rbxassetid://${assetId}`);
            console.log(`[IDSOUND] Moderation: ${moderationState}`);
            console.log('============================================================\n');

        } catch (error) {
            console.error('\n============================================================');
            console.error('[IDSOUND] ERROR');
            console.error(`[IDSOUND] File: ${fileName}`);
            console.error(error);
            console.error('============================================================');

            const message = String(error?.message || 'An unexpected error occurred').slice(0, 1800);
            const errorEmbed = new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setTitle('Audio upload failed')
                .setDescription(`\`${message.replace(/`/g, '\\`')}\``)
                .addFields({ name: 'File', value: `\`${fileName.replace(/[`*_~|]/g, '\\$&').slice(0, 900)}\``, inline: false })
                .setFooter({ text: 'Roblox Audio • /idsound' })
                .setTimestamp();

            try {
                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({ embeds: [errorEmbed] });
                } else {
                    await interaction.editReply({ content: null, embeds: [errorEmbed] });
                }
            } catch (replyError) {
                console.error('[IDSOUND] Could not update Discord:', replyError.message);
            }
        }
    }
};

// ============================================================
// WAIT FOR ROBLOX OPERATION
// ============================================================

async function waitForOperation(operationId, apiKey) {
    const maxAttempts = 60;
    const delay = 3000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[IDSOUND] Checking operation... ${attempt}/${maxAttempts}`);

        let response;
        try {
            response = await axios.get(`${ROBLOX_OPERATION_URL}/${encodeURIComponent(operationId)}`, {
                headers: { 'x-api-key': apiKey },
                timeout: 30000,
                validateStatus: () => true
            });
        } catch (error) {
            console.error('[IDSOUND] Error checking operation:', error.message);
            if (attempt === maxAttempts) {
                throw new Error(`Could not check Roblox processing: ${error.message}`);
            }
            await sleep(delay);
            continue;
        }

        if (response.status < 200 || response.status >= 300) {
            const robloxMessage = extractRobloxError(response.data);
            throw new Error(`Roblox returned ${response.status} while checking the operation.\n\n${robloxMessage}`);
        }

        const operation = response.data;
        console.log('[IDSOUND] Operation status:', JSON.stringify(operation));

        if (!operation || typeof operation !== 'object') {
            throw new Error('Roblox returned an invalid operation response');
        }

        if (operation.done !== true) {
            await sleep(delay);
            continue;
        }

        // The Assets API reports a failed operation in "status" and a
        // successful one in "response".
        if (operation.error || operation.status) {
            const failure = operation.status || operation.error;
            const details = typeof failure === 'string'
                ? failure
                : (failure?.message || JSON.stringify(failure));
            throw new Error(`Roblox could not process the audio: ${details}`);
        }

        if (operation.response) {
            return operation;
        }

        throw new Error('Roblox completed the operation but returned no asset information');
    }

    throw new Error('Roblox took too long to process the audio. The operation timed out.');
}

// ============================================================
// SLEEP
// ============================================================

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

// ============================================================
// FORMAT BYTES
// ============================================================

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 Bytes';

    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${parseFloat(value.toFixed(2))} ${units[index]}`;
}

// ============================================================
// EXTRACT ROBLOX ERROR
// ============================================================

function extractRobloxError(data) {
    if (!data) return 'Roblox did not provide additional details';
    if (typeof data === 'string') return data;
    if (data.message) return String(data.message);
    if (typeof data.error === 'string') return data.error;
    if (data.error?.message) return String(data.error.message);
    if (typeof data.status === 'string') return data.status;
    if (data.status?.message) return String(data.status.message);

    try {
        return JSON.stringify(data).slice(0, 1200);
    } catch {
        return 'Roblox did not provide additional details';
    }
}

// ============================================================
// FORMAT MODERATION STATE
// ============================================================

function formatModerationState(state) {
    const states = {
        MODERATION_STATE_APPROVED: 'Approved',
        MODERATION_STATE_REJECTED: 'Rejected',
        MODERATION_STATE_REVIEWING: 'Under review',
        MODERATION_STATE_PENDING: 'Pending',
        UNKNOWN: 'Unknown'
    };

    return states[state] || String(state || 'Unknown');
}