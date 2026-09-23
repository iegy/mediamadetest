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
    { key: "clients", label: "العملاء", href: "clients.html", built: false },
    { key: "projects", label: "المشاريع", href: "projects.html", built: false },
    { key: "quotations", label: "عروض الأسعار", href: "quotations.html", built: false },
    { key: "calendar", label: "الكاليندر", href: "calendar.html", built: false },
    { key: "payments", label: "المدفوعات", href: "payments.html", built: false },
    { key: "expenses", label: "المصروفات", href: "expenses.html", built: false },
    { key: "files", label: "الملفات", href: "files.html", built: false },
    { key: "users", label: "المستخدمون والصلاحيات", href: "users.html", built: false },
    { key: "activity", label: "سجل النشاط", href: "activity.html", built: false },
  ],
  client_management: [
    { key: "dashboard", label: "الرئيسية", href: "dashboard.html", built: true },
    { key: "clients", label: "العملاء", href: "clients.html", built: false },
    { key: "followup", label: "المتابعات", href: "followup.html", built: false },
    { key: "quotations", label: "عروض الأسعار", href: "quotations.html", built: false },
    { key: "projects", label: "المشاريع", href: "projects.html", built: false },
  ],
  sales: [
    { key: "dashboard", label: "الرئيسية", href: "dashboard.html", built: true },
    { key: "leads", label: "العملاء المسؤول عنهم", href: "clients.html", built: false },
    { key: "followup", label: "المتابعات", href: "followup.html", built: false },
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
