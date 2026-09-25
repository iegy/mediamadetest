import { t } from "./i18n.js";

// عناصر القائمة الجانبية لكل دور. labelKey بيتترجم وقت العرض عن طريق i18n.js.
// built: false = الصفحة لسه مبنيتش، هتظهر باهتة وعليها badge "قريبًا/Soon" لحد ما نوصلها في الترتيب.
export const NAV_ITEMS = {
  management: [
    { key: "dashboard", labelKey: "nav_dashboard", href: "dashboard.html", built: true },
    { key: "clients", labelKey: "nav_clients", href: "clients.html", built: true },
    { key: "followup", labelKey: "nav_followup", href: "followup.html", built: true },
    { key: "quotations", labelKey: "nav_quotations", href: "quotations.html", built: true },
    { key: "projects", labelKey: "nav_projects", href: "projects.html", built: true },
    { key: "calendar", labelKey: "nav_calendar", href: "calendar.html", built: true },
    { key: "payments", labelKey: "nav_payments", href: "payments.html", built: true },
    { key: "expenses", labelKey: "nav_expenses", href: "expenses.html", built: false },
    { key: "files", labelKey: "nav_files", href: "files.html", built: false },
    { key: "users", labelKey: "nav_users", href: "users.html", built: false },
    { key: "activity", labelKey: "nav_activity", href: "activity.html", built: false },
  ],
  client_management: [
    { key: "dashboard", labelKey: "nav_dashboard", href: "dashboard.html", built: true },
    { key: "clients", labelKey: "nav_clients", href: "clients.html", built: true },
    { key: "followup", labelKey: "nav_followup", href: "followup.html", built: true },
    { key: "quotations", labelKey: "nav_quotations", href: "quotations.html", built: true },
    { key: "projects", labelKey: "nav_projects", href: "projects.html", built: true },
    { key: "calendar", labelKey: "nav_calendar", href: "calendar.html", built: true },
  ],
  sales: [
    { key: "dashboard", labelKey: "nav_dashboard", href: "dashboard.html", built: true },
    { key: "leads", labelKey: "nav_leads", href: "clients.html", built: true },
    { key: "followup", labelKey: "nav_followup", href: "followup.html", built: true },
  ],
  production: [
    { key: "dashboard", labelKey: "nav_dashboard", href: "dashboard.html", built: true },
    { key: "myprojects", labelKey: "nav_myprojects", href: "my-projects.html", built: true },
    { key: "calendar", labelKey: "nav_calendar", href: "calendar.html", built: true },
  ],
  editor: [
    { key: "dashboard", labelKey: "nav_dashboard", href: "dashboard.html", built: true },
    { key: "myprojects", labelKey: "nav_myprojects", href: "my-projects.html", built: true },
  ],
};

export function roleLabel(role) {
  return t(`role_${role}`) || role;
}

// حالات العميل — المفاتيح بس هنا، النص بيتحدد وقت العرض عن طريق i18n.js
export const CLIENT_STATUS_KEYS = [
  { key: "new", group: "neutral" },
  { key: "contacted", group: "active" },
  { key: "meeting", group: "active" },
  { key: "quotation_sent", group: "active" },
  { key: "negotiation", group: "active" },
  { key: "approved", group: "active" },
  { key: "paid", group: "success" },
  { key: "booked", group: "success" },
  { key: "in_progress", group: "success" },
  { key: "delivered", group: "success" },
  { key: "closed", group: "neutral" },
  { key: "lost", group: "lost" },
];

export function statusLabel(key) {
  return t(`status_${key}`) || key;
}

export function statusGroup(key) {
  const found = CLIENT_STATUS_KEYS.find((s) => s.key === key);
  return found ? found.group : "neutral";
}

// حالات المشروع (بند 7 في المستند)
export const PROJECT_STATUS_KEYS = [
  { key: "brief", group: "neutral" },
  { key: "preparation", group: "active" },
  { key: "shooting", group: "active" },
  { key: "editing", group: "active" },
  { key: "review", group: "active" },
  { key: "client_approval", group: "active" },
  { key: "delivery", group: "success" },
  { key: "completed", group: "success" },
];

export function projectStatusLabel(key) {
  return t(`pstatus_${key}`) || key;
}

export function projectStatusGroup(key) {
  const found = PROJECT_STATUS_KEYS.find((s) => s.key === key);
  return found ? found.group : "neutral";
}

// حالات المونتاج (بند 10 في المستند)
export const EDITING_STATUS_KEYS = [
  { key: "pending", group: "neutral" },
  { key: "editing", group: "active" },
  { key: "review", group: "active" },
  { key: "revision", group: "active" },
  { key: "approved", group: "success" },
  { key: "delivered", group: "success" },
];

export function editingStatusLabel(key) {
  return t(`estatus_${key}`) || key;
}

export function editingStatusGroup(key) {
  const found = EDITING_STATUS_KEYS.find((s) => s.key === key);
  return found ? found.group : "neutral";
}
