const { spawnSync } = require('node:child_process');
const path = require('node:path');

function createStore(file = path.join(__dirname, '../db/mand.sqlite')) {
  return {
    file,
    run(action, args = {}) {
      const result = spawnSync('python3', [path.join(__dirname, '../db/store.py'), file, action], {
        input: JSON.stringify(args), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024
      });
      if (result.status !== 0) throw new Error('Database operation failed');
      return JSON.parse(result.stdout);
    }
  };
}

if (require.main === module) {
  const action = process.argv[2];
  if (!['migrate', 'seed'].includes(action)) throw new Error('Use migrate or seed');
  createStore(process.env.MAND_DB_PATH).run(action);
  console.log(`Database ${action} completed`);
}

module.exports = { createStore };
