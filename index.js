require('dotenv').config();

const {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');


// ============================================================
// CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Collection();


// ============================================================
// CARGAR COMANDOS
// ============================================================

const commandsPath =
    path.join(
        __dirname,
        'commands'
    );

let commandFiles = [];

try {

    commandFiles =
        fs.readdirSync(
            commandsPath
        )
        .filter(
            file =>
                file.endsWith('.js')
        );

} catch (error) {

    console.error(
        '[FATAL] No se pudo leer la carpeta commands:',
        error
    );

    process.exit(1);

}


for (
    const file of commandFiles
) {

    const filePath =
        path.join(
            commandsPath,
            file
        );


    try {

        delete require.cache[
            require.resolve(
                filePath
            )
        ];


        const command =
            require(
                filePath
            );


        if (

            command &&

            command.data &&

            typeof command.execute ===
                'function'

        ) {

            const commandName =
                command.data.name;


            if (
                client.commands.has(
                    commandName
                )
            ) {

                console.warn(
                    `[COMMAND] ⚠️ Duplicado ignorado: /${commandName}`
                );

                continue;

            }


            client.commands.set(
                commandName,
                command
            );


            console.log(
                `[COMMAND] Cargado: /${commandName}`
            );

        } else {

            console.warn(
                `[COMMAND] ⚠️ ${file} no tiene data/execute válidos.`
            );

        }

    } catch (error) {

        console.error(
            `[ERROR] No se pudo cargar ${file}:`,
            error
        );

    }

}


// ============================================================
// REGISTRAR SLASH COMMANDS
// ============================================================

const rest =
    new REST().setToken(
        process.env.TOKEN
    );


(async () => {

    try {

        console.log('');

        console.log(
            '============================================'
        );

        console.log(
            ' REGISTRANDO SLASH COMMANDS'
        );

        console.log(
            '============================================'
        );


        const commands = [];

        const names =
            new Set();


        for (
            const file of commandFiles
        ) {

            try {

                const filePath =
                    path.join(
                        commandsPath,
                        file
                    );


                delete require.cache[
                    require.resolve(
                        filePath
                    )
                ];


                const command =
                    require(
                        filePath
                    );


                if (

                    !command ||

                    !command.data ||

                    typeof command.data.toJSON !==
                        'function'

                ) {

                    continue;

                }


                const commandData =
                    command.data.toJSON();


                if (
                    names.has(
                        commandData.name
                    )
                ) {

                    console.warn(
                        `[COMMAND] ⚠️ Duplicado ignorado: /${commandData.name}`
                    );

                    continue;

                }


                names.add(
                    commandData.name
                );


                commands.push(
                    commandData
                );


                console.log(
                    `[COMMAND] Preparado: /${commandData.name}`
                );


            } catch (error) {

                console.error(
                    `[ERROR] No se pudo preparar ${file}:`,
                    error
                );

            }

        }


        console.log('');

        console.log(
            `📦 Total de comandos: ${commands.length}`
        );

        console.log('');


        await rest.put(

            Routes.applicationGuildCommands(

                process.env.CLIENT_ID,

                process.env.GUILD_ID

            ),

            {

                body:
                    commands

            }

        );


        console.log(
            '============================================'
        );

        console.log(
            '✅ SLASH COMMANDS REGISTRADOS CORRECTAMENTE'
        );

        console.log(
            '============================================'
        );

        console.log('');

    } catch (error) {

        console.error(
            '[ERROR] Registrando slash commands:',
            error
        );

    }

})();


// ============================================================
// BOT READY
// ============================================================

client.once(

    'ready',

    () => {

        console.log('');

        console.log(
            '============================================'
        );

        console.log(
            `🤖 Bot encendido como ${client.user.tag}`
        );

        console.log(
            `🏠 Servidor: ${process.env.GUILD_ID}`
        );

        console.log(
            `📦 Comandos cargados: ${client.commands.size}`
        );

        console.log(
            '============================================'
        );

        console.log('');

    }

);


// ============================================================
// INTERACCIONES
// ============================================================

client.on(

    'interactionCreate',

    async interaction => {

        // ====================================================
        // SLASH COMMANDS
        // ====================================================

        if (
            interaction.isChatInputCommand()
        ) {

            const commandName =
                interaction.commandName;


            const command =
                client.commands.get(
                    commandName
                );


            if (!command) {

                console.warn(
                    `[COMMAND] No se encontró /${commandName}`
                );

                return;

            }


            // =================================================
            // COMANDOS LARGOS
            // =================================================

            const longRunningCommands = [

                'imagetomesh3id',

                'idsound',

                'portpack'

            ];


            if (

                longRunningCommands.includes(
                    commandName
                )

            ) {

                console.log('');

                console.log(
                    '============================================================'
                );

                console.log(
                    `[DISCORD] /${commandName} recibido.`
                );

                console.log(
                    `[DISCORD] Interaction ID: ${interaction.id}`
                );

                console.log(
                    '============================================================'
                );


                // -------------------------------------------------
                // ACK INMEDIATO
                // -------------------------------------------------

                try {

                    await interaction.deferReply();


                    console.log(
                        `[DISCORD] /${commandName} ACK enviado correctamente.`
                    );


                } catch (error) {

                    console.error('');

                    console.error(
                        '============================================================'
                    );


                    if (
                        error?.code === 10062
                    ) {

                        console.error(
                            `[DISCORD] ❌ UNKNOWN INTERACTION - /${commandName}`
                        );

                        console.error(
                            'La interacción expiró o otro proceso/bot ya la respondió.'
                        );

                    } else {

                        console.error(
                            `[DISCORD] ❌ Error haciendo deferReply() - /${commandName}:`,
                            error
                        );

                    }


                    console.error(
                        '============================================================'
                    );


                    return;

                }


                // -------------------------------------------------
                // EJECUTAR COMANDO
                // -------------------------------------------------

                try {

                    await command.execute(
                        interaction
                    );


                } catch (error) {

                    console.error(
                        `[ERROR] Comando /${commandName}:`,
                        error
                    );


                    await safeInteractionError(
                        interaction,
                        error
                    );

                }


                return;

            }


            // =================================================
            // RESTO DE COMANDOS
            // =================================================

            try {

                await command.execute(
                    interaction
                );


            } catch (error) {

                console.error(
                    `[ERROR] Comando /${commandName}:`,
                    error
                );


                await safeInteractionError(
                    interaction,
                    error
                );

            }


            return;

        }


        // ====================================================
        // MODAL /rblxavatarzip
        // ====================================================

        if (

            interaction.isModalSubmit() &&

            interaction.customId ===
                'rblxavatarzip_modal'

        ) {

            const command =
                client.commands.get(
                    'rblxavatarzip'
                );


            if (

                !command ||

                typeof command.handleModal !==
                    'function'

            ) {

                console.error(
                    '[ERROR] No existe handleModal para /rblxavatarzip'
                );


                try {

                    if (

                        !interaction.replied &&

                        !interaction.deferred

                    ) {

                        await interaction.reply({

                            content:
                                '❌ El comando de avatar ZIP no está correctamente configurado.',

                            ephemeral:
                                true

                        });

                    }

                } catch (error) {

                    console.error(
                        '[ERROR] No se pudo responder al modal:',
                        error.message
                    );

                }


                return;

            }


            try {

                await command.handleModal(
                    interaction
                );


            } catch (error) {

                console.error(
                    '[ERROR] Modal /rblxavatarzip:',
                    error
                );


                await safeInteractionError(
                    interaction,
                    error
                );

            }


            return;

        }


        // ====================================================
        // MODAL /previewpack
        // ====================================================

        if (

            interaction.isModalSubmit() &&

            interaction.customId ===
                'previewpack_modal'

        ) {

            const command =
                client.commands.get(
                    'previewpack'
                );


            if (

                !command ||

                typeof command.handleModal !==
                    'function'

            ) {

                console.error(
                    '[ERROR] No existe handleModal para /previewpack'
                );

                return;

            }


            try {

                await command.handleModal(
                    interaction
                );


            } catch (error) {

                console.error(
                    '[ERROR] Modal /previewpack:',
                    error
                );


                await safeInteractionError(
                    interaction,
                    error
                );

            }


            return;

        }


        // ====================================================
        // MODAL /robloxavatar3d
        // ====================================================

        if (

            interaction.isModalSubmit() &&

            interaction.customId ===
                'roblox_avatar3d_modal'

        ) {

            try {

                await interaction.deferReply();


                const input =
                    interaction.fields

                        .getTextInputValue(
                            'roblox_user'
                        )

                        .trim();


                let userId;

                let username;


                // ------------------------------------------------
                // ID
                // ------------------------------------------------

                if (
                    /^\d+$/.test(
                        input
                    )
                ) {

                    userId =
                        input;


                    const userRes =
                        await fetch(

                            `https://users.roblox.com/v1/users/${userId}`

                        );


                    if (
                        !userRes.ok
                    ) {

                        throw new Error(
                            'Usuario no encontrado'
                        );

                    }


                    const userData =
                        await userRes.json();


                    username =
                        userData.name;


                } else {

                    // --------------------------------------------
                    // USERNAME
                    // --------------------------------------------

                    const res =
                        await fetch(

                            'https://users.roblox.com/v1/usernames/users',

                            {

                                method:
                                    'POST',

                                headers: {

                                    'Content-Type':
                                        'application/json'

                                },

                                body:

                                    JSON.stringify({

                                        usernames: [

                                            input

                                        ],

                                        excludeBannedUsers:
                                            false

                                    })

                            }

                        );


                    const data =
                        await res.json();


                    if (

                        !data.data ||

                        data.data.length === 0

                    ) {

                        throw new Error(
                            'Usuario no encontrado'
                        );

                    }


                    userId =
                        data.data[0].id;


                    username =
                        data.data[0].name;

                }


                // ------------------------------------------------
                // AVATAR
                // ------------------------------------------------

                const thumbRes =
                    await fetch(

                        `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`

                    );


                const thumbData =
                    await thumbRes.json();


                if (

                    !thumbData.data?.[0] ||

                    thumbData.data[0].state !==
                        'Completed'

                ) {

                    throw new Error(
                        'No se pudo obtener el avatar'
                    );

                }


                const avatarUrl =
                    thumbData.data[0].imageUrl;


                // ------------------------------------------------
                // EMBED
                // ------------------------------------------------

                const embed =
                    new EmbedBuilder()

                        .setColor(
                            0x00A2FF
                        )

                        .setTitle(
                            username
                        )

                        .setDescription(

                            `**ID:** \`${userId}\`\n\nPuedes copiar el ID fácilmente.`

                        )

                        .setImage(
                            avatarUrl
                        )

                        .setFooter({

                            text:
                                'Roblox Avatar'

                        })

                        .setTimestamp();


                await interaction.editReply({

                    embeds: [

                        embed

                    ]

                });


            } catch (error) {

                console.error(
                    '[ERROR] /robloxavatar3d:',
                    error
                );


                await safeInteractionError(
                    interaction,
                    error
                );

            }


            return;

        }

    }

);


// ============================================================
// ERROR GLOBAL
// ============================================================

client.on(

    'error',

    error => {

        console.error(
            '[DISCORD CLIENT ERROR]',
            error
        );

    }

);


process.on(

    'unhandledRejection',

    error => {

        console.error(
            '[UNHANDLED REJECTION]',
            error
        );

    }

);


process.on(

    'uncaughtException',

    error => {

        console.error(
            '[UNCAUGHT EXCEPTION]',
            error
        );

    }

);


// ============================================================
// RESPUESTA DE ERROR SEGURA
// ============================================================

async function safeInteractionError(

    interaction,

    error

) {

    const message =
        error?.message ||
        'Ocurrió un error inesperado.';


    try {

        if (

            interaction.replied ||

            interaction.deferred

        ) {

            await interaction.editReply({

                content:

                    `❌ **Error:**\n\`${message.slice(
                        0,
                        1900
                    )}\``

            });


        } else {

            await interaction.reply({

                content:

                    `❌ **Error:**\n\`${message.slice(
                        0,
                        1900
                    )}\``,

                ephemeral:
                    true

            });

        }


    } catch (replyError) {

        console.error(

            '[DISCORD] No se pudo enviar el error al usuario:',

            replyError.message

        );

    }

}


// ============================================================
// LOGIN
// ============================================================

if (
    !process.env.TOKEN
) {

    console.error(
        '[FATAL] Falta TOKEN en .env'
    );

    process.exit(1);

}


client.login(
    process.env.TOKEN
);