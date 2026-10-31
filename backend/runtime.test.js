const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { createStore } = require('./store');
const { createServer } = require('./server');
const { createDispatcher, FileAdapter } = require('./dispatch');
const { readConfig, authorize } = require('./config');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(__dirname, '../db/.test-'));
  const store = createStore(path.join(dir, 'test.sqlite'));
  store.run('migrate'); store.run('seed');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return store;
}
function sql(store, statement) {
  const result = spawnSync('python3', ['-c', 'import sqlite3,json,sys; d=sqlite3.connect(sys.argv[1]); r=d.execute(sys.argv[2]).fetchall(); d.commit(); print(json.dumps(r))', store.file, statement], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
const activate = (store, key = 'request-one', campaignId = 'cmp_3021', actor = 'test-approver') => store.run('activate', { key, campaignId, actor });

test('SQLite persistence, idempotency conflicts, budget boundaries and audit', (t) => {
  const store = fixture(t);
  store.run('migrate'); store.run('seed');
  assert.equal(store.run('campaigns').length, 3);
  assert.equal(activate(store, 'missing-key', 'missing').status, 404);
  sql(store, "UPDATE campaigns SET cap=39999999 WHERE id='cmp_3021'");
  assert.equal(activate(store).code, 'campaign_cap_exceeded');
  sql(store, "UPDATE campaigns SET cap=40000000 WHERE id='cmp_3021'");
  sql(store, 'UPDATE users SET cap=9999999');
  assert.equal(activate(store).code, 'customer_cap_exceeded');
  assert.equal(sql(store, 'SELECT count(*) FROM reservations')[0][0], 0);
  sql(store, 'UPDATE users SET cap=10000000');
  const first = activate(store);
  assert.equal(first.campaign.expectedCost, 40000000);
  assert.equal(first.campaign.state, 'queued');
  assert.deepEqual(activate(createStore(store.file)), first);
  assert.equal(activate(store, 'request-two').code, 'campaign_not_draft');
  assert.equal(activate(store, 'request-one', 'cmp_3022').code, 'idempotency_conflict');
  assert.equal(activate(store, 'request-one', 'cmp_3021', 'other').code, 'idempotency_conflict');
  assert.equal(activate(store, 'request-three', 'cmp_3022').code, 'customer_cap_exceeded');
  assert.equal(sql(store, 'SELECT count(*) FROM audit_log')[0][0], 1);
  assert.equal(sql(store, 'SELECT count(*) FROM reservations')[0][0], 4);
  assert.equal(sql(store, "SELECT count(*) FROM recipients WHERE status='skipped'")[0][0], 2);
  assert.throws(() => store.run('unknown'));
});

test('confirmed file adapter dispatch survives retries, restart and repeated dispatch', async (t) => {
  const store = fixture(t);
  activate(store);
  const adapter = new FileAdapter(store);
  assert.equal(adapter.ready(), true);
  let attempts = 0;
  const flaky = { async send(...args) { if (++attempts === 1) throw new Error('temporary'); return adapter.send(...args); } };
  const dispatcher = createDispatcher(store, flaky);
  await Promise.all([dispatcher.dispatch(), dispatcher.dispatch()]);
  await createDispatcher(createStore(store.file)).dispatch();
  const campaign = store.run('campaigns').find((c) => c.id === 'cmp_3021');
  assert.equal(campaign.state, 'sent');
  assert.equal(campaign.results.filter((r) => r.status === 'sent').length, 4);
  assert.equal(sql(store, 'SELECT count(*) FROM outbox')[0][0], 4);
  assert.equal(attempts, 5);
  const args = ['user', 'template', { idempotencyKey: 'fixed' }];
  assert.deepEqual(await adapter.send(...args), await adapter.send(...args));
});

test('partial delivery failure cannot be reported as sent', async (t) => {
  const store = fixture(t); activate(store);
  const adapter = new FileAdapter(store);
  await createDispatcher(store, { send(recipient, ...args) {
    return recipient === 'usr_1042' ? { status: 'sent' } : adapter.send(recipient, ...args);
  } }).dispatch();
  const campaign = store.run('campaigns').find((c) => c.id === 'cmp_3021');
  assert.equal(campaign.state, 'failed');
  assert.equal(campaign.results.find((r) => r.user_id === 'usr_1042').attempts, 3);
  assert.equal(campaign.results.filter((r) => r.status === 'sent').length, 3);
});

test('HTTP contracts: roles, concurrency, explanation, readiness and safe errors', async (t) => {
  const store = fixture(t);
  const config = readConfig({ MAND_APPROVER_KEY: 'a'.repeat(32), MAND_VIEWER_KEY: 'v'.repeat(32) });
  const server = createServer({ store, config, autoDispatch: false });
  t.after(() => { server.closeAllConnections(); server.close(); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (key, token = config.approverKey, id = 'cmp_3021') => fetch(`${base}/api/campaigns/${id}/activate`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, ...(key ? { 'Idempotency-Key': key } : {}) }
  });
  assert.equal((await post('test-key', '')).status, 401);
  assert.equal((await post('test-key', config.viewerKey)).status, 403);
  assert.equal((await post(null)).status, 400);
  assert.equal((await post('test-key', config.approverKey, 'missing')).status, 404);
  const responses = await Promise.all([post('same-key'), post('same-key')]);
  assert.deepEqual(await responses[0].json(), await responses[1].json());
  assert.equal((await post('other-key')).status, 409);
  assert.equal(sql(store, 'SELECT count(*) FROM audit_log')[0][0], 1);
  sql(store, "UPDATE campaigns SET cap=0 WHERE id='cmp_3022'");
  assert.equal((await post('over-key', config.approverKey, 'cmp_3022')).status, 422);
  for (const endpoint of ['overview', 'segments', 'campaigns']) {
    const response = await fetch(`${base}/api/${endpoint}`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('x-request-id'));
    const body = await response.json();
    for (const item of body.decisions || body.segments || body.campaigns) {
      assert.ok(Array.isArray(item.explanation.factors));
      assert.equal(typeof item.explanation.counterfactual, 'string');
      assert.equal(item.explanation.confidence, null);
    }
  }
  for (const route of ['/', '/app.js', '/styles.css', '/api/health', '/api/ready', '/api/comparison', '/api/report']) {
    assert.equal((await fetch(base + route)).status, 200);
  }
  const comparison = await (await fetch(base + '/api/comparison')).json();
  assert.ok(comparison.gaps.every((g) => g.sourceType === 'estimated' && g.sourceDate));
  assert.equal((await fetch(base + '/api/campaigns/%zz/activate', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/package.json')).status, 404);
  assert.equal((await fetch(base + '/api/health', { method: 'DELETE' })).status, 405);
  sql(store, 'DROP TABLE campaigns');
  assert.equal((await fetch(base + '/api/ready')).status, 503);
  const failure = await fetch(base + '/api/campaigns');
  assert.equal(failure.status, 500);
  assert.deepEqual(await failure.json(), { error: { code: 'dependency_unavailable', message: 'dependency unavailable' } });
  assert.equal((await fetch(base + '/api/health')).status, 200);
});

test('config validates unsafe and invalid deployment values', () => {
  assert.equal(readConfig({}).port, 3000);
  assert.equal(readConfig({ ENABLE_LIVE_SENDS: 'false' }).approverKey, '');
  for (const env of [{ PORT: '-1' }, { PORT: 'text' }, { PORT: '65536' }, { ENABLE_LIVE_SENDS: 'true' }, { MAND_APPROVER_KEY: 'short' }, { MAND_APPROVER_KEY: 'a'.repeat(32), MAND_VIEWER_KEY: 'a'.repeat(32) }]) assert.throws(() => readConfig(env));
  assert.equal(authorize(undefined, {}), null);
  assert.equal(authorize('Basic example', {}), null);
  assert.equal(authorize('Bearer incorrect', { approverKey: 'a'.repeat(32) }), null);
});
