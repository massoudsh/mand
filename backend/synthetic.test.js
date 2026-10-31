const test = require('node:test');
const assert = require('node:assert/strict');
const { generate, estimate, validateRecovery } = require('./synthetic');

test('randomized benchmark recovers positive and negative uplift within three percentage points', () => {
  for (const seed of [42, 51, 127]) {
    const rows = generate({ users: 40000, seed });
    assert.equal(validateRecovery(rows, estimate(rows)), true);
  }
});

test('determinism, configurable uplift, missing arms and systematic bias', () => {
  assert.deepEqual(generate({ users: 100 }), generate({ users: 100 }));
  const rows = generate();
  const estimates = estimate(rows);
  assert.throws(() => validateRecovery(rows, { ...estimates, sleeping_dog: 0.2 }));
  assert.throws(() => validateRecovery(rows, {}));
  assert.equal(estimate([{ segment: 'only', treatment: false, outcome: 1 }]).only, null);
  const custom = generate({ segments: { test: { baseline: 0.3, uplift: 0.4 } } });
  assert.equal(validateRecovery(custom, estimate(custom)), true);
  for (const options of [{ users: 0 }, { seed: 0.1 }, { segments: {} }, { segments: { a: { baseline: 0.9, uplift: 0.9 } } }, { segments: { a: { baseline: -1, uplift: 0 } } }]) assert.throws(() => generate(options));
});
