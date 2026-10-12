const fs = require('node:fs');
const path = require('node:path');

const seedPath = path.join(__dirname, '..', 'db', 'seed.json');

function loadSeed() {
  return JSON.parse(fs.readFileSync(seedPath, 'utf8'));
}

function buildOverview(seed = loadSeed()) {
  const recommended = seed.decisions.filter(({ status }) => status === 'recommended');
  const expectedIncrementalValue = recommended.reduce((total, item) => total + item.expectedValue, 0);
  const committedBudget = recommended.reduce((total, item) => total + item.incentive, 0);

  return {
    currency: seed.currency,
    budget: seed.budget,
    committedBudget,
    remainingBudget: seed.budget - committedBudget,
    expectedIncrementalValue,
    expectedRoi: Number((expectedIncrementalValue / committedBudget).toFixed(2)),
    interventionCount: recommended.length,
    holdoutCount: seed.decisions.filter(({ status }) => status === 'holdout').length,
    decisions: seed.decisions
  };
}

module.exports = { buildOverview, loadSeed };
