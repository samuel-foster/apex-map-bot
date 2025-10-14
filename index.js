require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const url = 'https://apexlegendsstatus.com/current-map';
const patchNotesUrl = 'https://www.ea.com/games/apex-legends/apex-legends/news';

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

const getPatchNotes = async () => {
    try {
        // Fallback to the provided URL
        const patchUrl = 'https://www.ea.com/games/apex-legends/apex-legends/news/raise-hell-event';
        
        // Fetch the patch notes page
        const { data: patchData } = await axios.get(patchUrl);
        const $patch = cheerio.load(patchData);
        
        // Extract patch notes content
        let gameChanges = [];
        let legendChanges = new Map(); // Use Map to track unique legend changes
        let title = '';
        
        // Try to find the article title
        title = $patch('h1').first().text().trim() || 'Latest Update';
        
        // Look for the PATCH NOTES section - find all content after it
        let inPatchSection = false;
        let inGameSection = false;
        let inLegendSection = false;
        let currentLegend = '';
        let foundAnySection = false;
        
        $patch('h2, h3, h4, h5, h6, p, li').each((i, elem) => {
            const tagName = elem.name;
            const text = $patch(elem).text().trim();
            
            // Stop if we hit footer/nav content
            if (text.includes('Play Apex Legends') || text.includes('Follow Apex') || 
                text.includes('Legal & Privacy') || text.includes('Sign up for our newsletter')) {
                inPatchSection = false;
                return false; // Stop processing
            }
            
            // Check if we've entered patch notes section
            if (text.toUpperCase().includes('PATCH NOTES')) {
                inPatchSection = true;
                return;
            }
            
            if (!inPatchSection) return;
            
            // Check for GAME section
            if (text.toUpperCase() === 'GAME' || text.toUpperCase() === 'PREVIOUS UPDATES & FIXES') {
                inGameSection = true;
                inLegendSection = false;
                foundAnySection = true;
                return;
            }
            
            // Check for LEGENDS section
            if (text.toUpperCase() === 'LEGENDS') {
                inLegendSection = true;
                inGameSection = false;
                foundAnySection = true;
                return;
            }
            
            // Extract legend name (only h5 or h6 tags in legend section)
            if (inLegendSection && (tagName === 'h6' || tagName === 'h5')) {
                currentLegend = text;
                return;
            }
            
            // Extract changes only from list items or bullet points
            if (elem.name === 'li' || (elem.name === 'p' && text.startsWith('•'))) {
                const change = text.replace(/^•\s*/, '').trim();
                // Filter out short/invalid changes
                if (change.length > 15 && !change.includes('http')) {
                    if (inGameSection && gameChanges.length < 10) {
                        gameChanges.push(change);
                    } else if (inLegendSection && currentLegend && legendChanges.size < 5) {
                        // Store in Map to avoid duplicates
                        if (!legendChanges.has(currentLegend)) {
                            legendChanges.set(currentLegend, []);
                        }
                        const changes = legendChanges.get(currentLegend);
                        if (changes.length < 2) {
                            changes.push(change);
                        }
                    }
                }
            }
        });
        
        // Convert Map to array
        const legendChangesArray = [];
        legendChanges.forEach((changes, legend) => {
            changes.forEach(change => {
                legendChangesArray.push(`**${legend}**: ${change}`);
            });
        });
        
        return {
            title,
            url: patchUrl,
            gameChanges,
            legendChanges: legendChangesArray
        };
    } catch (error) {
        console.error('Error fetching patch notes:', error);
        return null;
    }
};

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('🎮 Apex Map Bot v3.2 - Added patch notes command!');
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
    
    // Patch notes command
    if (message.content === '!patch') {
        message.channel.send('🔍 Fetching latest patch notes...');
        
        const patchNotes = await getPatchNotes();
        
        if (patchNotes && (patchNotes.gameChanges.length > 0 || patchNotes.legendChanges.length > 0)) {
            let response = `**📋 ${patchNotes.title}**\n\n`;
            
            if (patchNotes.gameChanges.length > 0) {
                response += '**🎮 GAME CHANGES:**\n';
                patchNotes.gameChanges.forEach(change => {
                    response += `• ${change}\n`;
                });
                response += '\n';
            }
            
            if (patchNotes.legendChanges.length > 0) {
                response += '**🦸 LEGEND CHANGES:**\n';
                patchNotes.legendChanges.forEach(change => {
                    response += `• ${change}\n`;
                });
                response += '\n';
            }
            
            response += `\n🔗 [Read Full Notes](${patchNotes.url})`;
            
            // Discord has a 2000 character limit, so split if needed
            if (response.length > 2000) {
                const chunks = response.match(/[\s\S]{1,1900}/g) || [];
                for (const chunk of chunks) {
                    await message.channel.send(chunk);
                }
            } else {
                message.channel.send(response);
            }
        } else {
            message.channel.send('Could not retrieve patch notes. Please check the EA website: https://www.ea.com/games/apex-legends/apex-legends/news');
        }
    }
    
    // Test command to verify auto-deployment
    if (message.content === '!ping') {
        message.channel.send('🏓 Pong! Bot is running! v3.2');
    }
    
    // Help command
    if (message.content === '!help') {
        message.channel.send(`**🎮 Apex Map Bot Commands:**
        
🗺️ \`!map\` - Get current map rotation
⏭️ \`!next\` - Get next map rotation
📋 \`!maps\` - Get current AND next maps
📰 \`!patch\` - Get latest patch notes summary
🏓 \`!ping\` - Test bot response
❓ \`!help\` - Show this help message`);
    }
});

// Use environment variable for bot token
client.login(process.env.BOT_TOKEN);
