# Decision Engine

> معماری مفهومی موتور تصمیم ماند — هنوز طراحی/کد پیاده نشده (پروژه در فاز ۰).

## ورودی‌ها
- داده تراکنش/رفتار کاربر (recency, frequency, monetary, engagement)
- تاریخچه کمپین‌های قبلی (treatment/control واقعی یا شبه‌تصادفی) — برای آموزش مدل uplift
- کاتالوگ کانال‌ها (push, SMS, email, in-app) و مشوق‌ها (تخفیف, cashback, پیام ساده) + هزینه هرکدام
- محدودیت بودجه‌ی کلی کسب‌وکار

## لایه‌های موتور (roadmap-aligned)
1. **Risk layer** (فاز ۱) — churn/inactivity baseline
2. **Uplift layer** (فاز ۱) — تخمین CATE هر کاربر برای هر نوع مداخله ([[Uplift vs Churn]])
3. **Optimization layer** (فاز ۲) — تخصیص بهینه با محدودیت بودجه، انتخاب کانال و زمان‌بندی
4. **Policy layer** (فاز ۲) — قوانین کسب‌وکار روی خروجی مدل (سقف فرکانس پیام، سقف تخفیف)
5. **Explainability layer** (فاز ۲، جدید) — چرا این تصمیم/عدم‌مداخله گرفته شد
6. **Experimentation layer** (فاز ۱→۲) — holdout/control و ارزیابی/پایش Qini
7. **Decision API** (فاز ۲) — خروجی نهایی برای اتصال به CRM/CDP مشتری

جزئیات ورودی/خروجی/issue هر موتور مستقل: [[Engines]].

## خروجی نهایی
برای هر کاربر: `{intervene: bool, channel, incentive_type, incentive_amount, timing, reason}` یا
`no-action` صریح وقتی uplift مثبت/به‌صرفه نیست.

## وضعیت پیاده‌سازی
هیچ کد تولیدی هنوز نوشته نشده. فازبندی کامل: [[Roadmap]]؛ اپیک این لایه: issue #13.
