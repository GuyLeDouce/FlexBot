require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Raw GitHub overlay links
const overlayMap = {
  blueflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Blue%20Flex.png',
  brownflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Brown%20Flex.png',
  electroflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Electro%20Flex.png',
  fireflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Fire%20Flex.png',
  ghostflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Ghost%20Flex.png',
  goldflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Gold%20Flex.png',
  greenflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Green%20Flex.png',
  rainbowflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Rainbow%20Flex.png',
  redflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Red%20Flex.png',
  toxicflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Toxic%20Flex.png',
  violetflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/Violet%20Flex.png',
  whiteflex: 'https://raw.githubusercontent.com/GuyLeDouce/fridayflex-assets/main/White%20Flex.png'
};

client.once('ready', () => {
  console.log(`🔥 FridayFlex Bot is live as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const content = message.content.slice(1).toLowerCase().trim();
if (content === 'help' || content === 'flex info') {
  const available = Object.keys(overlayMap)
    .map(cmd => `• \`!${cmd} [token_id]\``)
    .join('\n');

  return message.reply(
    `😴 **FridayFlex Info**\n\n` +
    `To flex your Always Tired NFT with a Friday Flex overlay, use:\n` +
    `\`!{Skin Trait} {token_id}\` or \`!{Skin Trait}{token_id}\`\n\n` +
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

  let nftImageBuffer;

  try {
    console.log(`🖼️ Trying ipfs.io for token ${tokenId}`);
    const nftRes = await axios.get(
  `https://ipfs.chlewigen.ch/ipfs/QmcMWvNKhSzFqbvyCdcaiuBgQLTSEmHXWjys2N1dBUAHFe/${tokenId}.jpg`,
  { responseType: 'arraybuffer' }
);
    nftImageBuffer = nftRes.data;
  } catch (err1) {
    console.warn(`⚠️ ipfs.io failed, retrying with Filebase...`);
    try {
  const fallbackRes = await axios.get(
    `https://cloudflare-ipfs.com/ipfs/QmcMWvNKhSzFqbvyCdcaiuBgQLTSEmHXWjys2N1dBUAHFe/${tokenId}.jpg`,
    { responseType: 'arraybuffer' }
  );
  nftImageBuffer = fallbackRes.data;
} catch (err2) {
  console.warn(`⚠️ Cloudflare IPFS failed too... trying OpenSea API...`);

  try {
    const metadataRes = await axios.get(
      `https://api.opensea.io/api/v1/asset/0xAfF93C4D2eDf14994c4c28fA405588D8D3C0b604/${tokenId}/`,
      { headers: { 'Accept': 'application/json' } }
    );

    const imageUrl = metadataRes.data.image_url;
    if (!imageUrl) throw new Error("No image found in OpenSea metadata");

    const openseaImageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    nftImageBuffer = openseaImageRes.data;
  } catch (err3) {
    console.error("❌ All image sources failed:", err3.message);
    return message.reply("😵 Failed to load NFT image from IPFS or OpenSea. Please try again later.");
  }
}

  try {
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

