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
        
        // Find "Next map is" text and extract the map names
        const nextMaps = {
            battleRoyale: '',
            ranked: '',
            mixtape: ''
        };
        
        // Look for next map information in h5 elements
        $('h5').each((i, elem) => {
            const text = $(elem).text();
            if (text.includes('Next map is')) {
                const mapName = $(elem).find('span[style*="font-weight: bold"]').text();
                const parentContainer = $(elem).closest('.container, .row, .col-md-4');
                
                // Determine which mode this belongs to by looking at siblings
                const modeHeader = parentContainer.find('h2').first().text();
                const prevH2 = $(elem).prevAll('h2').first().text();
                
                // Check previous h2 elements to determine the mode
                if (prevH2 === 'BR Pubs' || modeHeader.includes('BR Pubs')) {
                    nextMaps.battleRoyale = mapName;
                } else if (prevH2 === 'BR Ranked' || modeHeader.includes('BR Ranked')) {
                    nextMaps.ranked = mapName;
                } else if (prevH2 === 'Mixtape' || modeHeader.includes('Mixtape')) {
                    nextMaps.mixtape = mapName;
                }
            }
        });
        
        return nextMaps;
    } catch (error) {
        console.error('Error fetching next maps:', error);
        return null;
    }
};

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('🎮 Apex Map Bot v3.0 - Next map feature added!');
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
    
    // NEW: Next map command
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
    
    // ENHANCED: Combined current + next maps
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
        message.channel.send('🏓 Pong! Auto-deploy is working! v3.0 - Next maps feature!');
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
