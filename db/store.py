import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path


def execute(db, action, args):
    if action == 'migrate':
        db.executescript(Path(__file__).with_name('schema.sql').read_text())
        return {'version': 1}
    db.execute('BEGIN IMMEDIATE')
    if action == 'seed':
        root = Path(__file__).parent
        features = json.loads((root / 'features.json').read_text())
        seed = json.loads((root / 'seed.json').read_text())
        for segment in features['segments']:
            db.execute('INSERT OR IGNORE INTO segments VALUES (?,?)', (segment['id'], json.dumps(segment)))
        for user in seed['decisions']:
            db.execute('INSERT OR IGNORE INTO users VALUES (?,?,?,?)', (user['id'], user['segment'], int(user['status'] != 'recommended'), 100000000))
            db.execute('INSERT OR IGNORE INTO decisions VALUES (?,?)', (user['id'], json.dumps(user)))
        for campaign in features['campaigns']:
            db.execute('INSERT OR IGNORE INTO campaigns VALUES (?,?,?,?,?)', (campaign['id'], json.dumps(campaign), 'draft', 10000000, campaign['budget']))
            for user in seed['decisions']:
                db.execute('INSERT OR IGNORE INTO recipients(campaign_id,user_id) VALUES (?,?)', (campaign['id'], user['id']))
        db.execute('INSERT OR IGNORE INTO experiments VALUES (?,?)', ('demo-holdout', json.dumps({'synthetic': True})))
        return {'seeded': True}
    if action == 'ready':
        db.execute('SELECT count(*) FROM campaigns').fetchone()
        return {'status': 'ok'}
    if action in ('decisions', 'segments'):
        table = 'decisions' if action == 'decisions' else 'segments'
        return [json.loads(row['data']) for row in db.execute(f'SELECT data FROM {table} ORDER BY id')]
    if action == 'campaigns':
        result = []
        for row in db.execute('SELECT * FROM campaigns ORDER BY id'):
            campaign = json.loads(row['data'])
            eligible = db.execute('SELECT count(*) FROM recipients r JOIN users u ON u.id=r.user_id WHERE campaign_id=? AND u.holdout=0', (row['id'],)).fetchone()[0]
            campaign.update(state=row['state'], audience=eligible, expectedCost=eligible * row['unit_cost'], budget=row['cap'], mode='simulation')
            campaign['results'] = [dict(r) for r in db.execute('SELECT user_id,status,attempts,provider_id,error FROM recipients WHERE campaign_id=?', (row['id'],))]
            result.append(campaign)
        return result
    if action == 'activate':
        campaign_id, actor, key = args['campaignId'], args['actor'], args['key']
        existing = db.execute('SELECT * FROM activations WHERE key=?', (key,)).fetchone()
        if existing:
            if existing['actor'] != actor or existing['campaign_id'] != campaign_id:
                return {'status': 409, 'code': 'idempotency_conflict'}
            return json.loads(existing['response'])
        campaign = db.execute('SELECT * FROM campaigns WHERE id=?', (campaign_id,)).fetchone()
        if not campaign:
            return {'status': 404, 'code': 'campaign_not_found'}
        if campaign['state'] != 'draft':
            return {'status': 409, 'code': 'campaign_not_draft'}
        users = list(db.execute('SELECT u.* FROM users u JOIN recipients r ON r.user_id=u.id WHERE r.campaign_id=? AND u.holdout=0', (campaign_id,)))
        cost = len(users) * campaign['unit_cost']
        if cost > campaign['cap']:
            return {'status': 422, 'code': 'campaign_cap_exceeded'}
        for user in users:
            used = db.execute('SELECT coalesce(sum(cost),0) FROM reservations WHERE user_id=?', (user['id'],)).fetchone()[0]
            if used + campaign['unit_cost'] > user['cap']:
                return {'status': 422, 'code': 'customer_cap_exceeded'}
        for user in users:
            db.execute('INSERT INTO reservations VALUES (?,?,?)', (campaign_id, user['id'], campaign['unit_cost']))
        db.execute("UPDATE recipients SET status='skipped' WHERE campaign_id=? AND user_id IN (SELECT id FROM users WHERE holdout=1)", (campaign_id,))
        db.execute("UPDATE campaigns SET state='queued' WHERE id=?", (campaign_id,))
        db.execute('INSERT INTO audit_log(actor,campaign_id,event,timestamp) VALUES (?,?,?,?)', (actor, campaign_id, 'queued', datetime.now(timezone.utc).isoformat()))
        response = {'status': 200, 'campaign': {'id': campaign_id, 'state': 'queued', 'expectedCost': cost, 'mode': 'simulation'}}
        db.execute('INSERT INTO activations VALUES (?,?,?,?)', (key, campaign_id, actor, json.dumps(response)))
        return response
    if action == 'pending':
        db.execute("UPDATE campaigns SET state='sending' WHERE state='queued'")
        return [dict(row) for row in db.execute("SELECT r.*, c.data FROM recipients r JOIN campaigns c ON c.id=r.campaign_id JOIN users u ON u.id=r.user_id WHERE c.state='sending' AND u.holdout=0 AND r.status='pending'")]
    if action == 'receipt':
        existing = db.execute('SELECT provider_id FROM outbox WHERE key=?', (args['key'],)).fetchone()
        if not existing:
            db.execute('INSERT INTO outbox VALUES (?,?,?)', (args['key'], args['providerId'], json.dumps(args['payload'])))
        return {'status': 'sent', 'providerId': existing['provider_id'] if existing else args['providerId']}
    if action == 'result':
        result = args['result']
        db.execute('UPDATE recipients SET status=?, attempts=attempts+1, provider_id=?, error=? WHERE campaign_id=? AND user_id=? AND status=\'pending\'', (result['status'], result.get('providerId'), result.get('error'), args['campaignId'], args['userId']))
        return {'saved': True}
    if action == 'finish':
        db.execute("UPDATE campaigns SET state=CASE WHEN EXISTS(SELECT 1 FROM recipients WHERE campaign_id=campaigns.id AND status='failed') THEN 'failed' ELSE 'sent' END WHERE state='sending' AND NOT EXISTS(SELECT 1 FROM recipients WHERE campaign_id=campaigns.id AND status='pending')")
        return {'finished': True}
    raise ValueError('Unknown database operation')


def main():
    db = sqlite3.connect(sys.argv[1], timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    try:
        result = execute(db, sys.argv[2], json.load(sys.stdin))
        db.commit()
        print(json.dumps(result))
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    main()
