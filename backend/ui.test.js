const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildComparison } = require('./market');

test('comparison renders estimated disclaimers and explanation escapes markup without a browser', () => {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', addEventListener() {}, classList: { toggle() {} } });
    return elements.get(id);
  };
  const context = vm.createContext({
    Intl, Map, crypto: { randomUUID: () => 'demo-key' },
    document: { querySelector: element, querySelectorAll: () => [] },
    fetch: async () => ({ ok: false })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8'), context);
  context.comparison = buildComparison();
  vm.runInContext('renderComparison(comparison)', context);
  assert.equal((element('#comparison').innerHTML.match(/برآورد تأییدنشده/g) || []).length, 8);
  context.value = { factors: ['<script>alert(1)</script>'], counterfactual: '<img>' };
  const html = vm.runInContext('renderExplanation(value)', context);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;img&gt;'));
  assert.ok(html.includes('اطمینان آماری محاسبه نشده'));
});
