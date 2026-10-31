const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const tests = fs.readdirSync(path.join(root, 'backend')).filter((file) => file.endsWith('.test.js')).map((file) => `backend/${file}`);
const result = spawnSync(process.execPath, ['--test', '--experimental-test-coverage', ...tests], { cwd: root, encoding: 'utf8' });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.status !== 0) process.exit(1);
const measured = new Map([...result.stdout.matchAll(/^# (backend\/\S+\.js)\s+\|\s+([\d.]+)/gm)].map((match) => [match[1], Number(match[2])]));
let lines = 0;
let covered = 0;
for (const file of fs.readdirSync(path.join(root, 'backend')).filter((file) => file.endsWith('.js') && !file.endsWith('.test.js'))) {
  const key = `backend/${file}`;
  const count = fs.readFileSync(path.join(root, key), 'utf8').trimEnd().split('\n').length;
  lines += count;
  covered += count * (measured.get(key) || 0) / 100;
}
const percentage = covered / lines * 100;
console.log(`Backend JavaScript line coverage: ${percentage.toFixed(2)}% (minimum 80%)`);
if (percentage < 80) process.exit(1);
