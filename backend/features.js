const fs = require('node:fs');
const path = require('node:path');

const featuresPath = path.join(__dirname, '..', 'db', 'features.json');

function loadFeatures() {
  return JSON.parse(fs.readFileSync(featuresPath, 'utf8'));
}

function buildSegments(features = loadFeatures()) {
  return features.segments.map((segment) => ({
    ...segment,
    riskBand: segment.risk >= 0.7 ? 'high' : segment.risk >= 0.4 ? 'medium' : 'low'
  }));
}

function buildCampaigns(features = loadFeatures()) {
  return features.campaigns.map((campaign) => ({
    ...campaign,
    roi: Number((campaign.expectedRevenue / campaign.budget).toFixed(2))
  }));
}

function buildReport(features = loadFeatures()) {
  const monthly = features.monthly.map((month, index) => {
    const previous = features.monthly[index - 1];
    return {
      ...month,
      roi: Number((month.revenue / month.committed).toFixed(2)),
      revenueGrowth: previous ? Number((((month.revenue - previous.revenue) / previous.revenue) * 100).toFixed(1)) : null
    };
  });
  const current = monthly.at(-1);
  const committed = monthly.reduce((total, month) => total + month.committed, 0);
  const revenue = monthly.reduce((total, month) => total + month.revenue, 0);
  return { currency: 'میلیون تومان', monthly, current, totalRoi: Number((revenue / committed).toFixed(2)) };
}

module.exports = { buildSegments, buildCampaigns, buildReport, loadFeatures };
