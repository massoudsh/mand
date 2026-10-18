const number = new Intl.NumberFormat('fa-IR');
const formatIrr = (value) => `${number.format(Math.round(value / 1000000))} میلیون ریال`;
const formatMillion = (value) => `${number.format(value)} م.ت`;
const formatScore = (value) => new Intl.NumberFormat('fa-IR', { style: 'percent', maximumFractionDigits: 0 }).format(value);
const formatCount = (value) => number.format(value);
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const body = document.querySelector('#decisions');
const filter = document.querySelector('#filter');
let decisions = [];
let recommendedOnly = false;

function renderDecisions() {
  const visible = recommendedOnly ? decisions.filter((item) => item.status === 'recommended') : decisions;
  body.innerHTML = visible.map((item) => `
    <tr>
      <td><span class="person">${escape(item.name)}</span><span class="segment">${escape(item.segment)}</span></td>
      <td><span class="score ${item.riskScore >= .65 ? 'risk-high' : 'risk-low'}">${formatScore(item.riskScore)}</span></td>
      <td><span class="uplift">${formatScore(item.upliftScore)}</span></td>
      <td><span class="action ${item.status === 'holdout' ? 'none' : ''}">${item.status === 'holdout' ? 'بدون مداخله' : `${escape(item.channel)} · ${formatIrr(item.incentive)}`}</span></td>
      <td>${escape(item.timing)}</td><td class="reason">${escape(item.reason)}</td>
    </tr>`).join('');
  filter.textContent = recommendedOnly ? 'نمایش همه' : 'فقط پیشنهادها';
  filter.classList.toggle('active', recommendedOnly);
}

function renderSegments(segments) {
  document.querySelector('#segments').innerHTML = segments.map((segment) => `
    <article class="segment-card ${escape(segment.tone)}">
      <p>${escape(segment.label)}</p>
      <strong>${formatCount(segment.count)}</strong>
      <small>${formatScore(segment.share)} از کاربران فعال</small>
      <dl><dt>ریسک</dt><dd>${formatScore(segment.risk)}</dd><dt>ارزش ۹۰ روزه</dt><dd>${formatIrr(segment.value)}</dd></dl>
    </article>`).join('');
}

function renderCampaigns(campaigns) {
  document.querySelector('#campaigns').innerHTML = campaigns.map((campaign) => `
    <article class="campaign-card">
      <header><span class="pill ${campaign.state === 'sent' ? 'sent' : ''}">${campaign.state === 'sent' ? 'ارسال‌شده' : 'پیش‌نویس'}</span><span class="channel">${escape(campaign.channel)}</span></header>
      <h3>${escape(campaign.name)}</h3>
      <p>${escape(campaign.segment)} · ${formatCount(campaign.audience)} مخاطب · ${escape(campaign.sendAt)}</p>
      <div class="campaign-foot"><span>بودجه ${formatMillion(campaign.budget / 1000000)}</span><span class="roi">بازده ${campaign.roi}×</span></div>
      ${campaign.state === 'draft' ? `<button class="activate-campaign" data-campaign-id="${escape(campaign.id)}" type="button">تأیید و اجرای کمپین</button>` : '<div class="activated">کمپین آمادهٔ اجراست</div>'}
    </article>`).join('');
  document.querySelectorAll('.activate-campaign').forEach((button) => button.addEventListener('click', () => activateCampaign(button)));
}

async function activateCampaign(button) {
  button.disabled = true;
  button.textContent = 'در حال ثبت…';
  const response = await fetch(`/api/campaigns/${encodeURIComponent(button.dataset.campaignId)}/activate`, { method: 'POST' });
  if (!response.ok) {
    button.disabled = false;
    button.textContent = response.status === 409 ? 'کمپین قبلاً فعال شده' : 'تلاش دوباره';
    return;
  }
  const campaigns = await getJson('/api/campaigns');
  renderCampaigns(campaigns.campaigns);
}

function renderReport(report) {
  document.querySelector('#report-summary').textContent = `بازده شش‌ماهه ${report.totalRoi}× · رشد ${report.current.revenueGrowth}٪ در ${report.current.month}`;
  document.querySelector('#report').innerHTML = report.monthly.map((month) => `
    <tr><td>${escape(month.month)}</td><td>${formatMillion(month.revenue)}</td><td>${formatMillion(month.committed)}</td><td class="uplift">${month.roi}×</td>
    <td>${month.revenueGrowth === null ? '—' : `${month.revenueGrowth > 0 ? '+' : ''}${month.revenueGrowth}٪`}</td></tr>`).join('');
  const peak = Math.max(...report.monthly.map(({ revenue }) => revenue));
  document.querySelector('#sparkline').innerHTML = report.monthly.map((month) => `
    <div class="bar"><span style="height:${Math.round((month.revenue / peak) * 100)}%"></span><small>${escape(month.month)}</small></div>`).join('');
}

function renderComparison(comparison) {
  document.querySelector('#as-of').textContent = comparison.asOf;
  document.querySelector('#gap-summary').textContent = `${number.format(comparison.openGapCount)} شکاف باز از ${number.format(comparison.criteria.length)} معیار`;
  document.querySelector('#comparison').innerHTML = comparison.gaps.map((gap) => `
    <tr><td>${escape(gap.label)}</td><td>${coverage(gap.ourScore)}</td><td>${coverage(gap.bestRivalScore)}</td>
    <td><span class="gap ${gap.gap ? 'open' : 'closed'}">${gap.gap ? `${number.format(gap.gap)} فاصله` : 'هم‌تراز'}</span></td></tr>`).join('');
  document.querySelector('#top-features').innerHTML = comparison.topFeatures.map((feature, index) => `
    <li><span class="rank">${number.format(index + 1)}</span><div><strong>${escape(feature.title)}</strong><p>${escape(feature.why)}</p></div><span class="pill sent">در اپ فعال شد</span></li>`).join('');
}

function coverage(score) {
  const dots = [1, 2, 3].map((level) => `<i class="dot ${level <= score ? 'full' : 'empty'}"></i>`).join('');
  return `<span class="coverage" aria-label="${score} از 3">${dots}</span>`;
}

function showView(view) {
  document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view));
  document.querySelectorAll('[data-view-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.viewPanel === view));
}

async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(path);
  return response.json();
}

async function load() {
  const [overview, segments, campaigns, report, comparison] = await Promise.all([
    getJson('/api/overview'), getJson('/api/segments'), getJson('/api/campaigns'), getJson('/api/report'), getJson('/api/comparison')
  ]);
  document.querySelector('#value').textContent = formatIrr(overview.expectedIncrementalValue);
  document.querySelector('#roi').textContent = `${overview.expectedRoi}×`;
  document.querySelector('#budget').textContent = formatIrr(overview.committedBudget);
  document.querySelector('#remaining').textContent = `${formatIrr(overview.remainingBudget)} باقی‌مانده`;
  document.querySelector('#interventions').textContent = formatCount(overview.interventionCount);
  decisions = overview.decisions;
  renderDecisions();
  renderSegments(segments.segments);
  renderCampaigns(campaigns.campaigns);
  renderReport(report);
  renderComparison(comparison);
}

filter.addEventListener('click', () => { recommendedOnly = !recommendedOnly; renderDecisions(); });
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => showView(tab.dataset.view)));
load().catch(() => { body.innerHTML = '<tr><td colspan="6">بارگذاری داده با خطا روبه‌رو شد.</td></tr>'; });
