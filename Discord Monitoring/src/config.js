const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

const config = {
  discordToken: process.env.DISCORD_TOKEN,
  port: parseInt(process.env.PORT || '3000', 10),
  panelApiKey: process.env.PANEL_API_KEY || ''
};

function assertConfig() {
  if (!config.discordToken) {
    throw new Error('DISCORD_TOKEN is missing in your .env file.');
  }
}

module.exports = {
  config,
  assertConfig
};
