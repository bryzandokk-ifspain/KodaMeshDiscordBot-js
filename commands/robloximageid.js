const { SlashCommandBuilder } = require('discord.js');
const FormData = require('form-data');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('robloximageid')
    .setDescription('Upload an image to Roblox as OpenUse and it will give you the ID that works')
    .addAttachmentOption(option =>
      option
        .setName('image')
        .setDescription('Drag or select the image')
        .setRequired(true)
    ),

  async execute(interaction) {
    const attachment = interaction.options.getAttachment('image');

    if (!attachment.contentType?.startsWith('image/')) {
      return interaction.reply({
        content: 'Only images are allowed (PNG, JPG, WEBP, etc.).',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      // 1. Download the image
      const imageResponse = await axios.get(attachment.url, {
        responseType: 'arraybuffer'
      });
      const imageBuffer = Buffer.from(imageResponse.data);

      // 2. Prepare FormData
      const form = new FormData();

      const requestData = {
        assetType: 'Image',
        displayName: attachment.name.replace(/\. [^/.]+$/, '') || 'Image uploaded',
        description: `Uploaded from Discord by ${interaction.user.tag}`,
        creationContext: {
          creator: process.env.ROBLOX_IS_GROUP === 'true'
            ? { groupId: Number(process.env.ROBLOX_CREATOR_ID) }
            : { userId: Number(process.env.ROBLOX_CREATOR_ID) },
          expectedPrice: 0,
          assetPrivacy: 'openUse'   // ← This automatically sets it to Open Use
        }
      };

      form.append('request', JSON.stringify(requestData));
      form.append('fileContent', imageBuffer, {
        filename: attachment.name,
        contentType: attachment.contentType
      });

      // 3. Upload to Roblox
      const uploadResponse = await axios.post(
        'https://apis.roblox.com/assets/v1/assets',
        form,
        {
          headers: {
            'x-api-key': process.env.ROBLOX_API_KEY,
            ...form.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      const operationPath = uploadResponse.data.path;
      if (!operationPath) throw new Error('The operation route was not received');

      // 4. Wait for it to finish
      let imageId = null;
      let attempts = 0;

      while (attempts < 30) {
        await new Promise(r => setTimeout(r, 2000));

        const opResponse = await axios.get(
          `https://apis.roblox.com/assets/v1/${operationPath}`,
          {
            headers: { 'x-api-key': process.env.ROBLOX_API_KEY }
          }
        );

        const opData = opResponse.data;

        if (opData.done) {
          if (opData.response?.assetId) {
            imageId = String(opData.response.assetId);
            break;
          }
          if (opData.error) {
            throw new Error(JSON.stringify(opData.error));
          }
        }
        attempts++;
      }

      if (!imageId) throw new Error('The climb took too long');

      // 5. Response
      const embed = {
        color: 0x00FF88,
        title: ' ✅ Image uploaded as Open Use',
        description: [
          `**Name:** \`${attachment.name}\``,
          '',
          `**Image ID (functional):** \`${imageId}\``,
          '',
          '**Use it in Studio:**',
          `\`rbxassetid://${imageId}\``,
          '',
          'The asset was uploaded directly as **Open Use**.',
          'It should now work without having to go to the Dashboard'
        ].join('\n'),
        image: { url: attachment.url },
        footer: { text: `Uploaded by ${interaction.user.tag}` },
        timestamp: new Date()
      };

      await interaction.editReply({ incrustaciones: [incrustación] });

    } catch (error) {
      console.error(error);
      const msg = error.response?.data
        ? JSON.stringify(error.response.data, null, 2)
        : error.message;

      await interaction.editReply({
        content: `Error:\n\`\`\`${msg}\`\`\``
      });
    }
  }
};