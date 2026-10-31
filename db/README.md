# نمونه‌دادهٔ ماند

این پوشه لایهٔ دادهٔ MVP را نگه می‌دارد. داده‌ها مصنوعی‌اند، اما بر مبنای الگوهای متداول CRM/Retention طراحی شده‌اند: ارزش ۹۰روزه، احتمال churn، uplift تخمینی، هزینهٔ مشوق، و محدودیت‌های سیاستی.

- `seed.json`: دادهٔ قابل‌تکرار برای توسعه و دمو
- `schema.sql`: users، segments، decisions، campaigns، experiments، audit_log و جداول idempotency/رزرو/ارسال
- `store.py`: bridge تراکنشی Python/SQLite؛ فعال‌سازی با `BEGIN IMMEDIATE` و پارامترهای SQL
- `mand.sqlite`: فایل runtime خارج از Git؛ migration/seed از npm scripts در README ریشه
- تمام کمپین‌های seed در حالت draft شروع می‌شوند؛ چهار گیرندهٔ مجاز و دو گیرندهٔ غیرمداخله دارند. seed مجدد وضعیت قبلی را بازنویسی نمی‌کند.
- هیچ شناسه، شماره تماس یا اطلاعات شخصی واقعی در این داده‌ها وجود ندارد.
