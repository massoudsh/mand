const fs = require('node:fs');
const path = require('node:path');
const { explanation } = require('./explanation');

const radarPath = path.join(__dirname, '..', 'db', 'radar.json');
const PROVENANCE = { sourceType: 'market-scan', sourceDate: '2026-11-24', confidence: null };
const INTEGRATIONS = [
  { key: 'journey', feature: 'سازندهٔ سفر مشتری', endpoint: '/api/growth' },
  { key: 'omnichannel', feature: 'هاب اتصال کانال‌ها', endpoint: '/api/growth' },
  { key: 'loyalty', feature: 'کیف پول و بهینه‌سازی مشوق', endpoint: '/api/growth' },
  { key: 'experimentation', feature: 'مرکز آزمایش و سنجش افزایشی', endpoint: '/api/growth' },
  { key: 'timing', feature: 'بهترین زمان ارسال و سقف فرکانس', endpoint: '/api/growth' }
];
const EXISTING = [
  { key: 'personalization', feature: 'تصمیم شخصی‌سازی‌شدهٔ uplift (نسخهٔ ۰.۲.۰)' },
  { key: 'analytics', feature: 'گزارش مدیریتی و سگمنت‌بندی (نسخهٔ ۰.۲.۰)' },
  { key: 'predict', feature: 'امتیاز ریزش و uplift در موتور تصمیم' }
];
const ROADMAP = [{ key: 'crm', feature: 'تایم‌لاین تماس و خدمات' }];

function loadRadar() {
  return JSON.parse(fs.readFileSync(radarPath, 'utf8'));
}

function featureRanking(radar, integrations = INTEGRATIONS) {
  const integrated = new Map(integrations.map(({ key, feature }) => [key, feature]));
  const existing = new Map(EXISTING.map(({ key, feature }) => [key, feature]));
  const roadmap = new Map(ROADMAP.map(({ key, feature }) => [key, feature]));
  const labels = new Map(radar.featureCatalog.map(({ key, label }) => [key, label]));
  const counts = new Map();
  for (const rival of radar.rivals) {
    for (const feature of rival.features) {
      const entry = counts.get(feature) || { key: feature, label: labels.get(feature), rivalCount: 0, rivals: [] };
      entry.rivalCount += 1;
      entry.rivals.push(rival.name);
      counts.set(feature, entry);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.rivalCount - a.rivalCount || a.key.localeCompare(b.key))
    .map((entry, index) => {
      const status = integrated.has(entry.key) ? 'integrated' : existing.has(entry.key) ? 'existing' : roadmap.has(entry.key) ? 'roadmap' : 'not-covered';
      return {
        ...entry,
        rank: index + 1,
        status,
        mandFeature: integrated.get(entry.key) || existing.get(entry.key) || roadmap.get(entry.key) || null,
        ...PROVENANCE
      };
    });
}

function buildScan(radar = loadRadar(), integrations = INTEGRATIONS) {
  const labels = new Map(radar.featureCatalog.map(({ key, label }) => [key, label]));
  const ranking = featureRanking(radar, integrations);
  const selected = ranking.filter(({ status }) => status === 'integrated');
  return {
    asOf: radar.asOf,
    methodology: radar.methodology,
    selectionRationale: 'پنج قابلیت با بیشترین تکرار میان ده رقیب که ماند در نسخهٔ ۰.۲.۰ نداشت، در این نسخه پیاده شدند؛ شخصی‌سازی، تحلیل و پیش‌بینی از قبل وجود داشت و دوباره کلون نشدند.',
    rivals: radar.rivals.map((rival) => ({
      ...rival,
      featureLabels: rival.features.map((key) => labels.get(key)),
      ...PROVENANCE
    })),
    ranking,
    selected,
    integrations,
    topFeatureKeys: selected.map(({ key }) => key)
  };
}

function buildJourneys(radar = loadRadar()) {
  return radar.journeys.map((journey) => {
    let audience = journey.audience;
    let converted = 0;
    const steps = journey.steps.map((step) => {
      const reached = audience;
      const stepConversions = Math.round(reached * step.conversion);
      converted += stepConversions;
      return {
        ...step,
        reached,
        conversions: stepConversions,
        projectedRevenue: stepConversions * journey.avgOrder
      };
    });
    return {
      ...journey,
      steps,
      converted,
      conversionRate: Number((converted / journey.audience).toFixed(3)),
      projectedRevenue: steps.reduce((total, step) => total + step.projectedRevenue, 0),
      explanation: explanation(
        [`trigger: ${journey.trigger}`, `${journey.steps.length} مرحله با کانال ترکیبی`],
        'نرخ تبدیل هر مرحله سناریوی مصنوعی است؛ دادهٔ واقعی می‌تواند ترتیب و تعداد مراحل را تغییر دهد.'
      )
    };
  });
}

function buildConnectors(radar = loadRadar(), campaigns = []) {
  const mapped = radar.connectors.map((connector) => {
    const campaignIds = campaigns
      .filter((campaign) => connector.channels.some((channel) => String(campaign.channel).includes(channel)))
      .map(({ id }) => id);
    return { ...connector, campaignIds, active: campaignIds.length > 0 };
  });
  const uncovered = campaigns
    .filter((campaign) => !mapped.some(({ campaignIds }) => campaignIds.includes(campaign.id)))
    .map(({ id, channel }) => ({ id, channel }));
  return { connectors: mapped, uncovered, liveSends: false };
}

function normalCdf(value) {
  // Abramowitz-Stegun 7.1.26 approximation with absolute error below 1.5e-7.
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

function experimentResult(experiment) {
  const { control, treatment } = experiment;
  const pooled = (control.conversions + treatment.conversions) / (control.users + treatment.users);
  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / control.users + 1 / treatment.users));
  const controlRate = control.conversions / control.users;
  const treatmentRate = treatment.conversions / treatment.users;
  const zScore = standardError ? (treatmentRate - controlRate) / standardError : 0;
  const pValue = Number((2 * (1 - normalCdf(Math.abs(zScore)))).toFixed(4));
  const absoluteLift = treatmentRate - controlRate;
  const srmPValue = Number((2 * (1 - normalCdf(Math.abs(
    (control.users / (control.users + treatment.users) - 0.5) /
    Math.sqrt(0.25 * (1 / control.users + 1 / treatment.users) || 1)
  )))).toFixed(4));
  return {
    ...experiment,
    controlRate: Number(controlRate.toFixed(4)),
    treatmentRate: Number(treatmentRate.toFixed(4)),
    absoluteLift: Number(absoluteLift.toFixed(4)),
    relativeLift: Number((controlRate ? absoluteLift / controlRate : 0).toFixed(4)),
    zScore: Number(zScore.toFixed(2)),
    pValue,
    significant: pValue < 0.05,
    srmPValue,
    decision: !(pValue < 0.05) ? 'continue' : absoluteLift > 0 ? 'ship' : 'stop',
    ...PROVENANCE
  };
}

