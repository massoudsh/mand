const { createHash, timingSafeEqual } = require('node:crypto');

function readConfig(env = process.env) {
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  if (env.ENABLE_LIVE_SENDS && env.ENABLE_LIVE_SENDS !== 'false') throw new Error('Live sending is not supported; use ENABLE_LIVE_SENDS=false');
  const approverKey = env.MAND_APPROVER_KEY || '';
  const viewerKey = env.MAND_VIEWER_KEY || '';
  for (const key of [approverKey, viewerKey]) {
    if (key && key.length < 32) throw new Error('Configured API keys must contain at least 32 characters');
  }
  if (approverKey && approverKey === viewerKey) throw new Error('Role keys must be different');
  return { port, approverKey, viewerKey, dbPath: env.MAND_DB_PATH };
}

function authorize(header, config) {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const hash = (value) => createHash('sha256').update(value).digest();
  for (const role of ['approver', 'viewer']) {
    const key = config[`${role}Key`];
    if (key && token && timingSafeEqual(hash(token), hash(key))) {
      return { role, actor: `${role}:${hash(token).toString('hex').slice(0, 16)}` };
    }
  }
  return null;
}

module.exports = { readConfig, authorize };
