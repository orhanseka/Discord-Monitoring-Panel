const { config, assertConfig } = require('./config');
const { startBot } = require('./bot');
const { startPanel } = require('./server');

async function bootstrap() {
  assertConfig();
  console.log('Status Bot is starting...');
  const client = await startBot(config.discordToken);
  await startPanel({ port: config.port, panelApiKey: config.panelApiKey, client });
}

bootstrap().catch((err) => {
  console.error('Status Bot failed to start:', err);
  process.exit(1);
});
