# Media Made — نظام الإدارة الداخلي

## المرحلة الحالية
كل حاجة سابقة + **سجل النشاط (بند 16)**: أي إضافة/تعديل/حذف مهم (عميل، عرض سعر، مشروع، صفحة مشروع، رفع ملف، دفعة، مصروف، مستخدم) بيتسجّل تلقائي باسم اللي عمله ودوره والوقت، وصفحة "سجل النشاط" (إدارة بس) بتعرضهم كلهم مرتبين من الأحدث، مع بحث.

باقي: البحث الموحّد عبر النظام (بند 15)، وباقي أرقام الداشبورد (بند 13 — Leads، مشاريع مكتملة، مشاريع متأخرة، إجمالي قيمة المشاريع).

---

## 1. إعداد Firebase

1. افتح https://console.firebase.google.com وادخل على مشروعك.
2. من **Build → Authentication → Sign-in method**: فعّل **Email/Password**.
3. من **Build → Firestore Database**: أنشئ قاعدة بيانات (Production mode).
4. من **Project settings → عام → أسفل الصفحة**: هتلاقي "SDK setup and configuration" — انسخ القيم دي.
5. افتح `js/firebase-config.js` واستبدل القيم الموجودة بالقيم الحقيقية بتاعتك.

## 2. رفع قواعد الأمان

لو عندك Firebase CLI مركّب على جهازك:

```
firebase deploy --only firestore:rules
```

أو انسخ محتوى `firestore.rules` والصقه يدويًا في **Firestore → Rules** من الكونسول.

## 3. إنشاء أول مستخدم (أدمن)

1. من **Authentication → Users → Add user**: حط إيميل وباسورد.
2. من **Firestore → Data**: أنشئ collection اسمها `users`، وجواها **document** بنفس الـ **UID** بتاع اليوزر اللي عملته (تلاقيه جنب الإيميل في صفحة Users)، وحط فيه:

```json
{
  "name": "اسمك",
  "role": "management"
}
```

3. افتح `index.html` وجرب تسجل دخول بنفس الإيميل والباسورد.

### الأدوار المتاحة (القيمة اللي تتحط في حقل role بالظبط)

- `management`
- `client_management`
- `sales`
- `production`
- `editor`

## 4. الرفع (Hosting)

اختار واحدة من الاتنين:

- **GitHub Pages** (زي باقي مشاريعك): ارفع الفولدر ده لريبو وفعّل Pages من إعدادات الريبو.
- **Firebase Hosting**: `firebase init hosting` ثم `firebase deploy`.

> ⚠️ الصفحات بتستخدم ES Modules (`type="module"`)، فلازم تتفتح من خلال سيرفر حقيقي (GitHub Pages / Firebase Hosting / أي لوكال سيرفر)، مش من خلال فتح الملف مباشرة من جهازك، لأن المتصفح بيمنع الـ imports من `file://`.

---

## 5. إعداد Google Drive (مطلوب قبل ما رفع الملفات يشتغل)

1. روح https://console.cloud.google.com واختار نفس مشروع Firebase بتاعك (`media-made-b51c0`) من القائمة فوق.
2. من **APIs & Services → Library**: دوّر على **Google Drive API** وفعّلها.
3. من **APIs & Services → OAuth consent screen** (أو **Google Auth Platform**): اختار **External**، واملأ اسم التطبيق وإيميلك. من صفحة **Audience** ضيف إيميلات كل الموظفين تحت **Test users**.
4. من **APIs & Services → Credentials → Create Credentials → OAuth client ID**: اختار **Web application**، وضيف تحت **Authorized JavaScript origins** رابط موقعك (مثلاً `https://iegy.net`)، واحفظ. هياخدك Client ID شكله `xxxxx.apps.googleusercontent.com`.
5. افتح `js/drive-config.js` وحط الـ Client ID ده مكان الـ placeholder (⚠️ متحطش الـ `client_secret` في أي ملف هيترفع على GitHub — مش محتاجينه أصلاً).
6. سجّل دخول كإدارة، افتح صفحة **عروض الأسعار → بيانات الشركة**، واملأ حقل "إيميل درايف الشركة" — ولو عايز الفريق كله (مش حساب واحد بس) يقدر يشوف الملفات، اعمل **Google Group** مجاني وحط إيميله هنا بدل إيميل شخصي.
7. جرب من صفحة أي مشروع: دوس "ارفع ملف"، وافق على صلاحية جوجل درايف لما تظهر، واختار ملف.

---

## الخطوة الجاية

1. انشر تعديل `firestore.rules` الجديد (قاعدة أمان سجل النشاط).
2. ارفع كل الملفات الجديدة والمعدّلة على GitHub: `activity.html`, `js/activity.js`, `js/activity-log.js`, و`app-shell.js`, `clients.js`, `quotations.js`, `projects.js`, `project-detail.js`, `payments.js`, `expenses.js`, `users.js`, `permissions.js`, `i18n.js` المعدّلين.
3. جرّب: ضيف عميل أو عرض سعر، وروح صفحة "سجل النشاط" شوف الحدث ظاهر باسمك ودورك والوقت.
4. بعد كده نكمل على: البحث الموحّد، وباقي أرقام الداشبورد.
