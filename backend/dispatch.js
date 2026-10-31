const { createHash } = require('node:crypto');

class FileAdapter {
  constructor(store) { this.store = store; }
  async send(recipient, template, metadata) {
    return this.store.run('receipt', {
      key: metadata.idempotencyKey,
      providerId: `simulation-${createHash('sha256').update(metadata.idempotencyKey).digest('hex').slice(0, 24)}`,
      payload: { recipient, template, mode: 'simulation' }
    });
  }
  ready() { this.store.run('ready'); return true; }
}

function createDispatcher(store, adapter = new FileAdapter(store)) {
  let running;
  async function work() {
    for (const recipient of store.run('pending')) {
      const metadata = { idempotencyKey: `${recipient.campaign_id}:${recipient.user_id}` };
      for (let attempt = recipient.attempts; attempt < 3; attempt++) {
        let result;
        try {
          result = await adapter.send(recipient.user_id, JSON.parse(recipient.data).name, metadata);
        } catch {
          result = { status: 'failed', error: 'adapter_unavailable' };
        }
        const confirmed = result?.status === 'sent' && typeof result.providerId === 'string' && result.providerId.length > 0;
        const final = confirmed || attempt === 2;
        store.run('result', {
          campaignId: recipient.campaign_id, userId: recipient.user_id,
          result: { status: confirmed ? 'sent' : final ? 'failed' : 'pending', providerId: confirmed ? result.providerId : null, error: confirmed ? null : 'delivery_unconfirmed' }
        });
        if (final) break;
      }
    }
    store.run('finish');
  }
  return {
    adapter,
    dispatch() {
      if (!running) running = work().finally(() => { running = null; });
      return running;
    }
  };
}

module.exports = { FileAdapter, createDispatcher };
