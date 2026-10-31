const fs = require('node:fs');
const path = require('node:path');
const { explanation } = require('./explanation');

const featuresPath = path.join(__dirname, '..', 'db', 'features.json');
const featureStore = JSON.parse(fs.readFileSync(featuresPath, 'utf8'));

function buildSegments(features = featureStore) {
  return features.segments.map((segment) => ({
    ...segment,
    riskBand: segment.risk >= 0.7 ? 'high' : segment.risk >= 0.4 ? 'medium' : 'low',
    explanation: explanation([segment.label, 'سگمنت و ریسک از دادهٔ مصنوعی گرفته شده‌اند.'], 'تغییر رفتار واقعی می‌تواند عضویت سگمنت را تغییر دهد.')
  }));
}

function buildCampaigns(features = featureStore) {
  return features.campaigns.map((campaign) => ({
    ...campaign,
    roi: campaign.budget ? Number((campaign.expectedRevenue / campaign.budget).toFixed(2)) : null,
    explanation: explanation([campaign.segment, 'انتخاب مخاطب و هزینه در سرور بررسی می‌شود؛ ارسال فقط شبیه‌سازی است.'], 'بدون تأیید مسئول، هیچ مخاطبی وارد صف نمی‌شود.')
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

module.exports = { buildSegments, buildCampaigns, buildReport };
