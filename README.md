# Apex Map Bot

A Discord bot that shows the current Apex Legends map rotation.

## Setup

1.  **Install Node.js:** If you don't have it already, install Node.js from [https://nodejs.org/](https://nodejs.org/).
2.  **Clone the repository:** `git clone https://github.com/your-username/apex-map-bot.git`
3.  **Install dependencies:** `npm install`
4.  **Get a Discord Bot Token:**
    *   Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    *   Click on "New Application".
    *   Give your application a name and click "Create".
    *   Go to the "Bot" tab and click "Add Bot".
    *   Click "Copy" to copy your bot's token.
5.  **Add the token to the bot:**
    *   Open `index.js` in a text editor.
    *   Replace `'YOUR_BOT_TOKEN'` with the token you copied.

## Running the Bot

1.  **Start the bot:** `node index.js`
2.  **Invite the bot to your server:**
    *   Go back to the Discord Developer Portal.
    *   Go to the "OAuth2" tab.
    *   Under "Scopes", check the "bot" checkbox.
    *   Under "Bot Permissions", select "Send Messages" and "Read Message History".
    *   Copy the generated URL and paste it into your browser to invite the bot to your server.

## Usage

*   `!map` - Shows the current map rotation.
# Auto-deploy test