function buildExperiments(radar = loadRadar()) {
  const experiments = radar.experiments.map(experimentResult);
  return {
    experiments,
    significantCount: experiments.filter(({ significant }) => significant).length,
    warning: 'p-value فقط از نمونهٔ مصنوعی محاسبه شده است و جایگزین تصمیم آماری روی دادهٔ واقعی نیست.'
  };
}

function buildTiming(radar = loadRadar()) {
  const windows = new Map(radar.timing.windows.map((window) => [window.key, window]));
  const cap = radar.timing.capPerWeek;
  return {
    capPerWeek: cap,
    segments: radar.timing.segments.map((segment) => {
      const best = Object.entries(segment.openRates).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      const weeklySends = segment.recentSends.reduce((total, sends) => total + sends, 0);
      const contactRate = weeklySends / segment.audience;
      const suppressedShare = contactRate > cap ? Number((1 - cap / contactRate).toFixed(3)) : 0;
      return {
        segment: segment.segment,
        window: { key: best[0], label: windows.get(best[0]).label },
        openRate: best[1],
        projectedOpens: Math.round(segment.audience * best[1]),
        weeklySends,
        contactRate: Number(contactRate.toFixed(2)),
        capExceeded: contactRate > cap,
        suppressedShare,
        explanation: explanation(
          [segment.segment, `بهترین پنجره: ${windows.get(best[0]).label}`],
          suppressedShare ? `${Math.round(suppressedShare * 100)}٪ ارسال این هفته به‌دلیل سقف فرکانس حذف می‌شود.` : 'سقف فرکانس هفتگی رعایت شده است.'
        )
      };
    }),
    ...PROVENANCE
  };
}

function buildLoyalty(radar = loadRadar()) {
  const { budget, avgOrder, demand } = radar.loyalty.optimization;
  const ranked = radar.loyalty.rewards
    .map((reward) => ({ ...reward, ratio: reward.uplift * avgOrder / reward.cost }))
    .sort((a, b) => b.ratio - a.ratio);
  let remaining = budget;
  const allocation = ranked.map((reward) => {
    const affordable = Math.min(demand[reward.id] || 0, Math.floor(remaining / reward.cost));
    remaining -= affordable * reward.cost;
    return {
      ...reward,
      units: affordable,
      unmetDemand: (demand[reward.id] || 0) - affordable,
      spend: affordable * reward.cost,
      pointsRedeemed: affordable * reward.points,
      incrementalRevenue: Math.round(affordable * reward.uplift * avgOrder)
    };
  });
  const spend = allocation.reduce((total, item) => total + item.spend, 0);
  const incrementalRevenue = allocation.reduce((total, item) => total + item.incrementalRevenue, 0);
  return {
    tiers: radar.loyalty.tiers,
    rewards: radar.loyalty.rewards,
    allocation,
    budget,
    spend,
    remaining,
    incrementalRevenue,
    roi: spend ? Number((incrementalRevenue / spend).toFixed(2)) : null,
    explanation: explanation(
      ['اولویت تخصیص بر اساس uplift خالص به ازای هر ریال هزینه'],
      'ظرفیت و تقاضا سناریوی مصنوعی است؛ کمبود موجودی می‌تواند ترتیب تخصیص را تغییر دهد.'
    )
  };
}

function growthSnapshot(campaigns = []) {
  const radar = loadRadar();
  return {
    scan: buildScan(radar),
    journeys: buildJourneys(radar),
    connectors: buildConnectors(radar, campaigns),
    experiments: buildExperiments(radar),
    timing: buildTiming(radar),
    loyalty: buildLoyalty(radar)
  };
}

module.exports = {
  loadRadar, featureRanking, buildScan, buildJourneys, buildConnectors,
  buildExperiments, buildTiming, buildLoyalty, experimentResult, growthSnapshot
};
