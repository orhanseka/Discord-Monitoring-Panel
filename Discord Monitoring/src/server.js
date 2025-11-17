const express = require('express');
const monitor = require('./monitor');

function authGuard(panelApiKey) {
  return (req, res, next) => {
    if (!panelApiKey) return next();
    const provided = req.headers['x-api-key'] || req.query.key;
    if (provided === panelApiKey) {
      return next();
    }
    return res.status(401).json({ error: 'Panel API key is invalid.' });
  };
}

const buildHtml = () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Status Bot - Discord Monitoring Panel</title>
  <style>
    :root {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background-color: #0f172a;
      color: #e2e8f0;
    }
    body {
      margin: 0;
      padding: 2rem;
    }
    h1 {
      margin-top: 0;
      color: #38bdf8;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .card {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 12px;
      padding: 1.2rem;
      box-shadow: 0 15px 30px rgba(15, 23, 42, 0.45);
    }
    .status-ok { color: #4ade80; }
    .status-warning { color: #facc15; }
    .status-error { color: #f87171; }
    .events-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 250px;
      overflow-y: auto;
    }
    .events-list li {
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      padding: 0.5rem 0;
      font-size: 0.95rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th, td {
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      padding: 0.4rem;
      text-align: left;
    }
    small {
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <h1>Status Bot Monitoring Panel</h1>
  <p>Track the Discord bot's health in real time.</p>
  <div id="status-grid" class="grid"></div>
  <div class="grid">
    <div class="card">
      <h2>Overview</h2>
      <p>Ping: <span id="ping">-</span> ms</p>
      <p>Guilds: <span id="guild-count">-</span></p>
      <p>Users: <span id="user-count">-</span></p>
      <p>Uptime: <span id="uptime">-</span></p>
    </div>
    <div class="card">
      <h2>Suspicious Activity</h2>
      <ul id="sus-list" class="events-list"></ul>
    </div>
    <div class="card">
      <h2>Errors</h2>
      <ul id="error-list" class="events-list"></ul>
    </div>
  </div>
  <div class="card">
    <h2>Guild Insights</h2>
    <table>
      <thead>
        <tr>
          <th>Guild</th>
          <th>Members</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody id="guild-table"></tbody>
    </table>
  </div>
  <script>
    const formatUptime = (ms) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return hours + "h " + minutes + "m " + seconds + "s";
    };

    const panelKey = new URLSearchParams(window.location.search).get('key');

    async function loadStats() {
      const statsUrl = panelKey ? \`/api/stats?key=\${encodeURIComponent(panelKey)}\` : '/api/stats';
      let data;
      try {
        const res = await fetch(statsUrl);
        data = await res.json();
      } catch (err) {
        const statusGrid = document.getElementById('status-grid');
        statusGrid.innerHTML = '<div class="card status-error"><h2>Status</h2><p>Panel API request failed.</p></div>';
        return;
      }
      document.getElementById('ping').textContent = data.ping;
      document.getElementById('guild-count').textContent = data.guilds;
      document.getElementById('user-count').textContent = data.userCount;
      document.getElementById('uptime').textContent = formatUptime(data.uptime);

      const statusGrid = document.getElementById('status-grid');
      statusGrid.innerHTML = '';
      (data.statuses || []).forEach((status) => {
        const div = document.createElement('div');
        div.className = 'card status-' + status.level;
        div.innerHTML = '<h2>Status</h2><p>' + status.message + '</p>';
        statusGrid.appendChild(div);
      });

      const susList = document.getElementById('sus-list');
      susList.innerHTML = '';
      (data.suspicious || []).forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = '<strong>' + item.reason + '</strong><br/><small>' + item.at + '</small>';
        susList.appendChild(li);
      });

      const errList = document.getElementById('error-list');
      errList.innerHTML = '';
      (data.errors || []).forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = item.message + '<br/><small>' + item.at + '</small>';
        errList.appendChild(li);
      });

      const guildTable = document.getElementById('guild-table');
      guildTable.innerHTML = '';
      (data.guildSnapshot || []).forEach((guild) => {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + guild.name + '</td>' +
                       '<td>' + guild.memberCount + '</td>' +
                       '<td>' + new Date(guild.createdAt).toLocaleDateString() + '</td>';
        guildTable.appendChild(tr);
      });
    }

    loadStats();
    setInterval(loadStats, 8000);
  </script>
</body>
</html>`;

async function startPanel({ port, panelApiKey, client }) {
  const app = express();

  app.get('/api/stats', authGuard(panelApiKey), (req, res) => {
    res.json(monitor.getSnapshot(client));
  });

  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buildHtml());
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Web panel is live at http://localhost:${port}.`);
      resolve(server);
    });
  });
}

module.exports = {
  startPanel
};
