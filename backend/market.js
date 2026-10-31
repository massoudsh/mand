const fs = require('node:fs');
const path = require('node:path');

const marketPath = path.join(__dirname, '..', 'db', 'market.json');
const APP_MARKET_INDEX = 3;

function loadMarket() {
  return JSON.parse(fs.readFileSync(marketPath, 'utf8'));
}

function buildComparison(market = loadMarket()) {
  const app = market.rivals[APP_MARKET_INDEX];
  const rivals = market.rivals.slice(0, APP_MARKET_INDEX);
  const provenance = { sourceType: 'estimated', sourceDate: '2026-10-18', confidence: null };
  const gaps = market.criteria.map((criterion) => {
    const bestRivalScore = Math.max(...rivals.map((rival) => rival.coverage[criterion.key]));
    const ourScore = app.coverage[criterion.key];
    return { ...criterion, ...provenance, ourScore, bestRivalScore, gap: Math.max(0, bestRivalScore - ourScore) };
  });

  return {
    asOf: market.asOf,
    criteria: market.criteria,
    rivals: market.rivals.map((rival) => ({ ...rival, ...provenance })),
    gaps,
    openGapCount: gaps.filter(({ gap }) => gap > 0).length,
    topFeatures: market.topFeatures,
    priorityFeatures: market.priorityFeatures
  };
}

module.exports = { buildComparison, loadMarket };
