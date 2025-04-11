require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Overlay map using Pinata gateway and properly encoded filenames
const overlayMap = {
  brownflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Brown%20Flex.png',
  ghostflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Ghost%20Flex.png',
  toxicflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Toxic%20Flex.png',
  fireflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Fire%20Flex.png',
  greenflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Green%20Flex.png',
  rainbowflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Rainbow%20Flex.png',
  whiteflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/White%20Flex.png',
  redflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Red%20Flex.png',
  violetflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Violet%20Flex.png',
  blueflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Blue%20Flex.png',
  goldflex: 'https://black-bitter-reindeer-943.mypinata.cloud/ipfs/bafybeia7ofwilex5o4itjctphxg3jaguyqiaguklae7zlgzzjsmgi3i3vy/Gold%20Flex.png'
};

client.once('ready', () => {
  console.log(`🔥 FridayFlex Bot is live as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const content = message.content.slice(1).toLowerCase().trim(); // remove "!" and normalize
  const helpCommand = content === 'help';

  // Handle !help command
  if (helpCommand) {
    const available = Object.keys(overlayMap)
      .map(cmd => `• \`!${cmd} [token_id]\``)
      .join('\n');

    return message.reply(
      `🛠️ **FridayFlex Bot Help**\n\n` +
      `To flex your Always Tired NFT with a themed overlay, use:\n` +
      `\`!{flexstyle} {token_id}\`\n` +
      `or\n` +
      `\`!{flexstyle}{token_id}\`\n\n` +
      `**Example:** \`!fireflex 245\` or \`!fireflex245\`\n\n` +
      `**Available Flex Styles:**\n${available}`
    );
  }

  // Try space-separated first
  let [command, tokenId] = content.split(/\s+/);

  // Fallback if no space was used
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
  const ipfsBase = 'bafybeigqhrsckizhwjow3dush4muyawn7jud2kbmy3akzxyby457njyr5e';

  try {
    // Try loading NFT image from ipfs.io first
    let nftImageBuffer;

    try {
      console.log(`🔍 Trying ipfs.io for token ${tokenId}`);
      const nftRes = await axios.get(
        `https://ipfs.io/ipfs/${ipfsBase}/${tokenId}.jpg`,
        { responseType: 'arraybuffer' }
      );
      nftImageBuffer = nftRes.data;
    } catch (err) {
      console.warn(`⚠️ ipfs.io failed, retrying with Cloudflare for token ${tokenId}...`);
      const fallbackRes = await axios.get(
        `https://cloudflare-ipfs.com/ipfs/${ipfsBase}/${tokenId}.jpg`,
        { responseType: 'arraybuffer' }
      );
      nftImageBuffer = fallbackRes.data;
    }

    const overlayRes = await axios.get(overlayUrl, { responseType: 'arraybuffer' });

    const nftPng = await sharp(nftImageBuffer).resize(1216, 1216).png().toBuffer();
    const overlayPng = await sharp(overlayRes.data).resize(1216, 1216).png().toBuffer();

    const resultImage = await sharp(nftPng)
      .composite([{ input: overlayPng, blend: 'over' }])
      .jpeg({ quality: 90 })
      .toBuffer();

    await message.reply({
      files: [{ attachment: resultImage, name: `fridayflex_${tokenId}.jpg` }]
    });
  } catch (err) {
    console.error("❌ FULL ERROR:", err);
    message.reply("😵 Something went wrong flexing your NFT. Try again or check the token ID.");
  }
});

client.login(process.env.DISCORD_TOKEN);

