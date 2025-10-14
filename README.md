# Apex Map Bot

A Discord bot that shows the current Apex Legends map rotation with live updates and patch notes.

## 🤖 Invite the Bot

**Click here to add Apex Map Bot to your Discord server:**

👉 **[Invite Bot to Server](https://discord.com/api/oauth2/authorize?client_id=1427677817935630486&permissions=412317904960&scope=bot)** 👈

The bot needs these permissions:
- Send Messages (to respond to commands)
- Read Message History (to see your commands)
- Embed Links (for formatted messages)

## 📋 Commands

- `!map` - Shows the current map rotation (BR Pubs, BR Ranked, Mixtape)
- `!next` - Shows the next map rotation
- `!maps` - Shows both current and next map rotations
- `!patch` - Get a summary of the latest patch notes
- `!ping` - Check if the bot is responsive
- `!help` - Display all available commands

## 🛠️ Self-Hosting Setup

Want to run your own instance? Follow these steps:

### Prerequisites
- Node.js 20+ installed
- Discord Bot Token
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/samuel-foster/apex-map-bot.git
   cd apex-map-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Get a Discord Bot Token:**
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Go to the "Bot" tab and click "Add Bot"
   - Enable these Privileged Gateway Intents:
     - MESSAGE CONTENT INTENT
   - Click "Copy" to copy your bot's token

4. **Configure the bot:**
   ```bash
   echo "BOT_TOKEN=your_token_here" > .env
   ```

### Running the Bot

**Option 1: Direct Node.js**
```bash
node index.js
```

**Option 2: Docker Compose**
```bash
docker-compose up -d
```

## 🔄 Auto-Updates

To automatically pull updates and redeploy:

```bash
chmod +x update-bot.sh
./update-bot.sh
```

Or set up a cron job:
```bash
crontab -e
# Add: */30 * * * * /home/sam/apex-map-bot/update-bot.sh
```

## 📊 Data Sources

- Map rotation data: [Apex Legends Status](https://apexlegendsstatus.com/current-map)
- Patch notes: [EA Apex Legends News](https://www.ea.com/games/apex-legends/apex-legends/news)

## 📝 Version History

- **v3.2** - Added !patch command for latest patch notes summary
- **v3.1** - Fixed next map parsing with improved CSS selectors
- **v3.0** - Added !next and !maps commands for next map rotation
- **v2.0** - Improved web scraping reliability
- **v1.0** - Initial release with !map command
