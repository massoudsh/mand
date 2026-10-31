function explanation(factors, counterfactual) {
  return { factors, counterfactual, confidence: null, sourceType: 'synthetic' };
}

function decisionExplanation(decision) {
  return explanation([decision.reason, `ریسک نمونه: ${Math.round(decision.riskScore * 100)}٪`],
    decision.status === 'recommended' ? 'بدون مداخله، اثر افزایشی فرضی کسب نمی‌شود؛ این ادعا با دادهٔ واقعی اعتبارسنجی نشده است.' : 'مداخله تنها پس از بررسی اثر خالص مثبت و مجوز سیاستی پیشنهاد می‌شود.');
}

module.exports = { explanation, decisionExplanation };
