require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const url = 'https://apexlegendsstatus.com/current-map';
const patchNotesUrl = 'https://www.ea.com/games/apex-legends/apex-legends/news';
const metaUrl = 'https://apexlegendsstatus.com/meta';

// Ranked data constants
const RANKED_DATA = {
    season: 26,
    splitInfo: {
        1: { map: 'Broken Moon', startDate: 'Oct 1, 2025', endDate: 'Nov 19, 2025' },
        2: { map: 'Storm Point', startDate: 'Nov 19, 2025', endDate: 'Jan 7, 2026' }
    },
    entryCosts: {
        'Rookie': 0,
        'Bronze': 0,
        'Silver': 20,
        'Gold': 35,
        'Platinum': 45,
        'Diamond': 65,
        'Master': 90,
        'Apex Predator': 90
    }
};

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
                return;
            }
            
            // Check for LEGENDS section
            if (text.toUpperCase() === 'LEGENDS') {
                inLegendSection = true;
                inGameSection = false;
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

const getMeta = async () => {
    try {
        const { data } = await axios.get(metaUrl);
        const $ = cheerio.load(data);
        
        const legends = [];
        
        // Find legend data in the table/list
        // The page shows legends with rank, name, win rate, pick rate
        $('img[alt]').each((i, elem) => {
            if (i >= 10) return false; // Only get top 10
            
            const name = $(elem).attr('alt');
            if (!name || name.length < 2) return;
            
            // Try to find the associated stats
            const container = $(elem).closest('div').parent();
            const text = container.text();
            
            // Extract win rate and pick rate using regex
            const winRateMatch = text.match(/(\d+\.?\d*)%/);
            const pickRateMatch = text.match(/(\d+\.?\d*)%.*?(\d+\.?\d*)%/);
            
            if (name && winRateMatch) {
                legends.push({
                    name: name,
                    rank: i + 1,
                    winRate: winRateMatch[1],
                    pickRate: pickRateMatch ? pickRateMatch[2] : 'N/A'
                });
            }
        });
        
        return legends;
    } catch (error) {
        console.error('Error fetching meta:', error);
        return null;
    }
};

// Ranked split helpers removed — !ranked and !split commands disabled temporarily

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('🎮 Apex Bot v4.0 - Added ranked commands!');
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
    
    // Note: !ranked and !split commands have been temporarily disabled while we refine data accuracy.
    
    // Meta command
    if (message.content === '!meta') {
        message.channel.send('📊 Fetching current ranked meta from top 100 Predators...');
        
        const meta = await getMeta();
        
        if (meta && meta.length > 0) {
            let response = `**🎯 CURRENT RANKED META** (Top 100 Preds)\n\n`;
            response += `**TOP 5 LEGENDS:**\n`;
            
            meta.slice(0, 5).forEach((legend, i) => {
                const emoji = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '▫️';
                response += `${emoji} **${legend.name}** - ${legend.winRate}% WR, ${legend.pickRate}% PR\n`;
            });
            
            response += `\n**TEAM COMP SUGGESTIONS:**\n`;
            response += `• IGL: ${meta[0]?.name || 'Revenant'} / ${meta[1]?.name || 'Ash'}\n`;
            response += `• Fragger: ${meta[2]?.name || 'Alter'} / ${meta[3]?.name || 'Bangalore'}\n`;
            response += `• Support: ${meta[4]?.name || 'Loba'} / Lifeline\n\n`;
            response += `📈 Data from apexlegendsstatus.com/meta`;
            
            message.channel.send(response);
        } else {
            message.channel.send('Could not retrieve meta data. Try again later or check: https://apexlegendsstatus.com/meta');
        }
    }
    
    // Test command to verify auto-deployment
    if (message.content === '!ping') {
        message.channel.send('🏓 Pong! Bot is running! v4.0');
    }
    
    // Help command
    if (message.content === '!help') {
    message.channel.send(`**🎮 Apex Bot Commands:**

**📍 MAP COMMANDS:**
• \`!map\` - Get current map rotation
• \`!next\` - Get next map rotation
• \`!maps\` - Get current AND next maps

**🏆 RANKED COMMANDS:**
• \`!meta\` - Top legends in ranked (from top Preds)

**📰 INFO COMMANDS:**
• \`!patch\` - Get latest patch notes summary
• \`!ping\` - Test bot response
• \`!help\` - Show this help message`);
    }
});

// Use environment variable for bot token
client.login(process.env.BOT_TOKEN);
