const os = require('os');

const MAX_SUSPICIOUS_EVENTS = 25;

const state = {
  startedAt: Date.now(),
  ping: 0,
  events: {},
  suspicious: [],
  errors: [],
  rateLimitHits: 0,
  lastDiscordFetch: null,
  guildSnapshot: [],
  system: {
    host: os.hostname(),
    platform: `${os.platform()} ${os.release()}`
  }
};

function recordEvent(type) {
  state.events[type] = (state.events[type] || 0) + 1;
  state.events.lastEventAt = Date.now();
}

function recordSuspicion(reason, context = {}) {
  state.suspicious.unshift({
    reason,
    context,
    at: new Date().toISOString()
  });
  if (state.suspicious.length > MAX_SUSPICIOUS_EVENTS) {
    state.suspicious.length = MAX_SUSPICIOUS_EVENTS;
  }
}

function recordError(error) {
  state.errors.unshift({
    message: error?.message || String(error),
    at: new Date().toISOString()
  });
  recordSuspicion('Discord API error', { message: error?.message });
  if (state.errors.length > 15) {
    state.errors.length = 15;
  }
}

function recordRateLimit(payload) {
  state.rateLimitHits += 1;
  recordSuspicion('Rate limit warning', {
    route: payload?.route,
    timeout: payload?.timeout
  });
}

function updatePing(ping) {
  state.ping = ping;
}

function updateGuildSnapshot(snapshot) {
  state.guildSnapshot = snapshot;
  state.lastDiscordFetch = Date.now();
}

function getHealthStatuses() {
  const statuses = [];
  if (state.ping > 250) {
    statuses.push({
      level: 'warning',
      message: `High latency detected (${state.ping}ms)`
    });
  }
  if (state.rateLimitHits > 3) {
    statuses.push({
      level: 'warning',
      message: 'Discord API rate limit exceeded frequently'
    });
  }
  if (state.errors.length > 5) {
    statuses.push({
      level: 'error',
      message: 'Numerous errors reported recently'
    });
  }
  if (!statuses.length) {
    statuses.push({
      level: 'ok',
      message: 'Everything looks normal'
    });
  }
  return statuses;
}

function getSnapshot(client) {
  const uptime = Date.now() - state.startedAt;
  const guildCollection = client?.guilds?.cache;
  const guildCount = guildCollection?.size || 0;
  const userCount = guildCollection
    ? guildCollection.reduce((acc, guild) => acc + (guild.memberCount || 0), 0)
    : 0;

  return {
    uptime,
    ping: state.ping,
    guilds: guildCount,
    userCount,
    events: state.events,
    suspicious: state.suspicious,
    errors: state.errors,
    statuses: getHealthStatuses(),
    lastDiscordFetch: state.lastDiscordFetch,
    guildSnapshot: state.guildSnapshot,
    rateLimitHits: state.rateLimitHits,
    system: state.system,
    timestamp: Date.now()
  };
}

module.exports = {
  recordEvent,
  recordSuspicion,
  recordError,
  recordRateLimit,
  updatePing,
  updateGuildSnapshot,
  getSnapshot
};
