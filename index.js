require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Overlay prompt-to-image mapping
const overlayMap = {
  brownflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523588534317159/IMG_2206.png',
  ghostflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523589025058817/IMG_2207.png',
  toxicflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523659535503410/IMG_2203.png',
  fireflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523589947797554/IMG_2201_1.png',
  greenflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523590367236158/GreenFlex.png',
  rainbowflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523590866346014/AWTRainbow.png',
  whiteflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523658302378015/IMG_2210.png',
  redflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523658730176532/IMG_2209.png',
  violetflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523659162193991/IMG_2208.png',
  blueflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523659971690536/IMG_2204.png',
  goldflex: 'https://media.discordapp.net/attachments/1068590342003236935/1139523660370153594/IMG_2205.png'
};

client.once('ready', () => {
  console.log(`🔥 FridayFlex Bot is live as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  // Match commands like !fireflex[123]
  const match = message.content.match(/^!(\w+)\[(\d+)]$/);
  if (!match) return;

  const [, command, tokenId] = match;
  const overlayUrl = overlayMap[command.toLowerCase()];

  if (!overlayUrl) {
    return message.reply("😴 That flex command doesn’t exist. Try one like `!fireflex[1234]`.");
  }

  const nftUrl = `https://ipfs.io/ipfs/bafybeigqhrsckizhwjow3dush4muyawn7jud2kbmy3akzxyby457njyr5e/${tokenId}.jpg`;

  try {
    const [nftRes, overlayRes] = await Promise.all([
      axios.get(nftUrl, { responseType: 'arraybuffer' }),
      axios.get(overlayUrl, { responseType: 'arraybuffer' })
    ]);

    const nftImage = await sharp(nftRes.data).resize(1216, 1216).toBuffer();
    const overlayImage = await sharp(overlayRes.data).resize(1216, 1216).toBuffer();

    const resultImage = await sharp(nftImage)
      .composite([{ input: overlayImage, blend: 'over' }])
      .jpeg()
      .toBuffer();

    await message.reply({
      files: [{ attachment: resultImage, name: `fridayflex_${tokenId}.jpg` }]
    });
  } catch (err) {
    console.error("❌ Error processing image:", err.message);
    message.reply("😵 Something went wrong flexing your NFT. Try again or check the token ID.");
  }
});

client.login(process.env.DISCORD_TOKEN);
