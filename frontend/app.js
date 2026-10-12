const formatIrr = (value) => `${new Intl.NumberFormat('fa-IR').format(Math.round(value / 1000000))} میلیون ریال`;
const formatScore = (value) => `${new Intl.NumberFormat('fa-IR', { style: 'percent', maximumFractionDigits: 0 }).format(value)}`;
const body = document.querySelector('#decisions');
const filter = document.querySelector('#filter');
let decisions = [];
let recommendedOnly = false;

function render() {
  const visible = recommendedOnly ? decisions.filter((item) => item.status === 'recommended') : decisions;
  body.innerHTML = visible.map((item) => `
    <tr>
      <td><span class="person">${item.name}</span><span class="segment">${item.segment}</span></td>
      <td><span class="score ${item.riskScore >= .65 ? 'risk-high' : 'risk-low'}">${formatScore(item.riskScore)}</span></td>
      <td><span class="uplift">${formatScore(item.upliftScore)}</span></td>
      <td><span class="action ${item.status === 'holdout' ? 'none' : ''}">${item.status === 'holdout' ? 'بدون مداخله' : `${item.channel} · ${formatIrr(item.incentive)}`}</span></td>
      <td>${item.timing}</td><td class="reason">${item.reason}</td>
    </tr>`).join('');
  filter.textContent = recommendedOnly ? 'نمایش همه' : 'فقط پیشنهادها';
  filter.classList.toggle('active', recommendedOnly);
}

async function load() {
  const response = await fetch('/api/overview');
  if (!response.ok) throw new Error('داده دریافت نشد');
  const overview = await response.json();
  document.querySelector('#value').textContent = formatIrr(overview.expectedIncrementalValue);
  document.querySelector('#roi').textContent = `${overview.expectedRoi}×`;
  document.querySelector('#budget').textContent = formatIrr(overview.committedBudget);
  document.querySelector('#remaining').textContent = `${formatIrr(overview.remainingBudget)} باقی‌مانده`;
  document.querySelector('#interventions').textContent = new Intl.NumberFormat('fa-IR').format(overview.interventionCount);
  decisions = overview.decisions;
  render();
}

filter.addEventListener('click', () => { recommendedOnly = !recommendedOnly; render(); });
load().catch(() => { body.innerHTML = '<tr><td colspan="6">بارگذاری داده با خطا روبه‌رو شد.</td></tr>'; });
