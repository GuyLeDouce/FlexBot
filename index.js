require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Proxying Imgur overlays through images.weserv.nl
const overlayMap = {
  blueflex: 'https://images.weserv.nl/?url=i.imgur.com/6PSxAwv.png',
  brownflex: 'https://images.weserv.nl/?url=i.imgur.com/ZVl3vk6.png',
  electroflex: 'https://images.weserv.nl/?url=i.imgur.com/38btX5R.png',
  fireflex: 'https://images.weserv.nl/?url=i.imgur.com/KnnpvKM.png',
  ghostflex: 'https://images.weserv.nl/?url=i.imgur.com/HSlzB4J.png',
  goldflex: 'https://images.weserv.nl/?url=i.imgur.com/w12nc1d.png',
  greenflex: 'https://images.weserv.nl/?url=i.imgur.com/hK0tTSx.png',
  rainbowflex: 'https://images.weserv.nl/?url=i.imgur.com/zZcwiQZ.png',
  toxicflex: 'https://images.weserv.nl/?url=i.imgur.com/NrU4Wxn.png',
  violetflex: 'https://images.weserv.nl/?url=i.imgur.com/wyHD66V.png',
  whiteflex: 'https://images.weserv.nl/?url=i.imgur.com/UVc0Yfi.png'
};

// Always Tired NFT base image location
const nftIpfsBase = 'https://ipfs.io/ipfs/bafybeigqhrsckizhwjow3dush4muyawn7jud2kbmy3akzxyby457njyr5e';

client.once('ready', () => {
  console.log(`🔥 FridayFlex Bot is live as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const content = message.content.slice(1).toLowerCase().trim();
  if (content === 'help') {
    const available = Object.keys(overlayMap)
      .map(cmd => `• \`!${cmd} [token_id]\``)
      .join('\n');

    return message.reply(
      `🛠️ **FridayFlex Bot Help**\n\n` +
      `To flex your Always Tired NFT with a themed overlay, use:\n` +
      `\`!{flexstyle} {token_id}\` or \`!{flexstyle}{token_id}\`\n\n` +
      `**Example:** \`!fireflex 245\`\n\n` +
      `**Available Flex Styles:**\n${available}`
    );
  }

  let [command, tokenId] = content.split(/\s+/);
  if (!tokenId) {
    for (const key of Object.keys(overlayMap)) {
      if (content.startsWith(key)) {
        command = key;
        tokenId = content.slice(key.length);
        break;
      }
    }
  }

  if (!overlayMap[command]) return;
  if (!tokenId || isNaN(tokenId)) {
    return message.reply("😴 Please include a valid token ID, like `!fireflex 245` or `!fireflex245`.");
  }

  const overlayUrl = overlayMap[command];
  const nftUrl = `${nftIpfsBase}/${tokenId}.jpg`;

  try {
    console.log(`🖼️ Loading NFT: ${nftUrl}`);
    console.log(`🎨 Overlay: ${overlayUrl}`);

    const [nftRes, overlayRes] = await Promise.all([
      axios.get(nftUrl, { responseType: 'arraybuffer' }),
      axios.get(overlayUrl, { responseType: 'arraybuffer' })
    ]);

    const nftPng = await sharp(nftRes.data).resize(1216, 1216).png().toBuffer();
    const overlayPng = await sharp(overlayRes.data).resize(1216, 1216).png().toBuffer();

    const resultImage = await sharp(nftPng)
      .composite([{ input: overlayPng, blend: 'over' }])
      .jpeg({ quality: 90 })
      .toBuffer();

    await message.reply({
      files: [{ attachment: resultImage, name: `fridayflex_${tokenId}.jpg` }]
    });
  } catch (err) {
    console.error("❌ Flex failed:", err.message);
    message.reply("😵 Something went wrong flexing your NFT. Try again or check the token ID.");
  }
});

client.login(process.env.DISCORD_TOKEN);
