require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Overlay image URLs hosted on GitHub via raw links
const overlayMap = {
  brownflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Brown%20Flex.png',
  ghostflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Ghost%20Flex.png',
  toxicflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Toxic%20Flex.png',
  fireflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Fire%20Flex.png',
  greenflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Green%20Flex.png',
  rainbowflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Rainbow%20Flex.png',
  whiteflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/White%20Flex.png',
  redflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Red%20Flex.png',
  violetflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Violet%20Flex.png',
  blueflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Blue%20Flex.png',
  goldflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Gold%20Flex.png'
};

// NFT image base from IPFS
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

  // Parse the flex command and token ID (with or without space)
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
