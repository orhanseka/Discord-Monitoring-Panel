const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType
} = require('discord.js');
const monitor = require('./monitor');

const suspiciousKeywords = [
  'everyone ping bug',
  'https://discord.gg/',
  '||@everyone||',
  'mass mention'
];

function analyzeMessage(message) {
  if (message.author?.bot) {
    return;
  }
  const suspects = [];

  if (message.mentions?.everyone || message.content.includes('@here')) {
    suspects.push('Mass mention detected');
  }

  if (message.content.length > 1800) {
    suspects.push('Message is unusually long');
  }

  if (suspiciousKeywords.some((kw) => message.content.toLowerCase().includes(kw))) {
    suspects.push('Known bug trigger keyword detected');
  }

  if ((message.attachments?.size || 0) > 5) {
    suspects.push('Message contains an excessive number of attachments');
  }

  if (suspects.length) {
    monitor.recordSuspicion('Suspicious message', {
      channel: message.channel?.name,
      author: message.author?.tag,
      reasons: suspects
    });
  }
}

function registerListeners(client) {
  client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}.`);
    client.user.setActivity({
      name: 'Monitoring Discord health',
      type: ActivityType.Watching
    });
  });

  client.on('messageCreate', (message) => {
    monitor.recordEvent('messageCreate');
    analyzeMessage(message);

    if (!message.content) return;
    const content = message.content.toLowerCase().trim();
    if (content === '!status') {
      const stats = monitor.getSnapshot(client);
      message.reply(
        [
          `Guilds: ${stats.guilds}`,
          `Users: ${stats.userCount}`,
          `Ping: ${stats.ping}ms`,
          `Uptime: ${(stats.uptime / 1000 / 60).toFixed(1)} minutes`
        ].join('\n')
      );
    }
  });

  client.on('interactionCreate', (interaction) => {
    monitor.recordEvent('interactionCreate');
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'status') {
      const stats = monitor.getSnapshot(client);
      interaction.reply({
        content: `Ping: ${stats.ping}ms | Guilds: ${stats.guilds}`,
        ephemeral: true
      });
    }
  });

  client.on('error', (err) => {
    monitor.recordError(err);
  });

  client.rest.on('rateLimited', (payload) => {
    monitor.recordRateLimit(payload);
  });
}

async function refreshSnapshots(client) {
  const guildData = client.guilds.cache
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount || 0,
      createdAt: guild.createdAt
    }))
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 5);

  monitor.updateGuildSnapshot(guildData);
}

function scheduleMetrics(client) {
  setInterval(() => {
    monitor.updatePing(client.ws.ping);
  }, 5000).unref();

  setInterval(() => {
    refreshSnapshots(client);
  }, 30000).unref();
}

async function startBot(token) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
  });

  registerListeners(client);

  await client.login(token);
  await refreshSnapshots(client);
  scheduleMetrics(client);

  return client;
}

module.exports = {
  startBot
};
