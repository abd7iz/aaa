# تفعيل مساعد MUKHTABAR الذكي

الواجهة جاهزة، لكن يلزم نشر Worker وإضافة مفتاح Gemini مرة واحدة. مفتاح API لا يوضع في GitHub ولا في ملف HTML.

## 1) احصل على مفتاح Gemini
1. افتح https://aistudio.google.com/apikey
2. سجّل الدخول وأنشئ API key.
3. احتفظ به لنفسك ولا ترسله في المحادثة أو تضعه في ملفات المستودع.

النموذج المستخدم هو `gemini-3.8-flash` عبر Interactions API، مع `store: false` حتى يحتفظ المختبر بسجل الحوار في الجلسة بدلاً من تخزينه كحوار مستمر لدى واجهة Gemini.

## 2) أنشئ Worker في Cloudflare
1. افتح https://dash.cloudflare.com/ ثم **Workers & Pages**.
2. أنشئ Worker جديداً باسم مثل `mukhtabar-ai`.
3. افتح **Edit code** واستبدل المثال بمحتويات الملف:
   https://github.com/abd7iz/aaa/blob/main/ai-worker/worker.js
4. من إعدادات Worker افتح **Settings → Variables and Secrets**.
5. أضف متغيراً نصياً:
   - Name: `ALLOWED_ORIGINS`
   - Value: `https://abd7iz.github.io`
6. أضف Secret (وليس Text variable):
   - Name: `GEMINI_API_KEY`
   - Value: مفتاح Gemini الذي أنشأته.
7. اضغط **Deploy**.

## 3) اربط الموقع بالـ Worker
بعد النشر سيظهر رابط ينتهي عادةً بـ `.workers.dev`.
افتح الرابط وأضف `/health` في نهايته. يجب أن يرجع JSON يحتوي `"configured":true`.

ثم افتح الملف:
https://github.com/abd7iz/aaa/blob/main/ai-config.js

وغيّر السطر:
`window.MUKHTABAR_AI_ENDPOINT = "";`

إلى رابط Worker الكامل مع المسار `/chat`، مثال بالشكل فقط:
`window.MUKHTABAR_AI_ENDPOINT = "https://اسم-العامل.اسمك.workers.dev/chat";`

احفظ التعديل. بعد تحديث صفحة المختبر سيعمل زر «مساعد المختبر».

## حماية وملاحظات
- لا ترسل مفتاح Gemini لأي شخص ولا تضعه في `ai-config.js` أو GitHub.
- لا تفعّل خدمة الدفع في Google AI Studio ما لم تكن تريد ذلك وتفهم تكلفته. توفر النموذج وحدود الاستخدام المجاني قد تتغير.
- توجد حدود حجم للمحادثة وحد أولي للطلبات في Worker؛ حد الطلبات داخل الذاكرة إجراء تخفيفي وليس حماية كاملة ضد الإساءة.
- المحادثة لا تُحفظ محلياً بعد إغلاق صفحة المختبر. يتم إرسال نص السؤال وسياق التجربة إلى Google لمعالجته.
