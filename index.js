require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const url = 'https://apexlegendsstatus.com/current-map';

const getMapRotation = async () => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const battleRoyale = $('div.br-container').find('div.als-map-name').text();
        const ranked = $('div.ranked-container').find('div.als-map-name').text();
        const mixtape = $('div.mixtape-container').find('div.als-map-name').text();
        
        return {
            battleRoyale,
            ranked,
            mixtape
        };
    } catch (error) {
        console.error('Error fetching map rotation:', error);
        return null;
    }
};

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.content === '!map') {
        const mapRotation = await getMapRotation();
        if (mapRotation) {
            message.channel.send(`**Current Apex Legends Map Rotation:**

**Battle Royale:** ${mapRotation.battleRoyale}
**Ranked:** ${mapRotation.ranked}
**Mixtape:** ${mapRotation.mixtape}`);
        } else {
            message.channel.send('Could not retrieve map rotation data.');
        }
    }
});

// Use environment variable for bot token
client.login(process.env.BOT_TOKEN);
