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
        
        // Find map names by looking for mode headers and getting the next h2 element
        const h2Elements = $('h2');
        let battleRoyale = '';
        let ranked = '';
        let mixtape = '';
        
        h2Elements.each((i, elem) => {
            const text = $(elem).text();
            if (text === 'BR Pubs' && h2Elements.eq(i + 1).length) {
                battleRoyale = h2Elements.eq(i + 1).text();
            } else if (text === 'BR Ranked' && h2Elements.eq(i + 1).length) {
                ranked = h2Elements.eq(i + 1).text();
            } else if (text === 'Mixtape' && h2Elements.eq(i + 1).length) {
                mixtape = h2Elements.eq(i + 1).text();
            }
        });
        
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

const getNextMaps = async () => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        
        // Use the CSS classes to identify each game mode section
        const nextMaps = {
            battleRoyale: '',
            ranked: '',
            mixtape: ''
        };
        
        // BR Pubs (sdcat container)
        const brPubsNext = $('.sdcat').find('h5:contains("Next map is")').find('span[style*="font-weight: bold"]').text().trim();
        if (brPubsNext) {
            nextMaps.battleRoyale = brPubsNext;
        }
        
        // BR Ranked (brranked container)  
        const brRankedNext = $('.brranked').find('h5:contains("Next map is")').find('span[style*="font-weight: bold"]').text().trim();
        if (brRankedNext) {
            nextMaps.ranked = brRankedNext;
        }
        
        // Mixtape (mixtape container)
        const mixtapeNext = $('.mixtape').find('h5:contains("Next map is")').find('span[style*="font-weight: bold"]').text().trim();
        if (mixtapeNext) {
            nextMaps.mixtape = mixtapeNext;
        }
        
        return nextMaps;
    } catch (error) {
        console.error('Error fetching next maps:', error);
        return null;
    }
};

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('🎮 Apex Map Bot v3.1 - Fixed next map parsing!');
});

client.on('messageCreate', async message => {
    // Ignore bot messages
    if (message.author.bot) return;
    
    if (message.content === '!map') {
        const mapRotation = await getMapRotation();
        if (mapRotation && (mapRotation.battleRoyale || mapRotation.ranked || mapRotation.mixtape)) {
            message.channel.send(`**Current Apex Legends Map Rotation:**

**Battle Royale:** ${mapRotation.battleRoyale || 'Not available'}
**Ranked:** ${mapRotation.ranked || 'Not available'}
**Mixtape:** ${mapRotation.mixtape || 'Not available'}`);
        } else {
            message.channel.send('Could not retrieve map rotation data. The website might be down or has changed structure.');
        }
    }
    
    // Next map command
    if (message.content === '!next') {
        const nextMaps = await getNextMaps();
        if (nextMaps && (nextMaps.battleRoyale || nextMaps.ranked || nextMaps.mixtape)) {
            message.channel.send(`**Next Apex Legends Map Rotation:**

**Battle Royale:** ${nextMaps.battleRoyale || 'Not available'}
**Ranked:** ${nextMaps.ranked || 'Not available'}
**Mixtape:** ${nextMaps.mixtape || 'Not available'}`);
        } else {
            message.channel.send('Could not retrieve next map rotation data.');
        }
    }
    
    // Combined current + next maps
    if (message.content === '!maps') {
        const [currentMaps, nextMaps] = await Promise.all([
            getMapRotation(),
            getNextMaps()
        ]);
        
        if (currentMaps || nextMaps) {
            let response = '**🗺️ Apex Legends Map Rotation 🗺️**\n\n';
            
            if (currentMaps) {
                response += '**📍 CURRENT MAPS:**\n';
                response += `**Battle Royale:** ${currentMaps.battleRoyale || 'Not available'}\n`;
                response += `**Ranked:** ${currentMaps.ranked || 'Not available'}\n`;
                response += `**Mixtape:** ${currentMaps.mixtape || 'Not available'}\n\n`;
            }
            
            if (nextMaps) {
                response += '**⏭️ NEXT MAPS:**\n';
                response += `**Battle Royale:** ${nextMaps.battleRoyale || 'Not available'}\n`;
                response += `**Ranked:** ${nextMaps.ranked || 'Not available'}\n`;
                response += `**Mixtape:** ${nextMaps.mixtape || 'Not available'}`;
            }
            
            message.channel.send(response);
        } else {
            message.channel.send('Could not retrieve map rotation data.');
        }
    }
    
    // Test command to verify auto-deployment
    if (message.content === '!ping') {
        message.channel.send('🏓 Pong! Auto-deploy is working! v3.1 - Next maps fixed!');
    }
    
    // Help command
    if (message.content === '!help') {
        message.channel.send(`**🎮 Apex Map Bot Commands:**
        
🗺️ \`!map\` - Get current map rotation
⏭️ \`!next\` - Get next map rotation
📋 \`!maps\` - Get current AND next maps
🏓 \`!ping\` - Test bot response
❓ \`!help\` - Show this help message`);
    }
});

// Use environment variable for bot token
client.login(process.env.BOT_TOKEN);
