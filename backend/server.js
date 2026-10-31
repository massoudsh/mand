const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { buildOverview, loadSeed } = require('./data');
const { buildComparison } = require('./market');
const { buildSegments, buildCampaigns, buildReport } = require('./features');
const { createStore } = require('./store');
const { createDispatcher } = require('./dispatch');
const { readConfig, authorize } = require('./config');

const frontendDir = path.join(__dirname, '..', 'frontend');
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'application/javascript'], '/styles.css': ['styles.css', 'text/css'] };

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

function failure(response, status, code) {
  return sendJson(response, status, { error: { code, message: code.replaceAll('_', ' ') } });
}

function createServer({ config = readConfig(), store = createStore(config.dbPath), dispatcher = createDispatcher(store), autoDispatch = true } = {}) {
  const server = http.createServer((request, response) => {
    response.setHeader('X-Request-Id', randomUUID());
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET') {
        if (url.pathname === '/api/health') return sendJson(response, 200, { status: 'ok' });
        if (url.pathname === '/api/ready') {
          store.run('ready');
          if (!dispatcher.adapter.ready()) throw new Error('Adapter unavailable');
          return sendJson(response, 200, { status: 'ok', mode: 'simulation' });
        }
        if (url.pathname === '/api/overview') return sendJson(response, 200, buildOverview({ ...loadSeed(), decisions: store.run('decisions') }));
        if (url.pathname === '/api/comparison') return sendJson(response, 200, buildComparison());
        if (url.pathname === '/api/segments') return sendJson(response, 200, { segments: buildSegments({ segments: store.run('segments') }) });
        if (url.pathname === '/api/campaigns') return sendJson(response, 200, { campaigns: buildCampaigns({ campaigns: store.run('campaigns') }) });
        if (url.pathname === '/api/report') return sendJson(response, 200, buildReport());
        if (files[url.pathname]) {
          const [file, type] = files[url.pathname];
          const content = fs.readFileSync(path.join(frontendDir, file));
          response.writeHead(200, { 'content-type': `${type}; charset=utf-8` });
          return response.end(content);
        }
        return failure(response, 404, 'not_found');
      }
      const match = url.pathname.match(/^\/api\/campaigns\/([a-zA-Z0-9_-]+)\/activate$/);
      if (request.method !== 'POST' || !match) return failure(response, 405, 'method_not_allowed');
      const identity = authorize(request.headers.authorization, config);
      if (!identity) return failure(response, 401, 'authentication_required');
      if (identity.role !== 'approver') return failure(response, 403, 'approver_required');
      const key = request.headers['idempotency-key'];
      if (typeof key !== 'string' || !/^[\w-]{8,128}$/.test(key)) return failure(response, 400, 'idempotency_key_required');
      const result = store.run('activate', { campaignId: match[1], actor: identity.actor, key });
      if (result.code) return failure(response, result.status, result.code);
      return sendJson(response, result.status, { campaign: result.campaign });
    } catch {
      return failure(response, request.url === '/api/ready' ? 503 : 500, 'dependency_unavailable');
    }
  });
  if (autoDispatch) {
    const timer = setInterval(() => dispatcher.dispatch().catch(() => {}), 1000);
    timer.unref();
    server.once('close', () => clearInterval(timer));
  }
  return server;
}

if (require.main === module) {
  const config = readConfig();
  const store = createStore(config.dbPath);
  store.run('migrate');
  store.run('seed');
  createServer({ config, store }).listen(config.port, () => console.log(`Mand simulation server on port ${config.port}`));
}

module.exports = { createServer };
