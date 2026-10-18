const fs = require('node:fs');
const path = require('node:path');

const featuresPath = path.join(__dirname, '..', 'db', 'features.json');
const featureStore = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));

function loadFeatures() {
  return JSON.parse(JSON.stringify(featureStore));
}

function buildSegments(features = featureStore) {
  return features.segments.map((segment) => ({
    ...segment,
    riskBand: segment.risk >= 0.7 ? 'high' : segment.risk >= 0.4 ? 'medium' : 'low'
  }));
}

function buildCampaigns(features = featureStore) {
  return features.campaigns.map((campaign) => ({
    ...campaign,
    roi: Number((campaign.expectedRevenue / campaign.budget).toFixed(2))
  }));
}

function buildReport(features = featureStore) {
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

function activateCampaign(campaignId) {
  const campaign = featureStore.campaigns.find(({ id }) => id === campaignId);
  if (!campaign) return { error: 'campaign_not_found' };
  if (campaign.state !== 'draft') return { error: 'campaign_not_draft', campaign: buildCampaigns().find(({ id }) => id === campaignId) };
  campaign.state = 'active';
  campaign.activatedAt = new Date().toISOString();
  return { campaign: buildCampaigns().find(({ id }) => id === campaignId) };
}

module.exports = { activateCampaign, buildSegments, buildCampaigns, buildReport, loadFeatures };
