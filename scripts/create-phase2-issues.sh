#!/usr/bin/env bash
# Create the Phase 2 operational issues (Decision Engine breakdown) for
# massoudsh/mand, link them to Epic #13, and replace the #TBD-* placeholders
# in ROADMAP.md with the real issue numbers.
#
# Requires: `gh` CLI installed and authenticated (`gh auth login`) with
# write access to massoudsh/mand.
#
# Usage: ./scripts/create-phase2-issues.sh

set -euo pipefail

REPO="massoudsh/mand"
MILESTONE="Phase 2 — Decision & Optimization Engine"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROADMAP="$REPO_ROOT/ROADMAP.md"

command -v gh >/dev/null || { echo "ERROR: gh CLI not found. Install and run 'gh auth login' first." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "ERROR: gh is not authenticated. Run 'gh auth login' first." >&2; exit 1; }

create_issue() {
  local title="$1" body="$2" labels="$3"
  gh issue create --repo "$REPO" --title "$title" --body "$body" \
    --label "$labels" --milestone "$MILESTONE" | grep -oE '[0-9]+$'
}

echo "==> Creating Phase 2 operational issues..."

id_uplift_multi=$(create_issue \
  "Uplift Engine — مدل uplift چندگزینه‌ای (multi-treatment)" \
  $'گسترش مدل uplift تک‌مداخله‌ای (#9) به چندگزینه‌ای: تخمین CATE جداگانه برای هر نوع مداخله (push/SMS/تخفیف/cashback) تا موتور بتواند بهترین گزینه را برای هر کاربر انتخاب کند.\n\nجزئیات معماری: docs/gh-wiki/Engines.md.\n\nبخشی از اپیک فاز ۲ (#13).' \
  "phase:2-decision-engine,type:model")

id_optimization=$(create_issue \
  "Optimization Engine — تخصیص بهینه بودجه با محدودیت کل" \
  $'حل مسئله تخصیص بودجه بین کاربران (knapsack/LP روی uplift-per-cost) با سقف بودجه کلی کسب‌وکار. ورودی: uplift_score هر کاربر/مداخله + هزینه. خروجی: لیست کاربران انتخاب‌شده + مقدار مشوق.\n\nجزئیات: docs/gh-wiki/Engines.md.\n\nبخشی از اپیک فاز ۲ (#13).' \
  "phase:2-decision-engine,type:model")

id_timing=$(create_issue \
  "Timing Engine — بهترین زمان ارسال (best-time-to-send)" \
  $'تعیین بهترین timestamp ارسال به ازای هر کاربر بر اساس تاریخچه engagement زمانی.\n\nجزئیات: docs/gh-wiki/Engines.md.\n\nبخشی از اپیک فاز ۲ (#13).' \
  "phase:2-decision-engine,type:model")

id_policy=$(create_issue \
  "Policy Engine — لایه قوانین کسب‌وکار (guardrails)" \
  $'اعمال قوانین کسب‌وکار مشتری روی خروجی موتورهای مدل: سقف فرکانس پیام، سقف تخفیف، do-not-disturb. باید همیشه بر خروجی مدل اولویت داشته باشد.\n\nجزئیات: docs/gh-wiki/Engines.md.\n\nبخشی از اپیک فاز ۲ (#13).' \
  "phase:2-decision-engine,type:infra")

id_explainability=$(create_issue \
  "Explainability Engine — توضیح‌پذیری هر تصمیم (feature جدید)" \
  $'موتور جدید (اضافه‌شده در بازبینی ۱۴۰۵/۰۵/۲۵): تولید یک توضیح انسان‌خوان (feature attribution) برای هر تصمیم یا عدم‌مداخله. حیاتی برای اعتماد design partner — بدون آن مشتری فقط یک عدد می‌بیند، نه دلیل.\n\nخروجی: فیلد `reason` در Decision API.\n\nجزئیات: docs/gh-wiki/Engines.md.\n\nبخشی از اپیک فاز ۲ (#13).' \
  "phase:2-decision-engine,type:model")

id_experimentation=$(create_issue \
  "Experimentation Engine — پایش مستمر Qini در production (feature جدید)" \
  $'گسترش ارزیابی یک‌باره uplift (#10) به یک لایه مستقل: مدیریت خودکار گروه holdout/control و پایش مستمر Qini/AUUC در production برای تشخیص drift مدل.\n\nجزئیات: docs/gh-wiki/Engines.md.\n\nبخشی از اپیک فاز ۲ (#13).' \
  "phase:2-decision-engine,type:research")

id_decision_api=$(create_issue \
  "Decision API — orchestration نهایی موتورها" \
  $'نقطه ورود واحد که Risk/Uplift/Optimization/Timing/Policy/Explainability Engine را orchestrate می‌کند و خروجی نهایی `{intervene, channel, incentive_type, incentive_amount, timing, reason}` را برای اتصال به CRM/CDP مشتری برمی‌گرداند.\n\nجزئیات: docs/gh-wiki/Engines.md.\n\nبخشی از اپیک فاز ۲ (#13).' \
  "phase:2-decision-engine,type:infra")

echo "==> Created: uplift_multi=#$id_uplift_multi optimization=#$id_optimization timing=#$id_timing policy=#$id_policy explainability=#$id_explainability experimentation=#$id_experimentation decision_api=#$id_decision_api"

echo "==> Updating Epic #13 body with real issue numbers..."
gh issue edit 13 --repo "$REPO" --body "$(cat <<EOF
## فاز ۲ — موتور تصمیم و بهینه‌سازی چندکاناله

هدف: عبور از «score» به «تصمیم» کامل — کانال، زمان، نوع، مقدار مشوق و دلیل.

- [ ] Uplift Engine چندگزینه‌ای (#$id_uplift_multi)
- [ ] Optimization Engine — تخصیص بودجه (#$id_optimization)
- [ ] Timing Engine (#$id_timing)
- [ ] Policy Engine (#$id_policy)
- [ ] Explainability Engine (#$id_explainability)
- [ ] Experimentation Engine — پایش مستمر (#$id_experimentation)
- [ ] Decision API (#$id_decision_api)

جزئیات معماری: docs/gh-wiki/Engines.md و ویکی داخلی پروژه.
EOF
)"

echo "==> Patching ROADMAP.md placeholders..."
sed -i \
  -e "s/#TBD-uplift-multi/#$id_uplift_multi/" \
  -e "s/#TBD-optimization/#$id_optimization/" \
  -e "s/#TBD-timing/#$id_timing/" \
  -e "s/#TBD-policy/#$id_policy/" \
  -e "s/#TBD-explainability/#$id_explainability/" \
  -e "s/#TBD-experimentation/#$id_experimentation/" \
  -e "s/#TBD-decision-api/#$id_decision_api/" \
  "$ROADMAP"

cd "$REPO_ROOT"
git add ROADMAP.md
git commit -m "docs: link phase 2 roadmap to real issue numbers (#$id_uplift_multi-#$id_decision_api)"
git push origin main

echo "==> Done. Epic: https://github.com/$REPO/issues/13"
