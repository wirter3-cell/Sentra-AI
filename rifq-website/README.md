# موقع رِفق للتسجيل — دليل التشغيل

هذا المجلد مستقل عن موقع نورن الموجود في نفس المستودع.

## ما في هذا المجلد

| الملف | ما هو |
|---|---|
| `site/index.html` | الصفحة الرئيسية: يختار الزائر **الحج والعمرة** أو **السياحة والرحلات** |
| `site/hajj.html` | تجربة الـ 3D للحج والعمرة (الحرم والمشاعر) — **بدون تسعيرة** |
| `site/alula.html` | تجربة الـ 3D للسياحة والرحلات في **العُلا** — بدون تسعيرة |
| `site/register.html` | نموذج تسجيل المنشأة ببياناتها كاملة، ويحفظ في Firebase حق رِفق |
| `source/` | الكود المصدري (للمطوّر فقط، لا تحتاجه للنشر). لا يحتوي على التسعيرة ولا على المقترح |

كل صفحة ملف واحد مستقل: الخطوط والصور والـ 3D كلها داخله، ولا يحتاج أي ملف آخر.

---

## الخطوة 1 — أضف قاعدة الأمان في Firebase (مرة واحدة، قبل النشر)

بدون هذه الخطوة يرفض Firebase التسجيلات، ويظهر للزائر: «تعذّر حفظ التسجيل حاليًا».

1. افتح **console.firebase.google.com** وادخل مشروع **rift-8fcd8**.
2. من القائمة الجانبية اختر **Firestore Database**، ثم تبويب **Rules** (القواعد).
3. ابحث عن السطر:
   `match /databases/{database}/documents {`
4. الصق الكتلة التالية **داخل** هذا السطر: بعده مباشرة، وقبل القوس `}` الأخير الذي يغلقه.
   **لا تحذف أي قاعدة موجودة.**
5. اضغط **Publish** (نشر).

```
    // رِفق — طلبات تسجيل المنشآت من الموقع: إنشاء فقط
    match /registrations/{id} {
      function rfqStr(v, min, max) {
        return v is string && v.size() >= min && v.size() <= max;
      }
      function rfqValid(d) {
        return d.keys().hasOnly(['sector', 'entity', 'contact', 'ops', 'platforms', 'notes', 'consent', 'status', 'source', 'createdAt'])
          && d.keys().hasAll(['sector', 'entity', 'contact', 'ops', 'platforms', 'notes', 'consent', 'status', 'source', 'createdAt'])
          && d.sector in ['hajj', 'tourism']
          && d.status == 'new' && d.source == 'website' && d.consent == true
          && d.createdAt is int
          && d.entity is map
          && d.entity.keys().hasOnly(['name', 'type', 'unifiedNumber', 'license', 'city', 'address'])
          && rfqStr(d.entity.name, 2, 150) && rfqStr(d.entity.type, 1, 40)
          && rfqStr(d.entity.unifiedNumber, 10, 10) && d.entity.unifiedNumber.matches('^[0-9]{10}$')
          && rfqStr(d.entity.license, 0, 60) && rfqStr(d.entity.city, 1, 60) && rfqStr(d.entity.address, 0, 200)
          && d.contact is map
          && d.contact.keys().hasOnly(['name', 'title', 'phone', 'email'])
          && rfqStr(d.contact.name, 3, 100) && rfqStr(d.contact.title, 2, 80)
          && rfqStr(d.contact.phone, 10, 10) && d.contact.phone.matches('^05[0-9]{8}$')
          && rfqStr(d.contact.email, 5, 120) && d.contact.email.matches('^[^@\\s]+@[^@\\s]+[.][^@\\s]+$')
          && d.ops is map && d.ops.size() <= 6
          && d.platforms is list && d.platforms.size() <= 3
          && rfqStr(d.notes, 0, 1000);
      }
      allow create: if rfqValid(request.resource.data);
      allow read, update, delete: if false;
    }
```

**ماذا تعني هذه القاعدة؟** (اختبرتها على نسخة محلية من Firestore: 18 اختبارًا ناجحًا)
- أي زائر يستطيع **إرسال** تسجيل جديد، بشرط أن تكون بياناته صحيحة: رقم موحّد من 10 أرقام، وجوال يبدأ بـ 05، وبريد صحيح، والموافقة مؤشَّر عليها.
- **لا أحد** يستطيع قراءة التسجيلات أو تعديلها أو حذفها من المتصفح. أنت وحدك تراها من Firebase Console.

---

## الخطوة 2 — انشر الموقع

**الطريقة الأسهل (Netlify Drop):**

