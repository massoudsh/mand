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
const activationKeys = new Map();
const stateLabels = { draft: 'پیش‌نویس', queued: 'در صف', sending: 'در حال شبیه‌سازی', sent: 'شبیه‌سازی تأیید شد', failed: 'شبیه‌سازی ناموفق' };

function renderExplanation(value) {
  return `<details><summary>دلیل و محدودیت‌ها</summary><ul>${value.factors.map((factor) => `<li>${escape(factor)}</li>`).join('')}</ul><p>${escape(value.counterfactual)}</p><small>دادهٔ مصنوعی · اطمینان آماری محاسبه نشده</small></details>`;
}

function renderDecisions() {
  const visible = recommendedOnly ? decisions.filter((item) => item.status === 'recommended') : decisions;
  body.innerHTML = visible.map((item) => `
    <tr>
      <td><span class="person">${escape(item.name)}</span><span class="segment">${escape(item.segment)}</span></td>
      <td><span class="score ${item.riskScore >= .65 ? 'risk-high' : 'risk-low'}">${formatScore(item.riskScore)}</span></td>
      <td><span class="uplift">${formatScore(item.upliftScore)}</span></td>
      <td><span class="action ${item.status === 'holdout' ? 'none' : ''}">${item.status === 'holdout' ? 'بدون مداخله' : `${escape(item.channel)} · ${formatIrr(item.incentive)}`}</span></td>
      <td>${escape(item.timing)}</td><td class="reason">${renderExplanation(item.explanation)}</td>
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
      ${renderExplanation(segment.explanation)}
    </article>`).join('');
}

function renderCampaigns(campaigns) {
  document.querySelector('#campaigns').innerHTML = campaigns.map((campaign) => `
    <article class="campaign-card">
      <header><span class="pill ${campaign.state === 'sent' ? 'sent' : ''}">${escape(stateLabels[campaign.state] || campaign.state)}</span><span class="channel">${escape(campaign.channel)}</span></header>
      <h3>${escape(campaign.name)}</h3>
      <p>${escape(campaign.segment)} · ${formatCount(campaign.audience)} مخاطب · ${escape(campaign.sendAt)}</p>
      <div class="campaign-foot"><span>سقف ${formatIrr(campaign.budget)}</span><span>هزینه ${formatIrr(campaign.expectedCost)}</span></div>
      ${renderExplanation(campaign.explanation)}
      ${campaign.state === 'draft' ? `<button class="activate-campaign" data-campaign-id="${escape(campaign.id)}" type="button">تأیید شبیه‌سازی کمپین</button>` : `<div class="activated">${escape(stateLabels[campaign.state])} · بدون ارسال واقعی</div>`}
    </article>`).join('');
  document.querySelectorAll('.activate-campaign').forEach((button) => button.addEventListener('click', () => activateCampaign(button)));
}

async function activateCampaign(button) {
  const input = document.querySelector('#approver-key');
  const status = document.querySelector('#campaign-status');
  if (!input.value) { status.textContent = 'کلید مسئول تأیید لازم است.'; input.focus(); return; }
  if (!window.confirm('فقط شبیه‌سازی انجام می‌شود و پیامی ارسال نخواهد شد. تأیید می‌کنید؟')) return;
  const id = button.dataset.campaignId;
  if (!activationKeys.has(id)) activationKeys.set(id, crypto.randomUUID());
  button.disabled = true;
  try {
    const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}/activate`, {
      method: 'POST', headers: { Authorization: `Bearer ${input.value}`, 'Idempotency-Key': activationKeys.get(id) }
    });
    const result = await response.json();
    if (!response.ok) {
      const messages = { 401: 'کلید معتبر نیست.', 403: 'نقش مسئول تأیید لازم است.', 409: 'کمپین قبلاً تغییر کرده است.', 422: 'هزینه از سقف کمپین یا مشتری بیشتر است.' };
      throw new Error(messages[response.status] || result.error.message);
    }
    status.textContent = 'کمپین در صف شبیه‌سازی ثبت شد؛ برای وضعیت نهایی تازه‌سازی کنید.';
    renderCampaigns((await getJson('/api/campaigns')).campaigns);
  } catch (error) {
    status.textContent = error.message || 'ارتباط قطع شد؛ با همان درخواست دوباره تلاش کنید.';
  } finally {
    input.value = '';
    button.disabled = false;
  }
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
    <tr><td>${escape(gap.label)} ${gap.sourceType === 'estimated' ? '<span class="pill">برآورد تأییدنشده</span>' : ''}</td><td>${coverage(gap.ourScore)}</td><td>${coverage(gap.bestRivalScore)}</td>
    <td><span class="gap ${gap.gap ? 'open' : 'closed'}">${gap.gap ? `${number.format(gap.gap)} فاصله` : 'هم‌تراز'}</span></td></tr>`).join('');
  document.querySelector('#top-features').innerHTML = comparison.topFeatures.map((feature, index) => `
    <li><span class="rank">${number.format(index + 1)}</span><div><strong>${escape(feature.title)}</strong><p>${escape(feature.why)}</p></div><span class="pill sent">در اپ فعال شد</span></li>`).join('');
  document.querySelector('#priority-features').innerHTML = comparison.priorityFeatures.map((feature) => `
    <article class="priority-card"><header><span class="priority">${escape(feature.priority)}</span><span class="pill">در نقشه‌راه</span></header><h4>${escape(feature.title)}</h4><p>${escape(feature.reason)}</p><small>${escape(feature.value)}</small></article>`).join('');
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

document.querySelector('#refresh-campaigns').addEventListener('click', async () => {
  try { renderCampaigns((await getJson('/api/campaigns')).campaigns); }
  catch { document.querySelector('#campaign-status').textContent = 'دریافت وضعیت ناموفق بود؛ دوباره تلاش کنید.'; }
});
filter.addEventListener('click', () => { recommendedOnly = !recommendedOnly; renderDecisions(); });
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => showView(tab.dataset.view)));
load().catch(() => { body.innerHTML = '<tr><td colspan="6">بارگذاری داده با خطا روبه‌رو شد.</td></tr>'; });
