const test = require('node:test');
const assert = require('node:assert/strict');
const { buildComparison } = require('./market');

test('comparison scores every criterion against the strongest rival', () => {
  const { gaps, openGapCount, topFeatures } = buildComparison();
  assert.equal(gaps.length, 8);
  const campaign = gaps.find(({ key }) => key === 'campaign');
  assert.deepEqual([campaign.ourScore, campaign.bestRivalScore, campaign.gap], [1, 3, 2]);
  assert.equal(openGapCount, 5);
  assert.equal(topFeatures.length, 3);
  assert.equal(gaps.filter(({ gap }) => gap > 0).length, openGapCount);
});