1. افتح **app.netlify.com/drop**.
2. اسحب مجلد **`site`** كاملًا وأفلته في الصفحة.
3. خلال ثوانٍ يعطيك رابطًا للموقع. سجّل دخولك في Netlify حتى يبقى الرابط دائمًا، ومن هناك تقدر تربط نطاقك الخاص.

> **تنبيه — Firebase Hosting:** إذا كان تطبيق رِفق الحالي منشورًا على Firebase Hosting في نفس المشروع، فلا تنشر هذا الموقع بأمر `firebase deploy` العادي؛ لأنه يستبدل التطبيق. استخدم Netlify، أو اطلب إضافة «موقع ثانٍ» (site) في Firebase Hosting.

**إذا رفض Firebase التسجيل بعد النشر:** قد يكون مفتاح الويب مقيّدًا بمواقع محددة. افتح **console.cloud.google.com**، ثم **APIs & Services**، ثم **Credentials**. افتح مفتاح المتصفح، وأضف رابط موقعك الجديد في **Website restrictions**.

---

## الخطوة 3 — جرّب ثم تابع التسجيلات

1. **تجربة بدون حفظ:** أضف `?dry` لرابط صفحة التسجيل، مثل `register.html?dry`. يعمل النموذج كاملًا ويظهر رقم مرجع تجريبي، ولا يُحفظ شيء.
2. **تجربة حقيقية واحدة:** أرسل تسجيلًا من الرابط العادي، ثم تأكد أنه وصل (الخطوة التالية)، ثم احذفه.
3. **أين أرى التسجيلات؟** Firebase Console ← **Firestore Database** ← **Data** ← مجموعة **`registrations`**. كل مستند = منشأة واحدة.
4. **لتعليم تسجيل بأنك تواصلت معه:** افتح المستند، وغيّر الحقل `status` من `new` إلى `contacted` يدويًا.

---

## البيانات التي يجمعها النموذج

- **المنشأة:** الاسم، نوع الكيان، الرقم الوطني الموحّد أو السجل التجاري (10 أرقام)، رقم الترخيص (وزارة الحج والعمرة أو وزارة السياحة)، المدينة، العنوان الوطني.
- **المسؤول:** الاسم الكامل، المنصب، الجوال، البريد.
- **الحج والعمرة:** الخدمات، العدد المتوقع للحجاج والمعتمرين، عدد المجموعات، عدد المشرفين والمفوجين والمرشدين، الموسم المستهدف.
- **السياحة والرحلات:** نوع النشاط، الوجهات، العدد الشهري المتوقع للسياح، عدد الرحلات الشهرية، عدد المرشدين، موعد البدء المتوقع.
- **المنصات المطلوبة**، والملاحظات، والموافقة.

كل الحقول تُحفظ بنفس الشكل الذي تفحصه القاعدة. وقت الإرسال يُحفظ في `createdAt` بالملّي ثانية (رقم، وليس Timestamp)، مثل باقي أوقات رِفق.

---

## نص جاهز لملف SPEC.md (قسم جديد)

```
## طلبات تسجيل المنشآت — registrations
- المصدر: موقع رِفق (register.html)، بدون تسجيل دخول.
- الصلاحيات: إنشاء فقط من المتصفح. لا قراءة ولا تعديل ولا حذف إلا من Firebase Console.
- الحقول:
  - sector: 'hajj' | 'tourism'
  - entity: { name, type, unifiedNumber (10 أرقام), license, city, address }
  - contact: { name, title, phone (05xxxxxxxx), email (أحرف صغيرة) }
  - ops للحج: { services[], expected, groups, staff, season }
  - ops للسياحة: { activities[], destinations[], expected, trips, guides, startMonth ('YYYY-MM' أو null) }
  - platforms: ['app', 'field', 'ops'] (المختار منها)
  - notes: حتى 1000 حرف
  - consent: true · status: 'new' (يغيّره فريق رِفق يدويًا) · source: 'website'
  - createdAt: وقت الإرسال بالملّي ثانية (رقم)
```

---

## ملاحظات

- صور العُلا على الجوالات **مرسومة خصيصًا** للسياحة. لا تظهر في صفحة العُلا أي صورة من تطبيق الحج.
- خريطة العُلا مبنية على مواقع حقيقية من OpenStreetMap: البلدة القديمة، دادان، عِكمة، جبل الفيل، الحِجر، مرايا. الطرق في الخريطة توضيحية.
- لتعديل الكود لاحقًا (للمطوّر): داخل `source/` شغّل `npm install` ثم `node build.mjs`، وتخرج الصفحات في `dist/site/`.
