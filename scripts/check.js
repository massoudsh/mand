const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
for (const dir of ['backend', 'frontend', 'scripts']) {
  for (const file of fs.readdirSync(path.join(root, dir)).filter((name) => name.endsWith('.js'))) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, dir, file)], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(1);
  }
}
const python = spawnSync('python3', ['-c', 'import ast,pathlib; ast.parse(pathlib.Path("db/store.py").read_text())'], { cwd: root, stdio: 'inherit' });
if (python.status !== 0) process.exit(1);
for (const file of ['seed.json', 'features.json', 'market.json']) JSON.parse(fs.readFileSync(path.join(root, 'db', file), 'utf8'));
console.log('JavaScript, Python and JSON syntax checks passed');
