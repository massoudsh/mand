function generate({ users = 10000, seed = 42, segments = { persuadable: { baseline: 0.3, uplift: 0.15 }, sleeping_dog: { baseline: 0.6, uplift: -0.15 } } } = {}) {
  if (!Number.isInteger(users) || users < 4 || users > 1000000 || !Number.isInteger(seed)) throw new Error('Invalid users or seed');
  const entries = Object.entries(segments);
  if (!entries.length) throw new Error('Segments required');
  for (const [, { baseline, uplift }] of entries) {
    if (![baseline, uplift].every(Number.isFinite) || baseline < 0 || baseline > 1 || baseline + uplift < 0 || baseline + uplift > 1) throw new Error('Invalid probabilities');
  }
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  return Array.from({ length: users }, (_, index) => {
    const [segment, { baseline, uplift }] = entries[index % entries.length];
    const treatment = random() < 0.5;
    return { id: `synthetic-${index}`, segment, treatment, outcome: Number(random() < baseline + (treatment ? uplift : 0)), trueUplift: uplift };
  });
}

function estimate(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.segment)) groups.set(row.segment, { treated: 0, control: 0, treatedSuccess: 0, controlSuccess: 0 });
    const group = groups.get(row.segment);
    const arm = row.treatment ? 'treated' : 'control';
    group[arm]++;
    group[`${arm}Success`] += row.outcome;
  }
  return Object.fromEntries([...groups].map(([segment, g]) => [segment, g.treated && g.control ? g.treatedSuccess / g.treated - g.controlSuccess / g.control : null]));
}

function validateRecovery(rows, estimates, tolerance = 0.03) {
  for (const { segment, trueUplift } of rows) {
    if (!Number.isFinite(estimates[segment]) || Math.abs(estimates[segment] - trueUplift) > tolerance) throw new Error(`Recovery failed: ${segment}`);
  }
  return true;
}

if (require.main === module) {
  const fs = require('node:fs');
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === '--users') options.users = Number(args[i + 1]);
    else if (args[i] === '--seed') options.seed = Number(args[i + 1]);
    else if (args[i] === '--true-uplift') options.segments = JSON.parse(fs.readFileSync(args[i + 1], 'utf8'));
    else throw new Error('Unknown generator option');
  }
  process.stdout.write(JSON.stringify(generate(options)) + '\n');
}

module.exports = { generate, estimate, validateRecovery };
