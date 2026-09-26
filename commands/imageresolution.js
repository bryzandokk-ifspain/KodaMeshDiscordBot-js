const {
  SlashCommandBuilder,
  AttachmentBuilder
} = require('discord.js');

const sharp = require('sharp');
const axios = require('axios');
const fs = require('fs');
const path = require('path');


// ============================================================
// CONFIGURATION
// ============================================================

const MAX_SIZE = 512;
const FINAL_SIZE = 1024;


// ============================================================
// COMMAND
// ============================================================

module.exports = {

  data: new SlashCommandBuilder()
    .setName('imageresolution')
    .setDescription(
      'Upscales an image to 1024x1024 while preserving pixels'
    )
    .addAttachmentOption(option =>
      option
        .setName('image')
        .setDescription(
          'Square image from 1x1 up to 512x512'
        )
        .setRequired(true)
    ),


  // ==========================================================
  // EXECUTE
  // ==========================================================

  async execute(interaction) {

    await interaction.deferReply();


    const attachment =
      interaction.options.getAttachment('image');


    // ========================================================
    // CHECK FILE
    // ========================================================

    if (!attachment) {

      return interaction.editReply(
        '❌ No image was provided.'
      );
    }


    if (
      !attachment.contentType ||
      !attachment.contentType.startsWith('image/')
    ) {

      return interaction.editReply(
        '❌ The file must be an image.'
      );
    }


    // ========================================================
    // CREATE TEMP FOLDER
    // ========================================================

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


    const inputPath =
      path.join(
        tempDir,
        `resolution_input_${timestamp}`
      );


    const outputPath =
      path.join(
        tempDir,
        `resolution_1024_${timestamp}.png`
      );


    try {

      // ======================================================
      // DOWNLOAD IMAGE
      // ======================================================

      await interaction.editReply(
        '⏳ Analyzing image...'
      );


      const response =
        await axios.get(
          attachment.url,
          {
            responseType: 'arraybuffer'
          }
        );


      fs.writeFileSync(
        inputPath,
        Buffer.from(response.data)
      );


      // ======================================================
      // READ DIMENSIONS
      // ======================================================

      const metadata =
        await sharp(inputPath).metadata();


      const width =
        metadata.width;

      const height =
        metadata.height;


      if (!width || !height) {

        throw new Error(
          'Could not detect the image dimensions.'
        );
      }


      console.log(
        `[IMAGE RESOLUTION] Image received: ${width}x${height}`
      );


      // ======================================================
      // CHECK SIZE
      // ======================================================

      if (
        width < 1 ||
        height < 1 ||
        width > MAX_SIZE ||
        height > MAX_SIZE
      ) {

        return interaction.editReply(
          `❌ The image must be between **1x1 and 512x512**.\n\n` +
          `Your image is: **${width}x${height}**`
        );
      }


      // ======================================================
      // CHECK IF SQUARE
      // ======================================================

      if (width !== height) {

        return interaction.editReply(
          `❌ The image must be square.\n\n` +
          `Your image is: **${width}x${height}**`
        );
      }


      // ======================================================
      // UPSCALE TO 1024x1024
      // ======================================================

      await interaction.editReply(
        `⏳ Upscaling **${width}x${height} → 1024x1024**...`
      );


      await sharp(inputPath)
        .resize(
          FINAL_SIZE,
          FINAL_SIZE,
          {
            kernel: sharp.kernel.nearest
          }
        )
        .png()
        .toFile(outputPath);


      // ======================================================
      // CHECK RESULT
      // ======================================================

      const finalMetadata =
        await sharp(outputPath).metadata();


      console.log(
        `[IMAGE RESOLUTION] Result: ` +
        `${finalMetadata.width}x${finalMetadata.height}`
      );


      // ======================================================
      // SEND IMAGE
      // ======================================================

      const outputFile =
        new AttachmentBuilder(
          outputPath,
          {
            name:
              `image_1024x1024.png`
          }
        );


      await interaction.editReply({

        content:
          `✅ **Image successfully upscaled!**\n\n` +
          `Original: **${width}x${height}**\n` +
          `Result: **1024x1024**`,

        files: [
          outputFile
        ]

      });


    } catch (error) {

      console.error(
        '[ERROR] /imageresolution:',
        error
      );


      try {

        await interaction.editReply(
          `❌ Error processing the image:\n\`${error.message}\``
        );

      } catch (replyError) {

        console.error(
          '[ERROR] Could not send error:',
          replyError.message
        );
      }


    } finally {

      // ======================================================
      // CLEAN TEMP FILES
      // ======================================================

      [
        inputPath,
        outputPath
      ].forEach(filePath => {

        try {

          if (fs.existsSync(filePath)) {

            fs.unlinkSync(filePath);

          }

        } catch (error) {

          console.warn(
            '[IMAGE RESOLUTION] Could not delete:',
            filePath
          );
        }

      });

    }

  }

};