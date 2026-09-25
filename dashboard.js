import { db } from "./auth.js";
import { initAppShell } from "./app-shell.js";
import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

initAppShell((profile) => {
  watchClientsCount();
  // المشاريع والمتابعات مقيدة بقواعد الأمان لبعض الأدوار (الإنتاج/المونتاج)،
  // فبنحاول نجيبها ونتجاهل بهدوء لو الدور مالوش صلاحية عليها
  watchProjectsCount();
  watchFollowUpsCount(profile.role);
  watchOutstandingPayments(profile.role);
});

function watchClientsCount() {
  const statEl = document.getElementById("stat-clients");
  if (!statEl) return;
  onSnapshot(
    collection(db, "clients"),
    (snap) => {
      // "العملاء الحاليين" = كل العملاء ما عدا اللي حالتهم "خسارة"
      const current = snap.docs.filter((d) => d.data().status !== "lost").length;
      statEl.textContent = current;
    },
    () => { statEl.textContent = "—"; }
  );
}

function watchProjectsCount() {
  const statEl = document.getElementById("stat-projects");
  if (!statEl) return;
  onSnapshot(
    collection(db, "projects"),
    (snap) => {
      const active = snap.docs.filter((d) => d.data().status !== "completed").length;
      statEl.textContent = active;
    },
    () => { statEl.textContent = "—"; }
  );
}

function watchFollowUpsCount(role) {
  const statEl = document.getElementById("stat-followups");
  if (!statEl) return;
  // بند المتابعات مبني على بيانات العملاء، فمتاح بس للأدوار اللي ليها صلاحية عليها
  if (!["management", "client_management", "sales"].includes(role)) {
    statEl.textContent = "—";
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  onSnapshot(
    collection(db, "clients"),
    (snap) => {
      const due = snap.docs.filter((d) => {
        const c = d.data();
        return c.nextFollowUpDate && c.nextFollowUpDate <= today && c.status !== "closed" && c.status !== "lost";
      }).length;
      statEl.textContent = due;
    },
    () => { statEl.textContent = "—"; }
  );
}

function watchOutstandingPayments(role) {
  const statEl = document.getElementById("stat-payments");
  if (!statEl) return;
  // المدفوعات مقصورة على الإدارة بس (زي صلاحياتها بالظبط)
  if (role !== "management") {
    statEl.textContent = "—";
    return;
  }
  let projects = [];
  let payments = [];
  const recompute = () => {
    const paidFor = (id) => payments.filter((p) => p.projectId === id).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const outstanding = projects.reduce((s, p) => {
      const remaining = (Number(p.projectValue) || 0) - paidFor(p.id);
      return s + (remaining > 0 ? remaining : 0);
    }, 0);
    statEl.textContent = outstanding.toLocaleString("en-US");
  };
  onSnapshot(collection(db, "projects"), (snap) => {
    projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    recompute();
  }, () => { statEl.textContent = "—"; });
  onSnapshot(collection(db, "payments"), (snap) => {
    payments = snap.docs.map((d) => d.data());
    recompute();
  }, () => { statEl.textContent = "—"; });
}
