# Media Made — نظام الإدارة الداخلي

## المرحلة الحالية
تسجيل الدخول + الصلاحيات حسب الدور + الشكل العام (Sidebar/Topbar) + موديول **العملاء (Clients)** + موديول **المتابعة (Follow-up)** الكامل (مبني فوق نفس بيانات العميل، مع تنبيه عدد بالمتابعات المتأخرة في القائمة الجانبية) + قاعدة أمان Firestore محدّثة.

باقي الموديولات (عروض الأسعار، المشاريع، الكاليندر، المدفوعات، المصروفات، الملفات + Google Drive، الداشبورد الكامل، الباك أب/الاستيراد والتصدير) هتتضاف مرحلة ورا التانية، بنفس ترتيب الـ MVP في مستند المتطلبات.

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

## الخطوة الجاية

1. ارفع الملفات الجديدة والمعدّلة على GitHub وجرّب موديول المتابعة (`followup.html`).
2. بعد كده نكمل على موديول **عروض الأسعار (Quotations)** — تالت حاجة في ترتيب الـ MVP بتاعك.
