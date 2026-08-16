# Engines (موتورهای ماند)

> تجزیه‌ی [[Decision Engine]] به زیرسیستم‌های مستقل و قابل‌تست — سبک خانه (house style) ماند،
> مشابه سایر پروژه‌های ماند (الگوی vafa-copilot: منطق خالص + API نازک + تست واحد).

## جدول موتورها

| موتور | هدف | ورودی | خروجی | فاز | وضعیت/issue |
|---|---|---|---|---|---|
| Risk Engine | تخمین احتمال churn/inactivity به‌عنوان baseline | رفتار و تراکنش کاربر | `risk_score ∈ [0,1]` | ۱ | #8 |
| Uplift Engine | تخمین CATE هر کاربر برای هر نوع مداخله (two-model/uplift tree → چندگزینه‌ای) | رفتار کاربر + تاریخچه treatment/control | `uplift_score` به ازای هر treatment | ۱→۲ | تک‌مداخله #9، چندگزینه‌ای در حال ثبت |
| Experimentation Engine | مدیریت گروه کنترل/آزمایش + ارزیابی Qini/AUUC + پایش مستمر در production | لاگ مداخلات و نتیجه واقعی | متریک Qini/AUUC، لیست holdout | ۱→۲ | ارزیابی اولیه #10، پایش مستمر در حال ثبت |
| Optimization Engine | تخصیص بهینه بودجه بین کاربران با محدودیت بودجه کل (knapsack/LP روی uplift-per-cost) | uplift_score + هزینه هر incentive + سقف بودجه | لیست کاربران انتخاب‌شده + مقدار مشوق هرکدام | ۲ | در حال ثبت |
| Timing Engine | تعیین بهترین زمان ارسال (best-time-to-send) به ازای هر کاربر | تاریخچه engagement زمانی کاربر | timestamp پیشنهادی ارسال | ۲ | در حال ثبت |
| Policy Engine | اعمال قوانین کسب‌وکار روی خروجی مدل‌ها (سقف فرکانس پیام، سقف تخفیف، do-not-disturb) | خروجی موتورهای بالا + قوانین تعریف‌شده مشتری | تصمیم نهایی فیلترشده | ۲ | در حال ثبت |
| **Explainability Engine** (جدید) | توضیح انسان‌خوان چرا یک تصمیم (یا عدم مداخله) گرفته شد | خروجی سایر موتورها | فیلد `reason` قابل‌خواندن برای هر تصمیم | ۲ | در حال ثبت |
| Decision API | نقطه ورود واحد که موتورهای بالا را orchestrate می‌کند | درخواست تصمیم برای یک/چند کاربر | `{intervene, channel, incentive_type, incentive_amount, timing, reason}` | ۲ | در حال ثبت |
| Connector Engine | آداپتور اتصال به CRM/CDPهای رایج ایرانی برای اجرای خودکار تصمیم | خروجی Decision API | فراخوانی API مشتری (push/SMS/...) | ۳ | هنوز issue ندارد |
| Feedback Loop Engine | یادگیری خودکار از نتیجه واقعی هر مداخله برای بازآموزی مدل‌ها (closed-loop) | نتیجه واقعی کاربران پس از تصمیم | داده training به‌روزشده | ۴ | هنوز issue ندارد |

## چرا Explainability و Experimentation موتور مستقل شدند
- بدون توضیح‌پذیری، design partner فاز ۰-۱ نمی‌تواند به تصمیم مدل (به‌خصوص «عدم مداخله») اعتماد
  کند — ریسک مستقیم روی [[Business Model]] (سوییچینگ‌کاست پایین بدون اعتماد).
- بدون پایش مستمر Qini در production، drift مدل uplift بی‌صدا اتفاق می‌افتد — ارزیابی یک‌باره
  issue #10 کافی نیست.

## پیاده‌سازی
هر موتور: تابع/کلاس خالص در `engine/` + تست واحد edge case + یک API نازک روی آن.
منبع این جدول: `docs/gh-wiki/Engines.md` در ریپو اصلی (sync via `scripts/push-gh-wiki.sh`).
