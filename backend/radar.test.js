const test = require('node:test');
const assert = require('node:assert/strict');
const {
  loadRadar, featureRanking, buildScan, buildJourneys, buildConnectors,
  buildExperiments, buildTiming, buildLoyalty, experimentResult, growthSnapshot
} = require('./radar');

test('market scan ranks ten rivals and selects the five newly integrated features', () => {
  const radar = loadRadar();
  const scan = buildScan(radar);
  assert.equal(scan.rivals.length, 10);
  assert.equal(scan.rivals.filter(({ region }) => region === 'iran').length, 4);
  assert.ok(scan.rivals.every((rival) => rival.featureLabels.length === 5 && rival.sourceType === 'market-scan' && rival.confidence === null));
  assert.deepEqual(scan.selected.map(({ key }) => key).sort(), ['experimentation', 'journey', 'loyalty', 'omnichannel', 'timing']);
  assert.equal(scan.ranking.length, 9);
  assert.equal(scan.ranking[0].key, 'journey');
  assert.equal(scan.ranking[0].rivalCount, 10);
  assert.equal(scan.ranking.find(({ key }) => key === 'personalization').status, 'existing');
  assert.equal(scan.ranking.find(({ key }) => key === 'crm').status, 'roadmap');
  assert.equal(featureRanking(radar, []).every(({ status }) => status !== 'integrated'), true);
});

test('journey builder projects each step from the previous funnel', () => {
  const journeys = buildJourneys();
  const revival = journeys.find(({ id }) => id === 'jn_revival');
  assert.equal(revival.steps[0].reached, 9860);
  assert.equal(revival.steps[0].conversions, 1775);
  assert.equal(revival.steps[1].reached, 9860);
  assert.equal(revival.converted, 1775 + 1085 + 690);
  assert.equal(revival.projectedRevenue, (1775 + 1085 + 690) * 12000000);
  assert.ok(revival.conversionRate > 0 && revival.conversionRate < 1);
  assert.ok(revival.explanation.factors.length);
});

test('connector hub maps campaign channels and reports uncovered ones', () => {
  const campaigns = [
    { id: 'c1', channel: 'Push + SMS' },
    { id: 'c2', channel: 'WhatsApp' },
    { id: 'c3', channel: 'Fax' }
  ];
  const { connectors, uncovered, liveSends } = buildConnectors(loadRadar(), campaigns);
  assert.equal(connectors.length, 6);
  assert.deepEqual(connectors.find(({ id }) => id === 'push').campaignIds, ['c1']);
  assert.deepEqual(connectors.find(({ id }) => id === 'sms').campaignIds, ['c1']);
  assert.deepEqual(connectors.find(({ id }) => id === 'whatsapp').campaignIds, ['c2']);
  assert.equal(connectors.find(({ id }) => id === 'email').active, false);
  assert.deepEqual(uncovered, [{ id: 'c3', channel: 'Fax' }]);
  assert.equal(liveSends, false);
});

test('experiment centre decides ship, stop and continue with statistical output', () => {
  const { experiments, significantCount } = buildExperiments();
  const [cashback, extraMessage, evening] = experiments;
  assert.equal(cashback.decision, 'ship');
  assert.equal(extraMessage.decision, 'stop');
  assert.equal(evening.decision, 'continue');
  assert.ok(cashback.absoluteLift > 0 && extraMessage.absoluteLift < 0);
  assert.equal(significantCount, 2);
  assert.ok(experiments.every((item) => item.pValue >= 0 && item.pValue <= 1 && item.srmPValue >= 0 && item.sourceType === 'market-scan'));
  const empty = experimentResult({ control: { users: 10, conversions: 0 }, treatment: { users: 10, conversions: 0 } });
  assert.equal(empty.zScore, 0);
  assert.equal(empty.pValue, 1);
  assert.equal(empty.relativeLift, 0);
});

test('timing engine picks the best window and enforces the weekly frequency cap', () => {
  const timing = buildTiming();
  const dormant = timing.segments.find(({ segment }) => segment === 'خاموشِ بازگشتی');
  const promising = timing.segments.find(({ segment }) => segment === 'فعالِ فرصت‌پذیر');
  assert.equal(timing.capPerWeek, 2);
  assert.equal(dormant.window.key, 'night');
  assert.equal(dormant.capExceeded, true);
  assert.ok(dormant.suppressedShare > 0 && dormant.suppressedShare < 1);
  assert.equal(dormant.projectedOpens, Math.round(9860 * 0.33));
  assert.equal(promising.capExceeded, false);
  assert.equal(promising.suppressedShare, 0);
  assert.ok(dormant.explanation.counterfactual.includes('سقف فرکانس'));
});

test('loyalty allocator spends within budget by uplift per rial', () => {
  const loyalty = buildLoyalty();
  assert.ok(loyalty.spend <= loyalty.budget);
  assert.equal(loyalty.spend + loyalty.remaining, loyalty.budget);
  assert.equal(loyalty.allocation.find(({ id }) => id === 'rw_content').units, 500);
  assert.ok(loyalty.allocation.find(({ id }) => id === 'rw_shipping').units === 0);
  assert.ok(loyalty.allocation.every((item) => item.unmetDemand >= 0 && item.spend === item.units * item.cost));
  assert.equal(loyalty.incrementalRevenue, loyalty.allocation.reduce((total, item) => total + item.incrementalRevenue, 0));
  assert.ok(loyalty.roi > 0);
  const empty = buildLoyalty({ ...loadRadar(), loyalty: { ...loadRadar().loyalty, rewards: [] } });
  assert.equal(empty.roi, null);
  assert.equal(empty.spend, 0);
});

test('growth snapshot combines all five integrations', () => {
  const snapshot = growthSnapshot([{ id: 'cmp_3021', channel: 'Push + SMS' }]);
  assert.deepEqual(Object.keys(snapshot), ['scan', 'journeys', 'connectors', 'experiments', 'timing', 'loyalty']);
  assert.equal(snapshot.connectors.connectors.find(({ id }) => id === 'sms').active, true);
});
