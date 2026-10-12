const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOverview } = require('./data');

test('overview calculates budget and incremental value from recommended decisions', () => {
  const overview = buildOverview();
  assert.equal(overview.interventionCount, 4);
  assert.equal(overview.committedBudget, 130000000);
  assert.equal(overview.remainingBudget, 720000000);
  assert.equal(overview.expectedIncrementalValue, 571000000);
  assert.equal(overview.expectedRoi, 4.39);
});
