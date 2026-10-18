const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSegments, buildCampaigns, buildReport } = require('./features');

test('segments carry a risk band derived from their risk score', () => {
  const segments = buildSegments();
  assert.equal(segments.length, 5);
  assert.equal(segments.find(({ id }) => id === 'champions').riskBand, 'low');
  assert.equal(segments.find(({ id }) => id === 'at-risk').riskBand, 'high');
});

test('campaigns expose expected ROI per budget unit', () => {
  const campaigns = buildCampaigns();
  assert.equal(campaigns.find(({ id }) => id === 'cmp_3019').roi, 4.11);
});

test('report compares each month with the previous one', () => {
  const report = buildReport();
  assert.equal(report.monthly[0].revenueGrowth, null);
  assert.equal(report.current.month, 'شهریور');
  assert.equal(report.monthly.at(-1).revenueGrowth, 11.7);
  assert.ok(report.totalRoi > 0);
});
