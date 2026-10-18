const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { buildOverview } = require('./data');
const { buildComparison } = require('./market');
const { buildSegments, buildCampaigns, buildReport } = require('./features');

const frontendDir = path.join(__dirname, '..', 'frontend');
const contentTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function serveFile(response, requestedPath) {
  const fileName = requestedPath === '/' ? 'index.html' : requestedPath.slice(1);
  const filePath = path.resolve(frontendDir, fileName);
  if (!filePath.startsWith(`${frontendDir}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

function createServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/api/overview') return sendJson(response, 200, buildOverview());
    if (request.method === 'GET' && url.pathname === '/api/health') return sendJson(response, 200, { status: 'ok' });
    if (request.method === 'GET' && url.pathname === '/api/comparison') return sendJson(response, 200, buildComparison());
    if (request.method === 'GET' && url.pathname === '/api/segments') return sendJson(response, 200, { segments: buildSegments() });
    if (request.method === 'GET' && url.pathname === '/api/campaigns') return sendJson(response, 200, { campaigns: buildCampaigns() });
    if (request.method === 'GET' && url.pathname === '/api/report') return sendJson(response, 200, buildReport());
    if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
    return serveFile(response, url.pathname);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log(`Mand is running on port ${port}`));
}

module.exports = { createServer };
