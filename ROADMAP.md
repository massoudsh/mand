# نقشه راه ماند (Mand)

> این نقشه راه با milestoneها و issueهای گیت‌هاب همگام است.
> هر فاز یک [Epic] issue دارد که وضعیت کلی آن فاز را نشان می‌دهد.

## فاز ۰ — اکتشاف و Design Partner
`Milestone: Phase 0 — Discovery & Design Partner` · Epic: [#1](https://github.com/massoudsh/mand/issues/1)

هدف: اعتبارسنجی مسئله با یک design partner واقعی و آماده‌سازی داده.

- مصاحبه با تیم‌های Growth/CRM پلتفرم‌های مصرفی ایرانی ([#2](https://github.com/massoudsh/mand/issues/2))
- تعریف ICP و انتخاب کاندیدای design partner ([#3](https://github.com/massoudsh/mand/issues/3))
- امضای LOI با اولین design partner ([#4](https://github.com/massoudsh/mand/issues/4))
- ممیزی و آماده‌سازی داده design partner ([#5](https://github.com/massoudsh/mand/issues/5))

**خروجی:** یک design partner امضاشده + دیتاست آماده برای فاز ۱.

---

## فاز ۱ — MVP: هسته Uplift
`Milestone: Phase 1 — MVP: Uplift Core` · Epic: [#6](https://github.com/massoudsh/mand/issues/6)

هدف: ساخت اولین مدل uplift + churn baseline روی داده design partner، با یک pilot زنده.

- Pipeline استخراج و پاک‌سازی داده ([#7](https://github.com/massoudsh/mand/issues/7))
- مدل churn/risk پایه ([#8](https://github.com/massoudsh/mand/issues/8))
- مدل uplift اول — two-model / uplift tree ([#9](https://github.com/massoudsh/mand/issues/9))
- ارزیابی با Qini curve / uplift metrics ([#10](https://github.com/massoudsh/mand/issues/10))
- Dashboard حداقلی segment‌بندی ([#11](https://github.com/massoudsh/mand/issues/11))
- اجرای pilot زنده و اندازه‌گیری incremental effect ([#12](https://github.com/massoudsh/mand/issues/12))

**خروجی:** اثبات incremental uplift قابل‌اندازه‌گیری در یک pilot واقعی.

---

## فاز ۲ — موتور تصمیم و بهینه‌سازی چندکاناله
`Milestone: Phase 2 — Decision & Optimization Engine` · Epic: [#13](https://github.com/massoudsh/mand/issues/13)

هدف: عبور از «score» به «تصمیم» کامل — کانال، زمان، نوع، مقدار مشوق و **دلیل**. جزئیات معماری
هر موتور در [[concepts/engines]] (ویکی داخلی) و [[Engines]] (ویکی گیت‌هاب).

- Uplift Engine — مدل uplift چندگزینه‌ای (multi-treatment) — `#16`
- Optimization Engine — تخصیص بهینه بودجه با محدودیت کل (knapsack/LP روی uplift-per-cost) — `#17`
- Timing Engine — بهترین زمان ارسال (best-time-to-send) به ازای هر کاربر — `#18`
- Policy Engine — لایه قوانین کسب‌وکار (سقف فرکانس، سقف تخفیف، do-not-disturb) — `#19`
- **Explainability Engine** (جدید) — توضیح‌پذیری هر تصمیم/عدم‌مداخله برای اعتماد design partner — `#20`
- **Experimentation Engine — پایش مستمر** (جدید) — holdout خودکار + پایش Qini در production فراتر از ارزیابی یک‌باره #10 — `#21`
- Decision API — نقطه ورود واحد که موتورهای بالا را orchestrate می‌کند و به CRM/CDP مشتری وصل می‌شود — `#22`

> شماره‌های issueهای عملیاتی فاز ۲ در گیت‌هاب ثبت شده‌اند؛ برای جزئیات به issueهای #16 تا #22 مراجعه کنید.

**خروجی:** موتوری با خروجی «اکشن مشخص + دلیل»، نه فقط score.

---

## فاز ۳ — محصول SaaS چندمستأجری
`Milestone: Phase 3 — Multi-tenant SaaS Platform` · Epic: [#14](https://github.com/massoudsh/mand/issues/14)

هدف: تبدیل به محصول self-serve با onboarding استاندارد برای مشتریان جدید.

- معماری multi-tenant
- کانکتور به CRM/CDPهای رایج ایرانی
- Dashboard self-serve برای تعریف کمپین/بودجه
- سیستم billing و پلن‌بندی
- امنیت داده و انطباق
- onboarding ۲-۳ مشتری پرداختی فراتر از design partner اول

**خروجی:** محصولی نصب‌شدنی روی مشتری جدید بدون integration دستی سنگین.

---

## فاز ۴ — رشد و توسعه بازار
`Milestone: Phase 4 — Scale & Vertical Expansion` · Epic: [#15](https://github.com/massoudsh/mand/issues/15)

هدف: گسترش عمودی (مارکت‌پلیس، فین‌تک، محتوا) و بستن حلقه یادگیری.

- Closed-loop optimization (یادگیری خودکار از نتیجه هر مداخله)
- بسته‌های عمودی (vertical playbooks)
- بنچمارک صنعتی uplift/ROI
- گسترش تیم فروش/customer success
- بررسی گسترش منطقه‌ای

**خروجی:** لایه استاندارد تصمیم بودجه رشد در چند ورتیکال، با churn پایین مشتریان B2B.
