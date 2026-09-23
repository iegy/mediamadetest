// أسماء الأدوار زي ما هي متعرّفة في مستند المتطلبات (بند 2)
export const ROLE_LABELS = {
  management: "الإدارة",
  client_management: "إدارة العملاء",
  sales: "المبيعات",
  production: "الإنتاج",
  editor: "المونتاج",
};

// عناصر القائمة الجانبية لكل دور.
// built: false = الصفحة لسه مبنيتش، هتظهر باهتة وعليها "قريبًا" لحد ما نوصلها في الترتيب.
export const NAV_ITEMS = {
  management: [
    { key: "dashboard", label: "الرئيسية", href: "dashboard.html", built: true },
    { key: "clients", label: "العملاء", href: "clients.html", built: true },
    { key: "followup", label: "المتابعات", href: "followup.html", built: true },
    { key: "projects", label: "المشاريع", href: "projects.html", built: false },
    { key: "quotations", label: "عروض الأسعار", href: "quotations.html", built: true },
    { key: "calendar", label: "الكاليندر", href: "calendar.html", built: false },
    { key: "payments", label: "المدفوعات", href: "payments.html", built: false },
    { key: "expenses", label: "المصروفات", href: "expenses.html", built: false },
    { key: "files", label: "الملفات", href: "files.html", built: false },
    { key: "users", label: "المستخدمون والصلاحيات", href: "users.html", built: false },
    { key: "activity", label: "سجل النشاط", href: "activity.html", built: false },
  ],
  client_management: [
    { key: "dashboard", label: "الرئيسية", href: "dashboard.html", built: true },
    { key: "clients", label: "العملاء", href: "clients.html", built: true },
    { key: "followup", label: "المتابعات", href: "followup.html", built: true },
    { key: "quotations", label: "عروض الأسعار", href: "quotations.html", built: true },
    { key: "projects", label: "المشاريع", href: "projects.html", built: false },
  ],
  sales: [
    { key: "dashboard", label: "الرئيسية", href: "dashboard.html", built: true },
    { key: "leads", label: "العملاء المسؤول عنهم", href: "clients.html", built: true },
    { key: "followup", label: "المتابعات", href: "followup.html", built: true },
  ],
  production: [
    { key: "dashboard", label: "الرئيسية", href: "dashboard.html", built: true },
    { key: "myprojects", label: "مشاريعي", href: "my-projects.html", built: false },
    { key: "calendar", label: "الكاليندر", href: "calendar.html", built: false },
  ],
  editor: [
    { key: "dashboard", label: "الرئيسية", href: "dashboard.html", built: true },
    { key: "myprojects", label: "مشاريعي", href: "my-projects.html", built: false },
  ],
};

// حالات العميل زي ما هي في مستند المتطلبات (بند 3)، مقسّمة لمجموعات لونية للعرض
export const CLIENT_STATUSES = [
  { key: "new", label: "جديد", group: "neutral" },
  { key: "contacted", label: "تم التواصل", group: "active" },
  { key: "meeting", label: "اجتماع", group: "active" },
  { key: "quotation_sent", label: "تم إرسال العرض", group: "active" },
  { key: "negotiation", label: "تفاوض", group: "active" },
  { key: "approved", label: "تمت الموافقة", group: "active" },
  { key: "paid", label: "تم الدفع", group: "success" },
  { key: "booked", label: "تم الحجز", group: "success" },
  { key: "in_progress", label: "جاري التنفيذ", group: "success" },
  { key: "delivered", label: "تم التسليم", group: "success" },
  { key: "closed", label: "مغلق", group: "neutral" },
  { key: "lost", label: "خسارة", group: "lost" },
];

export function statusLabel(key) {
  const found = CLIENT_STATUSES.find((s) => s.key === key);
  return found ? found.label : key;
}

export function statusGroup(key) {
  const found = CLIENT_STATUSES.find((s) => s.key === key);
  return found ? found.group : "neutral";
}
