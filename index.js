require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// === Overlay Image Map ===
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

// === Sale Alert Config ===
const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY;
const SALE_CONTRACT = '0x3ccbd9c381742c04d81332b5db461951672f6a99';
const GEN_CHAT_ID = '943847326093561910';
let lastSaleTime = Math.floor(Date.now() / 1000) - 14000;

client.once('ready', () => {
  console.log(`🔥 FridayFlex Bot is live as ${client.user.tag}`);

  // Check for new OpenSea sales every 60 seconds
  setInterval(() => {
    checkOpenSeaSales();
  }, 60 * 1000);
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
    console.log(`🖼️ Trying chlewigen IPFS for token ${tokenId}`);
    const nftRes = await axios.get(
      `https://ipfs.chlewigen.ch/ipfs/QmcMWvNKhSzFqbvyCdcaiuBgQLTSEmHXWjys2N1dBUAHFe/${tokenId}.jpg`,
      { responseType: 'arraybuffer' }
    );
    nftImageBuffer = nftRes.data;
  } catch (err1) {
    console.warn(`⚠️ chlewigen failed... trying Cloudflare IPFS...`);
    try {
      const fallbackRes = await axios.get(
        `https://cloudflare-ipfs.com/ipfs/QmcMWvNKhSzFqbvyCdcaiuBgQLTSEmHXWjys2N1dBUAHFe/${tokenId}.jpg`,
        { responseType: 'arraybuffer' }
      );
      nftImageBuffer = fallbackRes.data;
    } catch (err2) {
      console.warn(`⚠️ Cloudflare failed... trying OpenSea...`);
      try {
        const metadataRes = await axios.get(
          `https://api.opensea.io/api/v1/asset/${SALE_CONTRACT}/${tokenId}/`,
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

async function checkOpenSeaSales() {
  try {
    const res = await axios.get(`https://api.opensea.io/api/v2/events`, {
      headers: { 'x-api-key': OPENSEA_API_KEY },
      params: {
        event_type: 'sale',
        asset_contract_address: SALE_CONTRACT,
        occurred_after: lastSaleTime,
        limit: 5
      }
    });

    const events = res.data.asset_events || [];
    if (events.length > 0) {
      const channel = await client.channels.fetch(GEN_CHAT_ID);
      for (const event of events) {
        if (!event.asset || !event.asset.token_id) {
          console.warn('⚠️ Skipped malformed sale event:', event);
          continue;
        }

        const { asset, buyer_address, total_price, payment_token } = event;
        const tokenId = asset.token_id;
        const price = payment_token
          ? (parseFloat(total_price) / Math.pow(10, payment_token.decimals)).toFixed(4)
          : '?';

        const buyer = buyer_address?.address?.toLowerCase() || 'unknown wallet';
        const permalink = asset.permalink || `https://opensea.io/assets/ethereum/${SALE_CONTRACT}/${tokenId}`;
        const imageUrl = asset.image_url;

        const embed = {
          title: `🔥 ALWAYS TIRED NFT SOLD!`,
          description:
            `🎉 Token \`#${tokenId}\` just SOLD on OpenSea!\n\n` +
            `💰 **Buyer:** \`${buyer}\`\n` +
            `💸 **Price:** ${price} ${payment_token?.symbol || ''}\n` +
            `🔗 [View on OpenSea](${permalink})`,
          image: { url: imageUrl },
          color: 0xff9900,
          footer: { text: `Let's goooo. STAY TIRED.` }
        };

        await channel.send({ content: '<@everyone>', embeds: [embed] });
      }

      const newest = Math.max(...events.map(e => new Date(e.created_date).getTime() / 1000));
      lastSaleTime = newest;
    }
  } catch (err) {
    console.error("❌ Error checking OpenSea sales:", err.response?.data || err.message);
  }
}

client.login(process.env.DISCORD_TOKEN);

